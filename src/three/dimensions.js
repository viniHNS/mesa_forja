import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const fmt = (v) => `${Math.round(v).toLocaleString('pt-BR')} mm`;

// Cotas (em mm, dentro do grupo escalado do projeto), vindas de model.dimLines.
export class Dimensions {
  constructor() {
    this.group = new THREE.Group();
    this.material = new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85 });
    this.visible = true;
    this.labels = []; // lidos pelo Viewer.snapshot() para desenhar os textos na imagem
    this.segments = []; // pares de pontos (mm) das linhas, redesenhados no snapshot do PDF
    this.lines = null;
  }

  line(a, b, tickDir, pts) {
    const t = tickDir.clone().multiplyScalar(22);
    pts.push(a, b);
    pts.push(a.clone().sub(t), a.clone().add(t));
    pts.push(b.clone().sub(t), b.clone().add(t));
  }

  label(text, at) {
    const el = document.createElement('div');
    el.className = 'dim-label';
    el.textContent = text;
    const obj = new CSS2DObject(el);
    obj.position.copy(at);
    obj.visible = this.visible;
    this.group.add(obj);
    this.labels.push(obj);
  }

  // descarta as linhas e tira os rótulos (o CSS2DObject remove o próprio elemento do DOM
  // ao sair do grupo)
  reset() {
    this.group.children.forEach((c) => c.geometry?.dispose());
    this.group.clear();
    this.labels = [];
    this.segments = [];
    this.lines = null;
  }

  // Cada cota: linha de `from` a `to` com traços nas pontas (direção `tick`), linhas de
  // chamada `ext` (pares de pontos) e o valor em mm no meio. Quem monta é o tipo de projeto.
  update(dimLines = []) {
    this.reset();
    const V = (a) => new THREE.Vector3(...a);
    const pts = [];
    for (const d of dimLines) {
      const a = V(d.from);
      const b = V(d.to);
      this.line(a, b, V(d.tick ?? [0, 0, 0]), pts);
      for (const [p, q] of d.ext ?? []) pts.push(V(p), V(q));
      this.label(fmt(d.value), a.clone().lerp(b, 0.5));
    }
    this.segments = pts;
    if (!pts.length) return;
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const lines = (this.lines = new THREE.LineSegments(geo, this.material));
    lines.visible = this.visible;
    this.group.add(lines);
  }

  setVisible(v) {
    this.visible = v;
    this.group.children.forEach((c) => (c.visible = v));
  }

  // só as linhas (o snapshot do PDF esconde as do WebGL e desenha as suas por cima)
  setLinesVisible(v) {
    if (this.lines) this.lines.visible = v && this.visible;
  }

  dispose() {
    this.reset();
    this.material.dispose();
  }
}
