import { getProfile } from './catalog.js';

// Sistema de coordenadas (mm): X = comprimento, Y = altura (chão = 0), Z = largura (frente = +Z).
// Cada peça é um tubo reto: começa em `start` (centro da seção na ponta de menor coordenada)
// e segue `length` mm ao longo de `axis`. `sec` guarda a medida da seção nos outros dois eixos.
// Pontas: { cut: 90 } ou { cut: 45, plane, long } — no corte de 45° a face do lado `long`
// (sinal +1/-1 no eixo `plane`) é a ponta maior; `length` é sempre a medida da ponta maior.

const straight = (extra = {}) => ({ cut: 90, weld: true, ...extra });
const miter = (plane, long) => ({ cut: 45, weld: true, plane, long });

export function resolveProfiles(s) {
  return s.sameProfile
    ? { frame: s.profile, leg: s.profile, stretcher: s.profile }
    : { frame: s.frameProfile, leg: s.legProfile, stretcher: s.stretcherProfile };
}

export function generateTable(s) {
  const warnings = [];
  const prof = resolveProfiles(s);
  const fp = getProfile(prof.frame);
  const lp = getProfile(prof.leg);
  const sp = getProfile(prof.stretcher);

  // Seção do quadro/travessas: "em pé" = lado maior na vertical (mais rígido)
  const hq = s.frameUpright ? fp.b : fp.a;
  const qw = s.frameUpright ? fp.a : fp.b;
  const sh = s.frameUpright ? sp.b : sp.a;
  const sd = s.frameUpright ? sp.a : sp.b;
  // Perna: lado maior acompanhando o comprimento, a menos que girada
  const lx = s.legRotate ? lp.a : lp.b;
  const lz = s.legRotate ? lp.b : lp.a;

  const L = s.length;
  const W = s.width;
  const H = s.height;
  const T = Math.max(0, s.topThickness);
  let O = Math.max(0, s.overhang);

  const minFrame = (leg, rail) => 2 * Math.max(leg, rail) + 60;
  const maxO = Math.min((L - minFrame(lx, qw)) / 2, (W - minFrame(lz, qw)) / 2);
  if (O > maxO) {
    O = Math.max(0, Math.floor(maxO));
    warnings.push(`Sobra do tampo reduzida para ${O} mm: o quadro ficaria menor que as pernas.`);
  }
  const fL = L - 2 * O;
  const fW = W - 2 * O;
  const yTop = H - T;

  const pieces = [];
  const add = (p) => pieces.push({ id: pieces.length, ...p });

  const passante = s.assembly === 'passante';
  const yc = yTop - hq / 2;
  const legLen = passante ? yTop : yTop - hq;

  if (legLen < 80) warnings.push('Altura muito baixa para essa combinação de tampo e quadro.');
  if (passante && (qw > lx || qw > lz)) {
    warnings.push('O perfil do quadro é mais largo que a perna: com pernas até o tampo, prefira pernas mais grossas.');
  }

  // ---- Pernas
  const legX = fL / 2 - lx / 2;
  const legZ = fW / 2 - lz / 2;
  const corners = [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ];
  corners.forEach(([sx, sz], i) => {
    add({
      key: `perna-${i}`,
      name: 'Perna',
      group: 'perna',
      profile: prof.leg,
      axis: 'y',
      start: [sx * legX, 0, sz * legZ],
      length: legLen,
      sec: { x: lx, z: lz },
      ends: [straight({ weld: false, foot: true }), straight({ weld: !passante })],
    });
  });

  // ---- Quadro
  const railZ = fW / 2 - qw / 2; // centro das peças do comprimento (frente/trás)
  const railX = fL / 2 - qw / 2; // centro das peças da largura (laterais)
  const longName = 'Quadro · comprimento';
  const shortName = 'Quadro · largura';

  if (passante) {
    for (const sz of [1, -1]) {
      add({
        key: `q-comp-${sz}`, name: longName, group: 'quadro', profile: prof.frame, axis: 'x',
        start: [-fL / 2 + lx, yc, sz * railZ], length: fL - 2 * lx, sec: { y: hq, z: qw },
        ends: [straight(), straight()],
      });
    }
    for (const sx of [-1, 1]) {
      add({
        key: `q-larg-${sx}`, name: shortName, group: 'quadro', profile: prof.frame, axis: 'z',
        start: [sx * railX, yc, -fW / 2 + lz], length: fW - 2 * lz, sec: { y: hq, x: qw },
        ends: [straight(), straight()],
      });
    }
  } else if (s.corner === '45') {
    for (const sz of [1, -1]) {
      add({
        key: `q-comp-${sz}`, name: longName, group: 'quadro', profile: prof.frame, axis: 'x',
        start: [-fL / 2, yc, sz * railZ], length: fL, sec: { y: hq, z: qw },
        ends: [miter('z', sz), miter('z', sz)],
      });
    }
    for (const sx of [-1, 1]) {
      add({
        key: `q-larg-${sx}`, name: shortName, group: 'quadro', profile: prof.frame, axis: 'z',
        start: [sx * railX, yc, -fW / 2], length: fW, sec: { y: hq, x: qw },
        ends: [miter('x', sx), miter('x', sx)],
      });
    }
  } else {
    const longThrough = s.through !== 'largura';
    const open = () => straight({ weld: false, open: true });
    for (const sz of [1, -1]) {
      add({
        key: `q-comp-${sz}`, name: longName, group: 'quadro', profile: prof.frame, axis: 'x',
        start: [longThrough ? -fL / 2 : -fL / 2 + qw, yc, sz * railZ],
        length: longThrough ? fL : fL - 2 * qw, sec: { y: hq, z: qw },
        ends: longThrough ? [open(), open()] : [straight(), straight()],
      });
    }
    for (const sx of [-1, 1]) {
      add({
        key: `q-larg-${sx}`, name: shortName, group: 'quadro', profile: prof.frame, axis: 'z',
        start: [sx * railX, yc, longThrough ? -fW / 2 + qw : -fW / 2],
        length: longThrough ? fW - 2 * qw : fW, sec: { y: hq, x: qw },
        ends: longThrough ? [straight(), straight()] : [open(), open()],
      });
    }
  }

  // ---- Reforços sob o tampo (ligam as peças do comprimento)
  const braces = Math.max(0, Math.round(s.braces));
  const braceSpanX = passante ? fL - 2 * lx : fL;
  for (let i = 1; i <= braces; i++) {
    const x = -braceSpanX / 2 + (braceSpanX * i) / (braces + 1);
    add({
      key: `reforco-${i}-${braces}`, name: 'Reforço do tampo', group: 'reforco', profile: prof.frame, axis: 'z',
      start: [x, yc, -fW / 2 + qw], length: fW - 2 * qw, sec: { y: hq, x: qw },
      ends: [straight(), straight()],
    });
  }

  // ---- Travessas inferiores
  const type = s.stretcher;
  if (type && type !== 'nenhuma') {
    const maxH = Math.floor(legLen - sh - (passante ? hq : 0) - 40);
    let hs = s.stretcherHeight;
    if (hs > maxH) {
      hs = Math.max(0, maxH);
      warnings.push(`Altura da travessa inferior limitada a ${hs} mm.`);
    }
    const ys = hs + sh / 2;
    for (const sx of [-1, 1]) {
      add({
        key: `trav-lat-${sx}`, name: 'Travessa · lateral', group: 'travessa', profile: prof.stretcher, axis: 'z',
        start: [sx * legX, ys, -fW / 2 + lz], length: fW - 2 * lz, sec: { y: sh, x: sd },
        ends: [straight(), straight()],
      });
    }
    const longSides = type === 'perimetral' ? [1, -1] : type === 'u' ? [-1] : [];
    for (const sz of longSides) {
      add({
        key: `trav-comp-${sz}`, name: sz > 0 ? 'Travessa · frente' : 'Travessa · fundo', group: 'travessa',
        profile: prof.stretcher, axis: 'x',
        start: [-fL / 2 + lx, ys, sz * legZ], length: fL - 2 * lx, sec: { y: sh, z: sd },
        ends: [straight(), straight()],
      });
    }
    if (type === 'perimetral') {
      // frente e fundo têm o mesmo comprimento: um nome só na lista de corte
      pieces.filter((p) => p.key.startsWith('trav-comp')).forEach((p) => (p.name = 'Travessa · frente/fundo'));
    }
    if (type === 'h') {
      add({
        key: 'trav-central', name: 'Travessa · central', group: 'travessa', profile: prof.stretcher, axis: 'x',
        start: [-legX + sd / 2, ys, 0], length: 2 * legX - sd, sec: { y: sh, z: sd },
        ends: [straight(), straight()],
      });
    }
  }

  for (const p of pieces) {
    if (!(p.length > 0)) warnings.push(`A peça "${p.name}" ficou sem comprimento: revise as medidas.`);
    p.length = Math.max(1, Math.round(p.length * 10) / 10);
  }

  let welds = 0;
  let openEnds = 0;
  for (const p of pieces) {
    for (const e of p.ends) {
      if (e.cut === 45) welds += 0.5;
      else if (e.weld) welds += 1;
      if (e.open) openEnds += 1;
    }
  }

  return {
    pieces,
    top: { size: [L, T, W], center: [0, yTop + T / 2, 0] },
    feet: pieces.filter((p) => p.group === 'perna').map((p) => ({ x: p.start[0], z: p.start[2], sx: lx, sz: lz })),
    dims: { L, W, H, T, O, fL, fW, yTop, lx, lz, qw, hq, legLen },
    profiles: prof,
    welds: Math.round(welds),
    openEnds,
    feetCount: 4,
    warnings,
  };
}
