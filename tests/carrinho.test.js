import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize, linkData } from '../src/state/persist.js';
import { derive } from '../src/model/index.js';
import { getProject } from '../src/projects/index.js';
import { usedProfiles } from '../src/model/profiles.js';
import { VERSION } from '../src/state/defaults.js';

const carrinho = (params = {}, shared = {}) => derive(sanitize({ v: 2, type: 'carrinho', projects: { carrinho: params }, ...shared }));
const byName = (d, name) => d.model.pieces.filter((p) => p.name === name);
const center = (p) => p.start[1];

test('padrão: colunas sobre rodízios de 4" até o topo do quadro de cima', () => {
  const d = carrinho();
  const cols = byName(d, 'Coluna');
  assert.equal(cols.length, 4);
  // 850 de altura − 2 da chapa − 128 do rodízio
  for (const c of cols) {
    assert.equal(c.length, 720);
    assert.equal(c.start[1], 128);
  }
  assert.equal(d.model.feet.length, 4);
  assert.ok(d.model.feet.every((f) => f.kind === 'rodizio' && f.caster === '4'));
});

test('bandejas: quadro entre as colunas, distribuídas por igual, placa por cima', () => {
  const d = carrinho();
  // coluna 20×30 (30 no comprimento, 20 na largura), quadro 20×30 em pé
  const comp = byName(d, 'Bandeja · comprimento');
  const larg = byName(d, 'Bandeja · largura');
  assert.equal(comp.length, 6);
  assert.equal(larg.length, 6);
  assert.ok(comp.every((p) => p.length === 750 - 2 * 30));
  assert.ok(larg.every((p) => p.length === 400 - 2 * 20));
  const ys = [...new Set(comp.map(center))].sort((a, b) => a - b);
  assert.deepEqual(ys, [143, 488, 833]); // rente ao pé, no meio, rente ao topo
  assert.equal(d.model.panels.length, 3);
  const top = d.model.panels.at(-1);
  assert.equal(top.center[1] + top.size[1] / 2, 850);
  assert.equal(top.material, 'chapa');
  assert.equal(Math.round(d.model.dims.gap), 313);
  assert.equal(byName(d, 'Reforço da bandeja').length, 3);
});

test('alça em U: braços e barra com cantos a 45°, medidos na ponta maior', () => {
  const d = carrinho({ handleOut: 150 });
  const arms = byName(d, 'Alça · braço');
  const [bar] = byName(d, 'Alça · barra');
  assert.equal(arms.length, 2);
  assert.ok(arms.every((a) => a.length === 150 && a.ends[0].cut === 90 && a.ends[1].cut === 45));
  assert.equal(bar.length, 400);
  assert.ok(bar.ends.every((e) => e.cut === 45));
  // a cota da direita passa depois da alça
  assert.ok(d.model.dimLines[1].from[0] > 750 / 2 + 150);

  const sem = carrinho({ handle: false });
  assert.equal(byName(sem, 'Alça · braço').length, 0);
});

test('perfis usados ignoram a função escondida (sem alça, sem travessa)', () => {
  const roleProfiles = { post: '30x30', frame: '20x30', handle: '20x20' };
  const cart = getProject('carrinho');
  assert.deepEqual(usedProfiles(cart, { ...cart.defaults, sameProfile: false, roleProfiles }).sort(), ['20x20', '20x30', '30x30']);
  assert.deepEqual(usedProfiles(cart, { ...cart.defaults, sameProfile: false, roleProfiles, handle: false }).sort(), ['20x30', '30x30']);
  const mesa = getProject('mesa');
  assert.ok(!usedProfiles(mesa, { ...mesa.defaults, sameProfile: false }).includes(mesa.defaults.roleProfiles.stretcher));
});

test('custos: rodízios no lugar das sapatas e placas das bandejas', () => {
  const d = carrinho({ panelPrice: 40 }, { qty: 2, casterPrice: 30 });
  const kinds = d.costs.lines.map((l) => l.kind);
  assert.ok(!kinds.includes('sapata'));
  const rod = d.costs.lines.find((l) => l.kind === 'rodizio');
  assert.equal(rod.qty, 8);
  assert.equal(rod.total, 240);
  assert.equal(rod.label, 'Rodízios 4"');
  const band = d.costs.lines.find((l) => l.kind === 'bandeja');
  assert.equal(band.qty, 6);
  assert.equal(band.total, 240);
});

test('sem placa, o topo das colunas fica aberto e pede tampa', () => {
  const d = carrinho({ panelThickness: 0 });
  assert.equal(d.model.panels.length, 0);
  assert.equal(d.model.openEnds, 4);
  assert.equal(byName(d, 'Coluna')[0].length, 850 - 128);
});

test('avisa quando as bandejas não cabem na altura', () => {
  assert.ok(carrinho({ height: 500, shelves: 6 }).warnings.length > 0);
  assert.ok(carrinho({ height: 600, shelves: 4 }).warnings.some((w) => w.includes('Vão entre bandejas')));
});

test('link do carrinho leva o tipo e só o que difere do padrão', () => {
  const s = sanitize({ v: 2, type: 'carrinho', projects: { carrinho: { shelves: 4 }, mesa: { length: 1500 } } });
  assert.deepEqual(linkData(s), { v: VERSION, type: 'carrinho', projects: { carrinho: { shelves: 4 } } });
});
