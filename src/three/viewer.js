import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { TableRig } from './tableRig.js';
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

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.75;

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

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.38 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(10, 50, 0x8a8f98, 0x5a5f68);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.material.depthWrite = false;
    grid.position.y = 0.0005;
    scene.add(grid);

    this.rig = new TableRig();
    scene.add(this.rig.root);
    this.dims = new Dimensions();
    this.rig.root.add(this.dims.group);

    this.sparks = new Sparks();
    scene.add(this.sparks.points, this.sparks.light);
    this.rig.onWeld = (p) => this.sparks.emit(p);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindPointer();

    new ResizeObserver(() => this.resize()).observe(container);
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
  applyInset() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    const inset = Math.min(this.inset ?? 0, h * 0.7);
    const visible = h - inset;
    this.camera.aspect = w / visible;
    if (inset > 0.5) this.camera.setViewOffset(w, visible, 0, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setBottomInset(px) {
    const from = this.inset ?? 0;
    this.insetTween?.cancel();
    this.insetTween = tween({
      duration: 600,
      easing: ease.outCubic,
      onUpdate: (v) => {
        this.inset = from + (px - from) * v;
        this.applyInset();
      },
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
    const { dims } = derived.model;
    this.rig.update(derived.model, state, opts);
    this.dims.update(dims);
    const prev = this.size;
    this.size = { L: dims.L, W: dims.W, H: dims.H };
    const s = Math.max(dims.L, dims.W, dims.H) / 1000;
    const cam = this.key.shadow.camera;
    cam.left = cam.bottom = -s;
    cam.right = cam.top = s;
    cam.updateProjectionMatrix();
    if (opts?.reframe) this.setView(this.view);
    else if (prev.H !== dims.H) {
      // acompanha a altura da mesa suavemente
      const t = this.controls.target;
      const from = t.y;
      const to = dims.H / 2000;
      tween({ duration: 350, onUpdate: (v) => (t.y = from + (to - from) * v) });
    }
  }

  distanceFor(dir) {
    const { L, W, H } = this.size;
    const r = Math.hypot(L, W, H) / 2000;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fit = r / Math.sin(fov / 2);
    const aspectPad = this.camera.aspect < 1 ? 1 / this.camera.aspect : 1;
    return fit * (dir === VIEWS.topo ? 1.05 : 1.12) * Math.min(aspectPad, 1.8);
  }

  setView(name, animate = true) {
    this.view = name;
    const dir = VIEWS[name].clone().normalize();
    const target = new THREE.Vector3(0, this.size.H / 2000, 0);
    const dist = this.distanceFor(VIEWS[name]);
    const end = target.clone().addScaledVector(dir, dist);
    const p0 = this.camera.position.clone();
    const t0 = this.controls.target.clone();
    if (!animate) {
      this.camera.position.copy(end);
      this.controls.target.copy(target);
      return;
    }
    tween({
      duration: 900,
      easing: ease.inOutCubic,
      onUpdate: (v) => {
        this.camera.position.lerpVectors(p0, end, v);
        this.controls.target.lerpVectors(t0, target, v);
      },
    });
  }

  bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    const pick = (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.rig.meshes.filter((m) => m.visible), false)[0];
      return hit?.object.userData.piece ?? null;
    };
    el.addEventListener('pointermove', (e) => {
      if (e.buttons) return;
      const piece = pick(e);
      this.rig.setHover(piece?.gid ?? null);
      el.style.cursor = piece ? 'pointer' : '';
      this.dispatchEvent(new CustomEvent('hover', { detail: { piece, x: e.clientX, y: e.clientY } }));
    });
    el.addEventListener('pointerleave', () => {
      this.rig.setHover(null);
      this.dispatchEvent(new CustomEvent('hover', { detail: { piece: null } }));
    });
    el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const piece = pick(e);
      this.dispatchEvent(new CustomEvent('select', { detail: { gid: piece?.gid ?? null } }));
    });
  }

  snapshot(width = 1400, height = 900) {
    const { renderer, camera } = this;
    const size = renderer.getSize(new THREE.Vector2());
    const pos = camera.position.clone();
    renderer.setSize(width, height, false);
    camera.clearViewOffset();
    camera.aspect = width / height;
    // enquadra a mesa inteira na imagem, mantendo o ângulo atual
    const dir = pos.clone().sub(this.controls.target).normalize();
    camera.position.copy(this.controls.target).addScaledVector(dir, this.distanceFor(dir));
    camera.updateProjectionMatrix();
    camera.lookAt(this.controls.target);
    renderer.render(this.scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.setSize(size.x, size.y, false);
    camera.position.copy(pos);
    camera.lookAt(this.controls.target);
    this.applyInset();
    return url;
  }
}
