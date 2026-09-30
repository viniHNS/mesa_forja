import { PROFILES, TOP_MATERIALS } from '../../model/catalog.js';
import { num, oneOf, bool, record } from '../../state/schema.js';
import { generateMesa } from './generate.js';
import { mesaSections } from './sections.js';
import { mesaSummary } from './summary.js';
import { ASSEMBLY_OPTIONS, CORNER_OPTIONS, THROUGH_OPTIONS, STRETCHER_OPTIONS, values } from './options.js';

const profileIds = PROFILES.map((p) => p.id);
const ROLES = [
  { id: 'leg', label: 'Pernas', short: 'pernas' },
  { id: 'frame', label: 'Quadro e reforços', short: 'quadro' },
  { id: 'stretcher', label: 'Travessas inferiores', short: 'travessas', when: (p) => p.stretcher !== 'nenhuma' },
];

/** Mesa de 4 pés: pernas, quadro sob o tampo, reforços e travessas inferiores opcionais. */
export default {
  id: 'mesa',
  label: 'Mesa 4 pés',
  noun: ['mesa', 'mesas'],

  defaults: {
    // medidas finais da mesa (tampo) em mm
    length: 1200,
    width: 800,
    height: 750,

    // perfis: um só, ou um por função (roles)
    sameProfile: true,
    profile: '20x30',
    roleProfiles: { leg: '30x30', frame: '20x30', stretcher: '20x20' },
    frameUpright: true,
    legRotate: false,

    // montagem e união
    assembly: 'sob', // 'sob' = quadro sobre as pernas | 'passante' = pernas até o tampo
    corner: '45', // '45' | 'reto'
    through: 'comprimento', // no canto reto, qual lado passa inteiro
    braces: 1,
    stretcher: 'nenhuma', // nenhuma | laterais | u | h | perimetral
    stretcherHeight: 150,

    // tampo
    topThickness: 25,
    overhang: 30,
    topMaterial: 'madeira',
    topPrice: 0, // R$ por mesa
  },

  schema: {
    length: num(100, 6000),
    width: num(100, 3000),
    height: num(100, 1500),
    sameProfile: bool,
    profile: oneOf(profileIds),
    roleProfiles: record(ROLES.map((r) => r.id), oneOf(profileIds)),
    frameUpright: bool,
    legRotate: bool,
    assembly: oneOf(values(ASSEMBLY_OPTIONS)),
    corner: oneOf(values(CORNER_OPTIONS)),
    through: oneOf(values(THROUGH_OPTIONS)),
    braces: num(0, 8, true),
    stretcher: oneOf(values(STRETCHER_OPTIONS)),
    stretcherHeight: num(0, 1500),
    topThickness: num(0, 60),
    overhang: num(0, 150),
    topMaterial: oneOf(TOP_MATERIALS.map((m) => m.id)),
    topPrice: num(0, 20000),
  },

  roles: ROLES,

  // Ordem = ordem na lista de cortes. `explode`: para onde a peça se afasta na vista
  // explodida (spread = fator para fora, lift = componente vertical).
  groups: {
    perna: { label: 'Pernas', color: '#ff8a3d', explode: { spread: 1.1, lift: -0.15 } },
    quadro: { label: 'Quadro', color: '#4fb3ff', explode: { spread: 1, lift: 0.7 } },
    reforco: { label: 'Reforços', color: '#c49bff', explode: { spread: 1, lift: 1.1 } },
    travessa: { label: 'Travessas', color: '#5fe0a0', explode: { spread: 0.8, lift: 0.1 } },
  },
  // ordem da animação de montagem ('sapata' e 'placa' são os pés e as placas do modelo)
  assembly: ['perna', 'sapata', 'travessa', 'quadro', 'reforco', 'placa'],

  presets: [
    { id: 'jantar4', label: 'Jantar 4', sub: '120×80', values: { length: 1200, width: 800, height: 750, stretcher: 'nenhuma', braces: 1, overhang: 30 } },
    { id: 'jantar6', label: 'Jantar 6', sub: '160×90', values: { length: 1600, width: 900, height: 750, stretcher: 'nenhuma', braces: 2, overhang: 40 } },
    { id: 'escrivaninha', label: 'Escrivaninha', sub: '120×60', values: { length: 1200, width: 600, height: 750, stretcher: 'u', stretcherHeight: 150, braces: 1, overhang: 20 } },
    { id: 'bancada', label: 'Bancada', sub: '150×60', values: { length: 1500, width: 600, height: 900, stretcher: 'perimetral', stretcherHeight: 150, braces: 2, overhang: 20 } },
    { id: 'bistro', label: 'Bistrô', sub: '70×70', values: { length: 700, width: 700, height: 1050, stretcher: 'perimetral', stretcherHeight: 300, braces: 0, overhang: 40 } },
    { id: 'centro', label: 'Centro', sub: '100×50', values: { length: 1000, width: 500, height: 420, stretcher: 'nenhuma', braces: 0, overhang: 20 } },
  ],

  generate: generateMesa,

  // linhas extras de custo, somadas às genéricas (barras, sapatas, tampas, consumíveis)
  costs(params, model, qty) {
    if (!(params.topPrice > 0)) return [];
    return [{ kind: 'tampo', label: 'Tampo', qty, unit: params.topPrice, total: qty * params.topPrice }];
  },

  sections: mesaSections,
  summary: mesaSummary,
};
