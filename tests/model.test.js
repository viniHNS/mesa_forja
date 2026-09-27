import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/state/defaults.js';
import { derive } from '../src/model/index.js';
import { generateTable } from '../src/model/table.js';

const S = (over = {}) => ({ ...DEFAULTS, ...over });
const byName = (pieces, name) => pieces.filter((p) => p.name === name);

test('quadro 45° sobre as pernas: medidas pela ponta maior', () => {
  const { pieces, dims } = generateTable(S());
  assert.equal(dims.fL, 1140);
  assert.equal(dims.fW, 740);
  assert.deepEqual(byName(pieces, 'Quadro · comprimento').map((p) => p.length), [1140, 1140]);
  assert.deepEqual(byName(pieces, 'Quadro · largura').map((p) => p.length), [740, 740]);
  // 750 - 25 (tampo) - 30 (quadro em pé) = 695
  assert.ok(byName(pieces, 'Perna').every((p) => p.length === 695));
  // reforço entre as faces internas: 740 - 2×20
  assert.equal(byName(pieces, 'Reforço do tampo')[0].length, 700);
});

test('canto reto: lado passante inteiro, outro lado desconta dois perfis', () => {
  const a = generateTable(S({ corner: 'reto', through: 'comprimento' }));
  assert.equal(byName(a.pieces, 'Quadro · comprimento')[0].length, 1140);
  assert.equal(byName(a.pieces, 'Quadro · largura')[0].length, 700);
  assert.equal(a.openEnds, 4);
  const b = generateTable(S({ corner: 'reto', through: 'largura' }));
  assert.equal(byName(b.pieces, 'Quadro · comprimento')[0].length, 1100);
  assert.equal(byName(b.pieces, 'Quadro · largura')[0].length, 740);
});

test('pernas até o tampo: quadro entre as pernas', () => {
  const { pieces } = generateTable(S({ assembly: 'passante', sameProfile: false, legProfile: '30x30' }));
  assert.equal(byName(pieces, 'Perna')[0].length, 725);
  assert.equal(byName(pieces, 'Quadro · comprimento')[0].length, 1140 - 60);
  assert.equal(byName(pieces, 'Quadro · largura')[0].length, 740 - 60);
});

test('travessas inferiores em H', () => {
  const { pieces } = generateTable(S({ stretcher: 'h' }));
  // perna 20x30: 30 no comprimento, 20 na largura
  assert.equal(byName(pieces, 'Travessa · lateral')[0].length, 740 - 40);
  assert.equal(byName(pieces, 'Travessa · central')[0].length, 1140 - 30 - 20);
});

test('plano de corte usa o mínimo de barras de 2 m', () => {
  const d = derive(S());
  const p = d.plan.profiles[0];
  // 9 peças ≥ 695 mm: no máximo 2 por barra útil de 1995 mm → 5 barras
  assert.equal(p.count, 5);
  for (const bar of p.bars) {
    const last = bar.cuts.at(-1);
    assert.ok(last.start + last.length <= 2000 + 1e-6, 'peça ultrapassa a barra');
  }
  assert.equal(d.cutList.reduce((s, g) => s + g.total, 0), p.pieces);
});

test('barras de 6 m e quantidade de mesas', () => {
  const d = derive(S({ barLength: 6000, qty: 3 }));
  const p = d.plan.profiles[0];
  assert.equal(p.pieces, 27);
  assert.ok(p.count >= p.lowerBound && p.count <= p.lowerBound + 1);
});

test('peça maior que a barra vira emenda', () => {
  const d = derive(S({ length: 2400, barLength: 2000 }));
  assert.ok(d.warnings.some((w) => w.includes('emenda')));
  const parts = d.plan.profiles[0].bars.flatMap((b) => b.cuts).filter((c) => c.splice);
  assert.equal(parts.length, 4); // 2 peças do comprimento × 2 partes
});

test('estoque desconta das barras a comprar e do custo', () => {
  const d = derive(S({ owned: { '20x30': 2 } }));
  const p = d.plan.profiles[0];
  assert.equal(p.toBuy, p.count - 2);
  assert.equal(d.costs.lines[0].total, p.toBuy * DEFAULTS.prices['20x30']);
});
