import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitize } from '../src/state/persist.js';
import { derive } from '../src/model/index.js';
import { CASES, project } from './fixtures/cases.js';

// Estados no formato antigo (v1), migrados, precisam dar exatamente o resultado gravado em
// fixtures/mesa-v1.json antes da modularização. Mudança intencional no cálculo: regrave com
// `node tests/fixtures/make-snapshot.js` e revise o diff do JSON.
const snapshot = JSON.parse(readFileSync(new URL('./fixtures/mesa-v1.json', import.meta.url), 'utf8'));

for (const [name, raw] of Object.entries(CASES)) {
  test(`regressão da mesa: ${name}`, () => {
    const got = JSON.parse(JSON.stringify(project(derive(sanitize(raw)))));
    assert.deepEqual(got, snapshot[name]);
  });
}
