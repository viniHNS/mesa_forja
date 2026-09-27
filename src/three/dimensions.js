import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const fmt = (v) => `${Math.round(v).toLocaleString('pt-BR')} mm`;

// Cotas (em mm, dentro do grupo escalado da mesa): comprimento, largura e altura.
export class Dimensions {
  constructor() {
    this.group = new THREE.Group();
    this.material = new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85 });
    this.visible = true;
    this.labels = [];
  }

  line(a, b, tickDir, pts) {
    const t = tickDir.clone().multiplyScalar(22);
    pts.push(a, b);
    pts.push(a.clone().sub(t), a.clone().add(t));
    pts.push(b.clone().sub(t), b.clone().add(t));
  }

  label(text, at, cls = '') {
    const el = document.createElement('div');
    el.className = `dim-label ${cls}`;
    el.textContent = text;
    const obj = new CSS2DObject(el);
    obj.position.copy(at);
    obj.visible = this.visible;
    this.group.add(obj);
    this.labels.push(obj);
  }

  update(d) {
    this.group.children.forEach((c) => c.geometry?.dispose());
    this.group.clear();
    this.labels = [];
    const gap = 110;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const pts = [];
    const { L, W, H } = d;

    // comprimento, no chão à frente
    const zf = W / 2 + gap;
    this.line(V(-L / 2, 1, zf), V(L / 2, 1, zf), V(0, 0, 1), pts);
    pts.push(V(-L / 2, 1, W / 2 - d.O), V(-L / 2, 1, zf + 20), V(L / 2, 1, W / 2 - d.O), V(L / 2, 1, zf + 20));
    this.label(fmt(L), V(0, 1, zf));

    // largura, no chão à direita
    const xr = L / 2 + gap;
    this.line(V(xr, 1, -W / 2), V(xr, 1, W / 2), V(1, 0, 0), pts);
    pts.push(V(L / 2 - d.O, 1, -W / 2), V(xr + 20, 1, -W / 2), V(L / 2 - d.O, 1, W / 2), V(xr + 20, 1, W / 2));
    this.label(fmt(W), V(xr, 1, 0));

    // altura, na quina traseira direita
    const zb = -W / 2;
    this.line(V(xr, 0, zb), V(xr, H, zb), V(1, 0, 0), pts);
    pts.push(V(L / 2, H, zb), V(xr + 20, H, zb));
    this.label(fmt(H), V(xr, H / 2, zb), 'is-vertical');

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const lines = new THREE.LineSegments(geo, this.material);
    lines.visible = this.visible;
    this.group.add(lines);
  }

  setVisible(v) {
    this.visible = v;
    this.group.children.forEach((c) => (c.visible = v));
  }
}
