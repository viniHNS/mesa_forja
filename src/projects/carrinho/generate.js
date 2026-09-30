import { getCaster, getProfile } from '../../model/catalog.js';

// Mesmo sistema da mesa (mm): X = comprimento, Y = altura (chão = 0), Z = largura (frente = +Z).
//
// Carrinho: 4 colunas em cima de rodízios e N bandejas iguais. Cada bandeja é um quadro de
// metalon soldado entre as colunas (faces de fora rentes às das colunas), com a placa
// (chapa, madeira, MDF) apoiada por cima. A de baixo fica rente ao pé das colunas e a de
// cima rente ao topo; as do meio se distribuem por igual. Alça em U opcional no lado direito.

const straight = (extra = {}) => ({ cut: 90, weld: true, ...extra });
const miter = (plane, long) => ({ cut: 45, weld: true, plane, long });

const MIN_GAP = 120; // vão livre mínimo entre bandejas (mão e ferramenta)

/**
 * @param s   parâmetros do carrinho (state.projects.carrinho)
 * @param ctx { profiles: { post, frame, handle } } já resolvidos
 */
export function generateCarrinho(s, { profiles: prof }) {
  const warnings = [];
  const pp = getProfile(prof.post);
  const fp = getProfile(prof.frame);
  const hp = getProfile(prof.handle);
  const caster = getCaster(s.caster);

  // Coluna: lado maior acompanhando o comprimento
  const px = pp.b;
  const pz = pp.a;
  // Quadro "em pé" = lado maior na vertical (mais rígido)
  const hq = s.frameUpright ? fp.b : fp.a;
  const qw = s.frameUpright ? fp.a : fp.b;

  const L = s.length;
  const W = s.width;
  const H = s.height;
  const T = Math.max(0, s.panelThickness);
  const n = Math.max(1, Math.round(s.shelves));

  const y0 = caster.h; // pé das colunas = topo da placa dos rodízios
  const yTop = H - T; // topo do quadro de cima
  const postLen = yTop - y0;
  const first = y0 + hq / 2;
  const last = yTop - hq / 2;
  const step = n > 1 ? (last - first) / (n - 1) : 0;
  const levels = Array.from({ length: n }, (_, i) => first + i * step);
  const gap = n > 1 ? step - hq - T : postLen - hq;

  if (postLen < n * hq + 40) warnings.push('Altura muito baixa para essa quantidade de bandejas.');
  else if (n > 1 && gap < MIN_GAP) warnings.push(`Vão entre bandejas de só ${Math.round(gap)} mm: aumente a altura ou tire uma bandeja.`);
  if (qw > px || qw > pz) {
    warnings.push('O perfil do quadro é mais largo que a coluna: prefira colunas mais grossas ou o quadro em pé.');
  }

  const pieces = [];
  const add = (p) => pieces.push({ id: pieces.length, ...p });

  // ---- Colunas (o topo fica aberto só quando não há placa em cima)
  const postX = L / 2 - px / 2;
  const postZ = W / 2 - pz / 2;
  [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
    add({
      key: `coluna-${i}`, name: 'Coluna', group: 'coluna', profile: prof.post, axis: 'y',
      start: [sx * postX, y0, sz * postZ], length: postLen, sec: { x: px, z: pz },
      ends: [straight({ weld: false, foot: true }), straight({ weld: false, open: T === 0 })],
    });
  });

  // ---- Bandejas: quadro entre as colunas + reforços ligando frente e fundo
  const braces = Math.max(0, Math.round(s.braces));
  const inner = L - 2 * px;
  levels.forEach((yc, i) => {
    for (const sz of [1, -1]) {
      add({
        key: `b${i}-comp-${sz}`, name: 'Bandeja · comprimento', group: 'quadro', profile: prof.frame, axis: 'x',
        start: [-L / 2 + px, yc, sz * (W / 2 - qw / 2)], length: inner, sec: { y: hq, z: qw },
        ends: [straight(), straight()],
      });
    }
    for (const sx of [-1, 1]) {
      add({
        key: `b${i}-larg-${sx}`, name: 'Bandeja · largura', group: 'quadro', profile: prof.frame, axis: 'z',
        start: [sx * (L / 2 - qw / 2), yc, -W / 2 + pz], length: W - 2 * pz, sec: { y: hq, x: qw },
        ends: [straight(), straight()],
      });
    }
    for (let j = 1; j <= braces; j++) {
      add({
        key: `b${i}-reforco-${j}-${braces}`, name: 'Reforço da bandeja', group: 'reforco', profile: prof.frame, axis: 'z',
        start: [-inner / 2 + (inner * j) / (braces + 1), yc, -W / 2 + qw], length: W - 2 * qw, sec: { y: hq, x: qw },
        ends: [straight(), straight()],
      });
    }
  });

  // ---- Alça em U no lado direito (+X), na altura do quadro de cima, com cantos a 45°
  const out = s.handle ? s.handleOut : 0;
  if (s.handle) {
    const hy = hp.a;
    const hw = hp.b;
    const yh = levels[n - 1];
    if (out < 2 * hw + 30) warnings.push('Alça muito curta para esse perfil: aumente a saída da alça.');
    for (const sz of [1, -1]) {
      add({
        key: `alca-braco-${sz}`, name: 'Alça · braço', group: 'alca', profile: prof.handle, axis: 'x',
        start: [L / 2, yh, sz * (W / 2 - hw / 2)], length: out, sec: { y: hy, z: hw },
        ends: [straight(), miter('z', sz)],
      });
    }
    add({
      key: 'alca-barra', name: 'Alça · barra', group: 'alca', profile: prof.handle, axis: 'z',
      start: [L / 2 + out - hw / 2, yh, -W / 2], length: W, sec: { y: hy, x: hw },
      ends: [miter('x', 1), miter('x', 1)],
    });
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

  // Placas por cima de cada quadro. Menos a de cima, todas passam pelas colunas: levam um
  // recorte de px × pz nos cantos (no 3D a caixa só atravessa as colunas).
  const panels =
    T > 0
      ? levels.map((yc, i) => ({
          key: `bandeja-${i}`, name: i === n - 1 ? 'Bandeja de cima' : `Bandeja ${i + 1}`,
          size: [L, T, W], center: [0, yc + hq / 2 + T / 2, 0], material: s.panelMaterial,
        }))
      : [];

  const plate = Math.min(caster.plate, L / 2, W / 2);
  const feet = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => ({
    x: sx * (L / 2 - plate / 2), z: sz * (W / 2 - plate / 2), sx: plate, sz: plate, kind: 'rodizio', caster: caster.id,
  }));

  return {
    pieces,
    panels,
    feet,
    // a alça sai só para a direita, mas a caixa é centrada: conta a saída dos dois lados
    bounds: { size: [L + 2 * out, H, W], base: [L, W] },
    dimLines: dimLines({ L, W, H, out }),
    dims: { L, W, H, T, n, gap, step, postLen, px, pz, hq, qw, out, caster },
    welds: Math.round(welds),
    openEnds,
    warnings,
  };
}

// Cotas: comprimento e largura no chão, à frente e à direita (depois da alça), e altura
// na quina traseira direita.
function dimLines({ L, W, H, out }) {
  const gap = 110;
  const zf = W / 2 + gap;
  const xr = L / 2 + out + gap;
  const zb = -W / 2;
  return [
    {
      from: [-L / 2, 1, zf], to: [L / 2, 1, zf], tick: [0, 0, 1], value: L,
      ext: [[[-L / 2, 1, W / 2], [-L / 2, 1, zf + 20]], [[L / 2, 1, W / 2], [L / 2, 1, zf + 20]]],
    },
    {
      from: [xr, 1, -W / 2], to: [xr, 1, W / 2], tick: [1, 0, 0], value: W,
      ext: [[[L / 2, 1, -W / 2], [xr + 20, 1, -W / 2]], [[L / 2, 1, W / 2], [xr + 20, 1, W / 2]]],
    },
    {
      from: [xr, 0, zb], to: [xr, H, zb], tick: [1, 0, 0], value: H, vertical: true,
      ext: [[[L / 2, H, zb], [xr + 20, H, zb]]],
    },
  ];
}
