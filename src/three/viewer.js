import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { ProjectRig } from './rig.js';
import { Sparks } from './sparks.js';
import { Dimensions } from './dimensions.js';
import { tween, tickTweens, ease } from '../anim/tween.js';

const VIEWS = {
  perspectiva: new THREE.Vector3(1.15, 0.72, 1.35),
  frente: new THREE.Vector3(0, 0.08, 1),
  lateral: new THREE.Vector3(1, 0.08, 0),
  topo: new THREE.Vector3(0, 1, 0.0001),
};

export class Viewer extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.view = 'perspectiva';
    this.size = { L: 1200, W: 800, H: 750 };

    const renderer = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels-layer';
    container.appendChild(this.labels.domElement);

    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.02, 60);
    this.camera.position.set(2.4, 1.6, 2.8);

    const controls = (this.controls = new OrbitControls(this.camera, renderer.domElement));
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 0.35;
    controls.maxDistance = 14;
    controls.target.set(0, 0.4, 0);
    // o usuário pegou a câmera: para a animação de vista em andamento
    controls.addEventListener('start', () => this.stopCamera());

    // o gerador e a sala só servem para gerar o environment; descarta logo em seguida
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(room, 0.04);
    scene.environment = this.envTarget.texture;
    scene.environmentIntensity = 0.75;
    room.dispose?.();
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xfff1e0, 0x1b1d21, 0.5));
    const key = (this.key = new THREE.DirectionalLight(0xfff4e8, 2.4));
    key.position.set(2.2, 4.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 4;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x9cc4ff, 0.7);
    rim.position.set(-3, 2.2, -2.5);
    scene.add(rim);

    const floor = (this.floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.38 })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = (this.grid = new THREE.GridHelper(10, 50, 0x8a8f98, 0x5a5f68));
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.material.depthWrite = false;
    grid.position.y = 0.0005;
    scene.add(grid);

    this.rig = new ProjectRig();
    scene.add(this.rig.root);
    this.dims = new Dimensions();
    this.rig.root.add(this.dims.group);

    this.sparks = new Sparks();
    scene.add(this.sparks.points, this.sparks.light);
    this.rig.onWeld = (p) => this.sparks.emit(p);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindPointer();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.labels.setSize(w, h);
    this.applyInset();
  }

  // Quando a gaveta do relatório cobre a parte de baixo, o enquadramento passa a valer
  // só para a área visível acima dela (o resto do canvas continua renderizado por baixo).
  // Usa o inset corrente (this.inset), então o resize reaplica o valor atual mesmo no
  // meio de uma animação.
  applyInset() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    const inset = Math.min(this.inset ?? 0, h * 0.7);
    const visible = h - inset;
    this.camera.aspect = w / visible;
    if (inset > 0.5) this.camera.setViewOffset(w, visible, 0, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    const prev = this.viewSize;
    this.viewSize = { w, h: visible };
    if (prev && (prev.w !== w || prev.h !== visible)) this.keepFit(prev);
  }

  // A área visível mudou (gaveta, janela): afasta ou aproxima a câmera na mesma proporção
  // do encaixe, para o projeto e as cotas continuarem na tela sem perder o zoom do usuário.
  // Uma troca de vista em andamento já recalcula o destino a cada quadro.
  keepFit(prev) {
    if (this.camTween?.kind === 'view') return;
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const dist = offset.length();
    if (!dist) return;
    const ratio = this.fitDistance(offset, target, this.viewSize) / this.fitDistance(offset, target, prev);
    if (Number.isFinite(ratio) && ratio > 0) this.camera.position.copy(target).addScaledVector(offset, ratio);
  }

  // Pode ser chamado a cada resize da gaveta: o mesmo destino não faz nada; ajustes
  // pequenos (a gaveta acompanhando a janela) valem na hora; abrir/fechar anima.
  setBottomInset(px) {
    px = Math.max(0, px || 0);
    if (px === this.insetTo) return;
    const first = this.insetTo === undefined; // faixa da gaveta fechada, no carregamento
    this.insetTo = px;
    this.insetTween?.cancel();
    this.insetTween = null;
    const from = this.inset ?? 0;
    if (first || Math.abs(px - from) < 48) {
      this.inset = px;
      this.applyInset();
      return;
    }
    this.insetTween = tween({
      duration: 600,
      easing: ease.outCubic,
      onUpdate: (v) => {
        this.inset = from + (px - from) * v;
        this.applyInset();
      },
      onComplete: () => (this.insetTween = null),
    });
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    tickTweens();
    this.sparks.update(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  update(derived, state, opts) {
    const { model } = derived;
    this.rig.update(derived, state, opts);
    this.dims.update(model.dimLines);
    this.dimLines = model.dimLines; // entram no enquadramento (fitDistance)
    const prev = this.size;
    // caixa que envolve o projeto: X = comprimento, Y = altura, Z = largura
    const [L, H, W] = model.bounds.size;
    const dims = (this.size = { L, W, H });
    const s = Math.max(L, W, H) / 1000;
    const cam = this.key.shadow.camera;
    cam.left = cam.bottom = -s;
    cam.right = cam.top = s;
    cam.updateProjectionMatrix();
    // no meio de uma troca de vista, refaz a vista já com a altura nova
    if (opts?.reframe || (prev.H !== dims.H && this.camTween?.kind === 'view')) this.setView(this.view);
    else if (prev.H !== dims.H) {
      // acompanha a altura do projeto suavemente
      const t = this.controls.target;
      const from = t.y;
      const to = dims.H / 2000;
      this.startCamera('altura', { duration: 350, onUpdate: (v) => (t.y = from + (to - from) * v) });
    }
  }

  // Um só tween de câmera por vez: o novo cancela o anterior para que dois não escrevam
  // em camera.position / controls.target no mesmo frame.
  startCamera(kind, opts) {
    this.stopCamera();
    const t = tween({
      ...opts,
      onComplete: () => {
        if (this.camTween === t) this.camTween = null;
      },
    });
    t.kind = kind;
    this.camTween = t;
  }

  stopCamera() {
    this.camTween?.cancel();
    this.camTween = null;
  }

  // Pontos que precisam caber na tela, em metros: os cantos da caixa do projeto e as cotas
  // (que ficam para fora da caixa, na frente e do lado).
  framePoints() {
    const { L, W, H } = this.size;
    const pts = [];
    for (const x of [-L / 2, L / 2]) for (const y of [0, H]) for (const z of [-W / 2, W / 2]) pts.push([x, y, z]);
    for (const d of this.dimLines ?? []) {
      pts.push(d.from, d.to);
      for (const pair of d.ext ?? []) pts.push(...pair);
    }
    return pts.map((p) => new THREE.Vector3(p[0] / 1000, p[1] / 1000, p[2] / 1000));
  }

  // Distância do alvo até a câmera, olhando na direção `dir` (do alvo para a câmera), para
  // que todos os framePoints caibam numa área de w × h px. Cada ponto é projetado no plano
  // da câmera: com perspectiva, cabe quando |x| ≤ tan(fovH/2)·profundidade (idem para y).
  // As margens em px deixam espaço para os rótulos das cotas nas bordas.
  fitDistance(dir, target, { w, h } = this.viewSize ?? { w: 1, h: 1 }) {
    const { d, right, up } = this.basis(dir);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const tanV = tan * (1 - Math.min(0.4, 34 / (h / 2)));
    const tanH = tan * (w / h) * (1 - Math.min(0.4, 60 / (w / 2)));
    const v = new THREE.Vector3();
    let dist = 0;
    for (const p of this.framePoints()) {
      v.copy(p).sub(target);
      const depth = v.dot(d);
      dist = Math.max(dist, depth + Math.abs(v.dot(right)) / tanH, depth + Math.abs(v.dot(up)) / tanV);
    }
    return dist * 1.03;
  }

  // Eixos da câmera olhando na direção -dir (dir vai do alvo para a câmera)
  basis(dir) {
    const d = dir.clone().normalize();
    const right = new THREE.Vector3().crossVectors(this.camera.up, d);
    // vista de topo: a direção é quase o "para cima" da câmera
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    right.normalize();
    return { d, right, up: new THREE.Vector3().crossVectors(d, right) };
  }

  // Enquadramento do PDF: além de caber, desloca o alvo para o desenho ficar no meio da
  // imagem (vista de cima, a frente perto da câmera ocupa mais que o fundo e sobraria um
  // vazio em cima). Três passadas bastam para convergir.
  frameFor(dir, size) {
    const { d, right, up } = this.basis(dir);
    const target = new THREE.Vector3(0, this.size.H / 2000, 0);
    const v = new THREE.Vector3();
    for (let i = 0; i < 3; i++) {
      const dist = this.fitDistance(d, target, size);
      const cam = target.clone().addScaledVector(d, dist);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of this.framePoints()) {
        v.copy(p).sub(cam);
        const depth = -v.dot(d);
        if (depth <= 0) continue;
        const x = v.dot(right) / depth;
        const y = v.dot(up) / depth;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (!Number.isFinite(x0 + y0)) break;
      target.addScaledVector(right, ((x0 + x1) / 2) * dist).addScaledVector(up, ((y0 + y1) / 2) * dist);
    }
    return { target, position: target.clone().addScaledVector(d, this.fitDistance(d, target, size)) };
  }

  setView(name, animate = true) {
    this.view = name;
    const dir = VIEWS[name].clone().normalize();
    const target = new THREE.Vector3(0, this.size.H / 2000, 0);
    // recalculado a cada quadro: a área visível pode mudar no meio da animação (gaveta)
    const end = () => target.clone().addScaledVector(dir, this.fitDistance(dir, target));
    const p0 = this.camera.position.clone();
    const t0 = this.controls.target.clone();
    if (!animate) {
      this.stopCamera();
      this.camera.position.copy(end());
      this.controls.target.copy(target);
      return;
    }
    this.startCamera('view', {
      duration: 900,
      easing: ease.inOutCubic,
      onUpdate: (v) => {
        this.camera.position.lerpVectors(p0, end(), v);
        this.controls.target.lerpVectors(t0, target, v);
      },
    });
  }

  bindPointer() {
    const el = this.renderer.domElement;
    // um único abort() em dispose() remove todos os listeners
    this.pointerAbort = new AbortController();
    const on = (type, fn) => el.addEventListener(type, fn, { signal: this.pointerAbort.signal });
    let down = null;
    const pick = (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.rig.meshes.filter((m) => m.visible), false)[0];
      return hit?.object.userData.piece ?? null;
    };
    on('pointermove', (e) => {
      if (e.buttons) return;
      const piece = pick(e);
      this.rig.setHover(piece?.gid ?? null);
      el.style.cursor = piece ? 'pointer' : '';
      this.dispatchEvent(new CustomEvent('hover', { detail: { piece, x: e.clientX, y: e.clientY } }));
    });
    on('pointerleave', () => {
      this.rig.setHover(null);
      this.dispatchEvent(new CustomEvent('hover', { detail: { piece: null } }));
    });
    on('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    on('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const piece = pick(e);
      this.dispatchEvent(new CustomEvent('select', { detail: { gid: piece?.gid ?? null } }));
    });
  }

  // Imagem para o PDF: sem realce de hover/seleção, enquadrando o projeto inteiro e com as
  // cotas desenhadas por cima (o CSS2DRenderer não entra no toDataURL, e a linha do WebGL
  // tem sempre 1 px: no papel branco quase some).
  snapshot(width = 1400, height = 900) {
    const { renderer, camera, rig, dims } = this;
    const size = renderer.getSize(new THREE.Vector2());
    const pos = camera.position.clone();
    const { hoverGid, selectedGid } = rig;
    rig.hoverGid = rig.selectedGid = null;
    rig.applyHighlight();
    dims.setLinesVisible(false);

    renderer.setSize(width, height, false);
    camera.clearViewOffset();
    camera.aspect = width / height;
    // enquadra o projeto inteiro na imagem, mantendo o ângulo atual
    const frame = this.frameFor(pos.clone().sub(this.controls.target), { w: width, h: height });
    camera.position.copy(frame.position);
    camera.updateProjectionMatrix();
    camera.lookAt(frame.target);
    renderer.render(this.scene, camera);
    // copia logo após o render, antes de o navegador descartar o buffer do WebGL
    const url = this.withDims(renderer.domElement, camera);

    dims.setLinesVisible(true);
    renderer.setSize(size.x, size.y, false);
    camera.position.copy(pos);
    camera.lookAt(this.controls.target);
    this.applyInset();
    rig.hoverGid = hoverGid;
    rig.selectedGid = selectedGid;
    rig.applyHighlight();
    return url;
  }

  // Copia o canvas do WebGL para um canvas 2D e desenha as linhas e os rótulos das cotas
  // visíveis, projetados com a câmera do snapshot. Cores pensadas para o papel branco.
  withDims(src, camera) {
    const labels = this.dims.visible ? this.dims.labels.filter((o) => o.visible) : [];
    if (!labels.length) return src.toDataURL('image/png');
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const fs = Math.round(c.width / 50); // ~9 pt na largura da imagem no A4
    const p = new THREE.Vector3();
    // projeta um ponto do grupo das cotas (mm) para px do canvas; null se fora da câmera
    const toPx = (v) => {
      this.dims.group.localToWorld(p.copy(v)).project(camera);
      if (p.z < -1 || p.z > 1) return null;
      return [((p.x + 1) / 2) * c.width, ((1 - p.y) / 2) * c.height];
    };

    const segs = this.dims.segments;
    g.beginPath();
    for (let i = 0; i + 1 < segs.length; i += 2) {
      const a = toPx(segs[i]);
      const b = toPx(segs[i + 1]);
      if (!a || !b) continue;
      g.moveTo(...a);
      g.lineTo(...b);
    }
    g.strokeStyle = '#c2530b';
    g.lineWidth = Math.max(1.5, c.width / 650);
    g.lineCap = 'round';
    g.stroke();

    g.font = `600 ${fs}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(1, fs / 10);
    for (const o of labels) {
      o.getWorldPosition(p).project(camera);
      if (p.z < -1 || p.z > 1) continue; // atrás da câmera ou fora do alcance
      const x = ((p.x + 1) / 2) * c.width;
      const y = ((1 - p.y) / 2) * c.height;
      const text = o.element.textContent;
      const w = g.measureText(text).width + fs;
      const h = fs * 1.6;
      g.beginPath();
      if (g.roundRect) g.roundRect(x - w / 2, y - h / 2, w, h, fs * 0.3);
      else g.rect(x - w / 2, y - h / 2, w, h);
      g.fillStyle = 'rgba(255, 255, 255, 0.92)';
      g.fill();
      g.strokeStyle = '#c2530b';
      g.stroke();
      g.fillStyle = '#1b1b1d';
      g.fillText(text, x, y);
    }
    return c.toDataURL('image/png');
  }

  // Libera tudo o que o Viewer criou (GPU, DOM e listeners). O app usa uma instância só,
  // mas isso evita vazamento se o Viewer for recriado (HMR, testes).
  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.pointerAbort.abort();
    this.stopCamera();
    this.insetTween?.cancel();
    this.controls.dispose();
    this.rig.dispose();
    this.dims.dispose();
    this.sparks.dispose();
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.grid.geometry.dispose();
    this.grid.material.dispose();
    this.key.dispose(); // mapa de sombra
    this.envTarget.dispose();
    this.scene.environment = null;
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
