import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, SCHEMA, VERSION, ruleFor } from '../src/state/defaults.js';
import { sanitize, linkData, sameProject } from '../src/state/persist.js';
import { derive } from '../src/model/index.js';

const mesa = (s) => s.projects.mesa;

test('sem dados ou com lixo, volta o padrão', () => {
  assert.deepEqual(sanitize(null), DEFAULTS);
  assert.deepEqual(sanitize('x'), DEFAULTS);
  assert.deepEqual(sanitize([1, 2]), DEFAULTS);
});

test('formato v2: valores válidos passam', () => {
  const s = sanitize({
    v: 2,
    type: 'mesa',
    projects: { mesa: { length: 1600, profile: '40x40', corner: 'reto', roleProfiles: { leg: '50x50' } } },
    showPanels: false,
    owned: { '40x40': 3 },
  });
  assert.equal(mesa(s).length, 1600);
  assert.equal(mesa(s).profile, '40x40');
  assert.equal(mesa(s).corner, 'reto');
  assert.deepEqual(mesa(s).roleProfiles, { ...DEFAULTS.projects.mesa.roleProfiles, leg: '50x50' });
  assert.equal(s.showPanels, false);
  assert.equal(s.owned['40x40'], 3);
});

test('formato v1 (campos soltos) é migrado', () => {
  const s = sanitize({ length: 1600, frameProfile: '20x40', legProfile: '40x40', showTop: false, qty: 2, topPrice: 99 });
  assert.equal(s.v, VERSION);
  assert.equal(s.type, 'mesa');
  assert.equal(mesa(s).length, 1600);
  assert.equal(mesa(s).roleProfiles.frame, '20x40');
  assert.equal(mesa(s).roleProfiles.leg, '40x40');
  assert.equal(mesa(s).topPrice, 99);
  assert.equal(s.showPanels, false);
  assert.equal(s.qty, 2);
  assert.equal(s.length, undefined);
});

test('strings fora do catálogo são descartadas (evita HTML injetado por link)', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const s = sanitize({
    v: 2,
    type: evil,
    chapa: 13,
    finish: evil,
    owned: { [evil]: 5, '20x30': 'muitas' },
    meterPrices: { [evil]: 1 },
    projects: {
      mesa: { profile: evil, roleProfiles: { frame: evil, leg: '99x99', [evil]: '20x20' }, corner: evil, stretcher: 'x', topMaterial: evil },
      [evil]: { length: 1 },
    },
  });
  for (const k of ['type', 'chapa', 'finish']) assert.equal(s[k], DEFAULTS[k], k);
  for (const k of ['profile', 'roleProfiles', 'corner', 'stretcher', 'topMaterial']) assert.deepEqual(mesa(s)[k], DEFAULTS.projects.mesa[k], k);
  assert.deepEqual(Object.keys(s.projects), Object.keys(DEFAULTS.projects));
  assert.deepEqual(s.owned, {});
  assert.deepEqual(s.meterPrices, DEFAULTS.meterPrices);
});

test('números são limitados às faixas e inteiros onde precisa', () => {
  const s = sanitize({ qty: 0, braces: 2.6, length: -5, height: 1e9, kerf: NaN, width: '900' });
  assert.equal(s.qty, 1);
  assert.equal(mesa(s).braces, 3);
  assert.equal(mesa(s).length, 100);
  assert.equal(mesa(s).height, 1500);
  assert.equal(s.kerf, DEFAULTS.kerf);
  assert.equal(mesa(s).width, DEFAULTS.projects.mesa.width);
  assert.ok(Number.isFinite(derive(s).costs.perTable));
});

test('campos desconhecidos e __proto__ não entram', () => {
  const s = sanitize(JSON.parse('{"v":2,"__proto__":{"hack":1},"foo":1,"owned":{"__proto__":{"x":1}},"projects":{"__proto__":{"y":1}}}'));
  assert.equal(s.foo, undefined);
  assert.equal(s.hack, undefined);
  assert.equal({}.hack, undefined);
  assert.deepEqual(s.owned, {});
  assert.deepEqual(Object.keys(s.projects), Object.keys(DEFAULTS.projects));
});

test('link antigo com preço por barra vira preço por metro', () => {
  const s = sanitize({ barLength: 6000, prices: { '20x30': 81, '40x40': 'x' } });
  assert.equal(s.meterPrices['20x30'], 13.5);
  assert.equal(s.meterPrices['40x40'], DEFAULTS.meterPrices['40x40']);
  assert.equal(s.prices, undefined);
  // sem barLength no link, a barra era a padrão (2 m)
  assert.equal(sanitize({ prices: { '20x20': 30 } }).meterPrices['20x20'], 15);
});

test('link leva só a versão e o que difere do padrão, e sobrevive à volta', () => {
  assert.deepEqual(linkData(sanitize(null)), { v: VERSION });
  const s = sanitize({ v: 2, qty: 3, projects: { mesa: { length: 1500 } } });
  const data = linkData(s);
  assert.deepEqual(data, { v: VERSION, qty: 3, projects: { mesa: { length: 1500 } } });
  assert.ok(sameProject(sanitize(JSON.parse(JSON.stringify(data))), s));
  assert.ok(!sameProject(s, sanitize(null)));
});

test('um link v1 migrado é o mesmo projeto que o v2 equivalente', () => {
  assert.ok(sameProject(sanitize({ length: 1500, corner: 'reto' }), sanitize({ v: 2, projects: { mesa: { length: 1500, corner: 'reto' } } })));
});

test('link grava só o item que mudou dentro de objetos (preços, estoque, perfis por função)', () => {
  const s = sanitize({
    v: 2,
    meterPrices: { ...DEFAULTS.meterPrices, '20x30': 99 },
    owned: { '20x30': 2 },
    projects: { mesa: { roleProfiles: { ...DEFAULTS.projects.mesa.roleProfiles, leg: '40x40' } } },
  });
  const data = linkData(s);
  assert.deepEqual(data, {
    v: VERSION,
    owned: { '20x30': 2 },
    meterPrices: { '20x30': 99 },
    projects: { mesa: { roleProfiles: { leg: '40x40' } } },
  });
  // o que não foi para o link volta com o padrão
  const back = sanitize(JSON.parse(JSON.stringify(data)));
  assert.deepEqual(back, s);
  assert.equal(back.meterPrices['40x40'], DEFAULTS.meterPrices['40x40']);
});

test('ruleFor acha a regra de cada caminho do estado (limites dos controles)', () => {
  for (const [k, r] of Object.entries(SCHEMA)) if (r.kind !== 'record') assert.equal(ruleFor(k), r, k);
  assert.deepEqual(ruleFor('qty'), SCHEMA.qty);
  assert.equal(ruleFor('meterPrices.20x30'), SCHEMA.meterPrices.value);
  assert.equal(ruleFor('owned.20x30'), SCHEMA.owned.value);
  assert.equal(ruleFor('projects.mesa.length').max, 6000);
  assert.equal(ruleFor('projects.mesa.roleProfiles.leg').kind, 'enum');
  for (const bad of ['foo', 'meterPrices', 'meterPrices.99x99', 'qty.x', 'projects.nada.length', 'projects.mesa.foo', 'projects.mesa.__proto__']) {
    assert.equal(ruleFor(bad), undefined, bad);
  }
});
