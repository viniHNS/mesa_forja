import * as THREE from 'three';
import { tubeGeometry, pieceCenter, pieceEnds } from './tube.js';
import { FINISHES, wallOf } from '../model/catalog.js';
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

export class TableRig {
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
    this.onWeld = null;

    this.mats = {
      metal: new THREE.MeshStandardMaterial(),
      hot: new THREE.MeshStandardMaterial(),
      foot: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.85 }),
      top: {
        madeira: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }),
        branco: new THREE.MeshStandardMaterial({ color: '#f1eee7', roughness: 0.6 }),
        preto: new THREE.MeshStandardMaterial({ color: '#1f1f22', roughness: 0.5 }),
        vidro: new THREE.MeshPhysicalMaterial({
          color: '#d8efe9', transmission: 1, thickness: 0.02, roughness: 0.04, ior: 1.5,
          transparent: true, opacity: 0.95, side: THREE.DoubleSide,
        }),
      },
    };
    this.setFinish('preto');
  }

  setFinish(id) {
    const f = FINISHES.find((x) => x.id === id) ?? FINISHES[0];
    for (const m of [this.mats.metal, this.mats.hot]) {
      m.color.set(f.color);
      m.metalness = f.metalness;
      m.roughness = f.roughness;
    }
    this.mats.hot.emissive.set('#ff6a00');
    this.mats.hot.emissiveIntensity = 0.55;
  }

  clear() {
    for (const m of [...this.meshes, ...this.extras]) {
      this.root.remove(m);
      m.geometry.dispose();
    }
    this.meshes = [];
    this.extras = [];
  }

  update(model, state, { animate = true } = {}) {
    this.cancelAssembly();
    this.clear();
    this.setFinish(state.finish);
    const wall = wallOf(state.chapa);
    const { fL, fW } = model.dims;
    const outward = (c) => new THREE.Vector3(c.x / (fL / 2), 0, c.z / (fW / 2));
    const newKeys = new Set();

    for (const p of model.pieces) {
      const mesh = new THREE.Mesh(tubeGeometry(p, wall), this.mats.metal);
      const base = pieceCenter(p);
      const dir = outward(base);
      if (p.group === 'quadro') dir.y = 0.7;
      else if (p.group === 'reforco') dir.y = 1.1;
      else if (p.group === 'perna') dir.multiplyScalar(1.1).setY(-0.15);
      else dir.multiplyScalar(0.8).setY(0.1);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { piece: p, base, dir, assembly: 1, kind: p.group };
      mesh.position.copy(base);
      this.root.add(mesh);
      this.meshes.push(mesh);
      newKeys.add(p.key);
      if (animate && this.keys.size && !this.keys.has(p.key)) this.grow(mesh);
    }

    for (const f of model.feet) {
      const geo = new THREE.BoxGeometry(f.sx + 1.5, 7, f.sz + 1.5);
      const mesh = new THREE.Mesh(geo, this.mats.foot);
      const base = new THREE.Vector3(f.x, 3.5, f.z);
      const dir = outward(base).multiplyScalar(1.1).setY(-0.5);
      mesh.userData = { base, dir, assembly: 1, kind: 'sapata' };
      mesh.castShadow = true;
      this.root.add(mesh);
      this.extras.push(mesh);
    }

    const [L, T, W] = model.top.size;
    if (state.showTop && T > 0) {
      const mat = this.mats.top[state.topMaterial] ?? this.mats.top.madeira;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), mat);
      const base = new THREE.Vector3(...model.top.center);
      mesh.userData = { base, dir: new THREE.Vector3(0, 1.5, 0), assembly: 1, kind: 'tampo' };
      mesh.castShadow = state.topMaterial !== 'vidro';
      mesh.receiveShadow = true;
      mesh.renderOrder = 2;
      this.root.add(mesh);
      this.extras.push(mesh);
      if (animate && this.keys.size && !this.keys.has('tampo')) this.grow(mesh);
      newKeys.add('tampo');
    }

    this.keys = newKeys;
    this.applyOffsets();
    this.applyHighlight();
  }

  grow(mesh) {
    mesh.scale.setScalar(0.001);
    tween({ duration: 520, easing: ease.outBack, onUpdate: (v) => mesh.scale.setScalar(Math.max(0.001, v)) });
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

  // Monta a mesa peça por peça, soltando faíscas nas soldas.
  playAssembly() {
    this.cancelAssembly();
    const order = { perna: 0, sapata: 1, travessa: 2, quadro: 3, reforco: 4, tampo: 5 };
    const all = [...this.meshes, ...this.extras].sort((a, b) => order[a.userData.kind] - order[b.userData.kind]);
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
        duration: kind === 'tampo' ? 800 : 480,
        easing: ease.outCubic,
        onStart: () => (m.visible = true),
        onUpdate: (v) => {
          m.userData.assembly = v;
          m.position.copy(this.offsetOf(m));
        },
        onComplete: () => {
          const p = m.userData.piece;
          if (!p || !this.onWeld) return;
          const ends = pieceEnds(p);
          p.ends.forEach((e, i) => {
            if (e.weld) this.onWeld(this.root.localToWorld(ends[i].clone()));
          });
        },
      });
      this.assemblyTweens.push(t);
      delay += kind === 'sapata' ? 60 : 170;
    });
  }
}
