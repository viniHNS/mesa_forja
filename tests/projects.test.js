import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTS } from '../src/projects/index.js';
import { sanitizeWith } from '../src/state/schema.js';
import { sanitize } from '../src/state/persist.js';
import { derive } from '../src/model/index.js';
import { PROFILES } from '../src/model/catalog.js';

// Contrato de todo tipo de projeto registrado: um tipo novo ganha estes testes de graça.
const REQUIRED = ['id', 'label', 'noun', 'defaults', 'schema', 'roles', 'groups', 'presets', 'generate', 'sections', 'summary'];
const AXES = ['x', 'y', 'z'];

for (const project of PROJECTS) {
  const stateFor = (params) => sanitize({ v: 2, type: project.id, projects: { [project.id]: params } });

  test(`${project.id}: descritor completo`, () => {
    for (const k of REQUIRED) assert.ok(project[k] !== undefined, `falta ${k}`);
    assert.equal(project.noun.length, 2);
    assert.ok(project.roles.length > 0);
    assert.ok(Object.keys(project.groups).length > 0);
    for (const g of Object.values(project.groups)) assert.match(g.color, /^#[0-9a-f]{6}$/i);
  });

  test(`${project.id}: defaults e schema têm as mesmas chaves e os defaults são válidos`, () => {
    assert.deepEqual(Object.keys(project.schema).sort(), Object.keys(project.defaults).sort());
    assert.deepEqual(sanitizeWith(project.schema, project.defaults, project.defaults), project.defaults);
    for (const r of project.roles) assert.ok(PROFILES.some((p) => p.id === project.defaults.roleProfiles?.[r.id]), `perfil padrão de ${r.id}`);
  });

  test(`${project.id}: presets só usam campos válidos`, () => {
    for (const preset of project.presets) {
      const params = { ...project.defaults, ...preset.values };
      for (const k of Object.keys(preset.values)) assert.ok(k in project.schema, `${preset.id}: campo ${k}`);
      assert.deepEqual(sanitizeWith(project.schema, params, project.defaults), params, preset.id);
    }
  });

  const cases = [['padrão', {}], ...project.presets.map((p) => [`preset ${p.id}`, p.values])];
  for (const [name, params] of cases) {
    test(`${project.id}: modelo bem formado (${name})`, () => {
      const d = derive(stateFor(params));
      const { model } = d;
      assert.deepEqual(model.warnings, [], 'sem avisos com valores de fábrica');
      assert.ok(model.pieces.length > 0);
      const keys = new Set();
      for (const p of model.pieces) {
        assert.ok(!keys.has(p.key), `key repetida: ${p.key}`);
        keys.add(p.key);
        assert.ok(p.group in project.groups, `grupo desconhecido: ${p.group}`);
        assert.ok(AXES.includes(p.axis));
        assert.ok(p.length > 0);
        assert.equal(p.start.length, 3);
        assert.equal(p.ends.length, 2);
        for (const e of p.ends) assert.ok([45, 90].includes(e.cut));
        assert.ok(PROFILES.some((x) => x.id === p.profile));
      }
      for (const panel of model.panels) {
        assert.ok(panel.key && panel.size.length === 3 && panel.center.length === 3);
      }
      assert.ok(Array.isArray(model.feet));
      assert.equal(model.bounds.size.length, 3);
      for (const l of model.dimLines) assert.ok(l.from.length === 3 && l.to.length === 3 && Number.isFinite(l.value));
      assert.ok(Number.isFinite(d.costs.total) && d.costs.total > 0);
      const summary = project.summary(d.params, d);
      assert.equal(typeof summary.title, 'string');
      for (const row of summary.rows) assert.equal(row.length, 2);
    });
  }
}
