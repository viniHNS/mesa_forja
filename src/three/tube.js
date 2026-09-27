import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const AXES = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

// Base local (direita) em que o eixo Z local segue a peça.
function basisFor(axis) {
  const lz = AXES[axis].clone();
  const ly = axis === 'y' ? AXES.z.clone() : AXES.y.clone();
  const lx = new THREE.Vector3().crossVectors(ly, lz);
  return { lx, ly, lz };
}

const axisName = (v) => (Math.abs(v.x) > 0.5 ? 'x' : Math.abs(v.y) > 0.5 ? 'y' : 'z');

function roundedRect(path, w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - r);
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + h);
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

// Tubo oco com cantos arredondados, centrado na origem (mm), já orientado no mundo.
export function tubeGeometry(piece, wall) {
  const { lx, ly, lz } = basisFor(piece.axis);
  const w = piece.sec[axisName(lx)];
  const h = piece.sec[axisName(ly)];
  const t = Math.min(wall, Math.min(w, h) / 3);
  const r = Math.min(t * 1.6, Math.min(w, h) / 2 - 0.1);

  const shape = roundedRect(new THREE.Shape(), w, h, r);
  shape.holes.push(roundedRect(new THREE.Path(), w - 2 * t, h - 2 * t, Math.max(r - t, 0.25)));

  const L = piece.length;
  let geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, curveSegments: 4, steps: 1 });

  // Cortes de 45°: desloca os vértices das pontas conforme a posição lateral no plano do corte.
  const pos = geo.attributes.position;
  const eps = 1e-3;
  const [e0, e1] = piece.ends;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const end = z < eps ? e0 : z > L - eps ? e1 : null;
    if (!end || end.cut !== 45) continue;
    const pa = end.plane;
    const lat = lx[pa] * x + ly[pa] * y;
    const half = piece.sec[pa] / 2;
    const shift = half - end.long * lat;
    pos.setZ(i, z < eps ? shift : L - shift);
  }
  geo.deleteAttribute('normal');
  geo = toCreasedNormals(geo, Math.PI / 6);

  geo.applyMatrix4(new THREE.Matrix4().makeBasis(lx, ly, lz));
  const half = AXES[piece.axis].clone().multiplyScalar(-L / 2);
  geo.translate(half.x, half.y, half.z);
  return geo;
}

export function pieceCenter(piece) {
  const [x, y, z] = piece.start;
  const c = new THREE.Vector3(x, y, z);
  return c.addScaledVector(AXES[piece.axis], piece.length / 2);
}

export function pieceEnds(piece) {
  const a = new THREE.Vector3(...piece.start);
  const b = a.clone().addScaledVector(AXES[piece.axis], piece.length);
  return [a, b];
}
