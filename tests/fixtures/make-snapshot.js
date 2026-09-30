// Gera tests/fixtures/mesa-v1.json a partir do cálculo atual. Rodar só quando uma mudança
// no resultado for intencional: `node tests/fixtures/make-snapshot.js`.
import { writeFileSync } from 'node:fs';
import { sanitize } from '../../src/state/persist.js';
import { derive } from '../../src/model/index.js';
import { CASES, project } from './cases.js';

const out = {};
for (const [name, raw] of Object.entries(CASES)) out[name] = project(derive(sanitize(raw)));
writeFileSync(new URL('./mesa-v1.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(out).length} casos gravados`);
