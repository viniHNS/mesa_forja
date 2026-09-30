import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tubeGeometry, pieceCenter, pieceEnds } from './tube.js';
import { FINISHES, getCaster, wallOf } from '../model/catalog.js';
import { tween, ease } from '../anim/tween.js';

const EXPLODE_MM = 260;
const ASSEMBLY_MM = 900;

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#9b6a40');
  grad.addColorStop(0.5, '#8a5c35');
  grad.addColorStop(1, '#a0703f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 320; i++) {
    const y0 = rnd() * 512;
    const amp = 2 + rnd() * 7;
    const f = 0.002 + rnd() * 0.004;
    g.strokeStyle = `rgba(${50 + rnd() * 40 | 0},${28 + rnd() * 20 | 0},${14 + rnd() * 10 | 0},${0.05 + rnd() * 0.2})`;
    g.lineWidth = 0.4 + rnd() * 2.2;
    g.beginPath();
    for (let x = -10; x <= 1034; x += 12) {
      const y = y0 + Math.sin(x * f + i) * amp + Math.sin(x * f * 3.1 + i * 1.7) * amp * 0.3;
      if (x < 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Rodízio (mm, chão = 0): placa, pino de giro, garfo e roda rolando ao longo de X. Uma
// geometria só, com um grupo por parte: os materiais vão em CASTER_PARTS, na mesma ordem.
const CASTER_PARTS = ['caster', 'caster', 'caster', 'caster', 'caster', 'wheel', 'caster'];
function casterGeometry(c) {
  const r = c.d / 2;
  const yPlate = c.h - 2.5;
  const yFork = c.h - 14; // ponte do garfo, logo abaixo do pino de giro
  const side = yFork - r + 6;
  const forkZ = c.w / 2 + 4;
  const parts = [
    new THREE.BoxGeometry(c.plate, 5, c.plate).translate(0, yPlate, 0),
    new THREE.CylinderGeometry(c.plate * 0.32, c.plate * 0.36, 9, 20).translate(0, c.h - 9.5, 0),
    new THREE.BoxGeometry(r * 0.9, 4, 2 * forkZ + 4).translate(0, yFork, 0),
    new THREE.BoxGeometry(r * 0.75, side, 4).translate(0, r + side / 2 - 6, forkZ),
    new THREE.BoxGeometry(r * 0.75, side, 4).translate(0, r + side / 2 - 6, -forkZ),
    new THREE.CylinderGeometry(r, r, c.w, 28).rotateX(Math.PI / 2).translate(0, r, 0),
    new THREE.CylinderGeometry(r * 0.42, r * 0.42, c.w + 3, 20).rotateX(Math.PI / 2).translate(0, r, 0),
  ];
  const geo = mergeGeometries(parts, true);
  parts.forEach((g) => g.dispose());
  return geo;
}

// Explode padrão de um grupo que não define o seu
const EXPLODE_DEFAULT = { spread: 0.8, lift: 0.1 };

// Ordem da montagem quando o tipo de projeto não define `assembly`: grupos na ordem
// declarada, pés logo depois do primeiro grupo e placas no fim.
function assemblyOrder(project) {
  if (Array.isArray(project?.assembly) && project.assembly.length) return project.assembly;
  const groups = Object.keys(project?.groups ?? {});
  return [...groups.slice(0, 1), 'sapata', ...groups.slice(1), 'placa'];
}

// Malhas de um projeto em metalon (peças, pés e placas): explode, realce e montagem.
export class ProjectRig {
  constructor() {
    this.root = new THREE.Group();
    this.root.scale.setScalar(0.001); // modelo em mm, cena em metros
    this.meshes = [];
    this.extras = [];
    this.keys = new Set();
    this.explode = 0;
    this.hoverGid = null;
    this.selectedGid = null;
    this.assemblyTweens = [];
    this.growTweens = new Set();
    this.onWeld = null;

    this.mats = {
      metal: new THREE.MeshStandardMaterial(),
      hot: new THREE.MeshStandardMaterial(),
      foot: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.85 }),
      caster: new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.9, roughness: 0.35 }),
      wheel: new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.8 }),
      top: {
        madeira: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }),
        branco: new THREE.MeshStandardMaterial({ color: '#f1eee7', roughness: 0.6 }),
        preto: new THREE.MeshStandardMaterial({ color: '#1f1f22', roughness: 0.5 }),
        vidro: new THREE.MeshPhysicalMaterial({
          color: '#d8efe9', transmission: 1, thickness: 0.02, roughness: 0.04, ior: 1.5,
          transparent: true, opacity: 0.95, side: THREE.DoubleSide,
        }),
        chapa: new THREE.MeshStandardMaterial(), // cor e brilho do acabamento (setFinish)
      },
    };
    this.setFinish('preto');
  }

  setFinish(id) {
    const f = FINISHES.find((x) => x.id === id) ?? FINISHES[0];
    for (const m of [this.mats.metal, this.mats.hot, this.mats.top.chapa]) {
      m.color.set(f.color);
      m.metalness = f.metalness;
      m.roughness = f.roughness;
    }
    this.mats.hot.emissive.set('#ff6a00');
    this.mats.hot.emissiveIntensity = 0.55;
  }

  // Remove as malhas e descarta as geometrias (os materiais são compartilhados e ficam).
  clear() {
    // os tweens de crescimento apontam para malhas que vão sair da cena
    this.growTweens.forEach((t) => t.cancel());
    this.growTweens.clear();
    for (const m of [...this.meshes, ...this.extras]) {
      this.root.remove(m);
      m.geometry.dispose();
    }
    this.meshes = [];
    this.extras = [];
  }

  update(derived, state, { animate = true } = {}) {
    this.cancelAssembly();
    this.clear();
    this.setFinish(state.finish);
    const { model, project } = derived;
    this.order = assemblyOrder(project);
    const groups = project?.groups ?? {};
    const wall = wallOf(state.chapa);
    // pegada da estrutura: normaliza a direção "para fora" da vista explodida
    const size = model.bounds?.size ?? [1, 1, 1];
    const [bx, bz] = model.bounds?.base ?? [size[0], size[2]];
    const hx = bx / 2 || 1;
    const hz = bz / 2 || 1;
    const outward = (c) => new THREE.Vector3(c.x / hx, 0, c.z / hz);
    const newKeys = new Set();

    for (const p of model.pieces) {
      const mesh = new THREE.Mesh(tubeGeometry(p, wall), this.mats.metal);
      const base = pieceCenter(p);
      const ex = groups[p.group]?.explode ?? {};
      const dir = outward(base)
        .multiplyScalar(ex.spread ?? EXPLODE_DEFAULT.spread)
        .setY(ex.lift ?? EXPLODE_DEFAULT.lift);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { piece: p, base, dir, assembly: 1, kind: p.group };
      mesh.position.copy(base);
      this.root.add(mesh);
      this.meshes.push(mesh);
      newKeys.add(p.key);
      if (animate && this.keys.size && !this.keys.has(p.key)) this.grow(mesh);
    }

    for (const f of model.feet ?? []) {
      const caster = f.kind === 'rodizio';
      const mesh = caster
        ? new THREE.Mesh(casterGeometry(getCaster(f.caster)), CASTER_PARTS.map((k) => this.mats[k]))
        : new THREE.Mesh(new THREE.BoxGeometry(f.sx + 1.5, 7, f.sz + 1.5), this.mats.foot);
      const base = new THREE.Vector3(f.x, caster ? 0 : 3.5, f.z);
      const dir = outward(base).multiplyScalar(1.1).setY(-0.5);
      mesh.userData = { base, dir, assembly: 1, kind: 'sapata' };
      mesh.castShadow = true;
      this.root.add(mesh);
      this.extras.push(mesh);
    }

    // placas (tampo, prateleiras...); a chave leva prefixo para não colidir com a das peças
    const showPanels = state.showPanels !== false;
    for (const pl of showPanels ? model.panels ?? [] : []) {
      const [sx, sy, sz] = pl.size;
      if (!(sy > 0)) continue;
      const mat = this.mats.top[pl.material] ?? this.mats.top.madeira;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      const base = new THREE.Vector3(...pl.center);
      mesh.userData = { base, dir: new THREE.Vector3(0, 1.5, 0), assembly: 1, kind: 'placa', panel: pl };
      mesh.castShadow = pl.material !== 'vidro';
      mesh.receiveShadow = true;
      mesh.renderOrder = 2;
      this.root.add(mesh);
      this.extras.push(mesh);
      const key = `placa:${pl.key}`;
      if (animate && this.keys.size && !this.keys.has(key)) this.grow(mesh);
      newKeys.add(key);
    }

    this.keys = newKeys;
    this.applyOffsets();
    this.applyHighlight();
  }

  grow(mesh) {
    mesh.scale.setScalar(0.001);
    const t = tween({
      duration: 520,
      easing: ease.outBack,
      onUpdate: (v) => mesh.scale.setScalar(Math.max(0.001, v)),
      onComplete: () => this.growTweens.delete(t),
    });
    this.growTweens.add(t);
  }

  offsetOf(mesh) {
    const u = mesh.userData;
    const k = this.explode * EXPLODE_MM + (1 - u.assembly) * ASSEMBLY_MM;
    return u.base.clone().addScaledVector(u.dir, k);
  }

  applyOffsets() {
    for (const m of [...this.meshes, ...this.extras]) m.position.copy(this.offsetOf(m));
  }

  setExplode(v) {
    this.explode = v;
    this.applyOffsets();
  }

  setHover(gid) {
    if (gid === this.hoverGid) return;
    this.hoverGid = gid;
    this.applyHighlight();
  }

  setSelected(gid) {
    this.selectedGid = gid;
    this.applyHighlight();
  }

  applyHighlight() {
    for (const m of this.meshes) {
      const gid = m.userData.piece.gid;
      m.material = gid && (gid === this.hoverGid || gid === this.selectedGid) ? this.mats.hot : this.mats.metal;
    }
  }

  cancelAssembly() {
    this.assemblyTweens.forEach((t) => t.cancel());
    this.assemblyTweens = [];
    for (const m of [...this.meshes, ...this.extras]) {
      m.userData.assembly = 1;
      m.visible = true;
    }
  }

  // Monta o projeto peça por peça, soltando faíscas nas soldas.
  playAssembly() {
    this.cancelAssembly();
    // tipos fora da lista vão para o fim (o sort é estável: mantém a ordem do modelo)
    const list = this.order ?? assemblyOrder(null);
    const rank = (m) => {
      const i = list.indexOf(m.userData.kind);
      return i < 0 ? list.length : i;
    };
    const all = [...this.meshes, ...this.extras].sort((a, b) => rank(a) - rank(b));
    all.forEach((m) => {
      m.userData.assembly = 0;
      m.visible = false;
    });
    this.applyOffsets();
    let delay = 150;
    all.forEach((m) => {
      const kind = m.userData.kind;
      const t = tween({
        delay,
        duration: kind === 'placa' ? 800 : 480,
        easing: ease.outCubic,
        onStart: () => (m.visible = true),
        onUpdate: (v) => {
          m.userData.assembly = v;
          m.position.copy(this.offsetOf(m));
        },
        onComplete: () => {
          const p = m.userData.piece;
          if (!p || !this.onWeld) return;
          // as pontas vêm na posição-base; soma o deslocamento atual da peça (explode)
          const shift = m.position.clone().sub(m.userData.base);
          const ends = pieceEnds(p);
          p.ends.forEach((e, i) => {
            if (e.weld) this.onWeld(this.root.localToWorld(ends[i].add(shift)));
          });
        },
      });
      this.assemblyTweens.push(t);
      delay += kind === 'sapata' ? 60 : 170;
    });
  }

  dispose() {
    this.cancelAssembly();
    this.clear();
    const { top, ...rest } = this.mats;
    for (const m of [...Object.values(rest), ...Object.values(top)]) {
      m.map?.dispose();
      m.dispose();
    }
  }
}
