import { CASTERS, PROFILES, TOP_MATERIALS } from '../../model/catalog.js';
import { num, oneOf, bool, record } from '../../state/schema.js';
import { generateCarrinho } from './generate.js';
import { carrinhoSections } from './sections.js';
import { carrinhoSummary } from './summary.js';

const profileIds = PROFILES.map((p) => p.id);
const ROLES = [
  { id: 'post', label: 'Colunas', short: 'colunas' },
  { id: 'frame', label: 'Quadros das bandejas e reforços', short: 'quadros' },
  { id: 'handle', label: 'Alça', short: 'alça', when: (p) => p.handle },
];

/** Carrinho auxiliar: 4 colunas sobre rodízios, bandejas iguais e alça em U opcional. */
export default {
  id: 'carrinho',
  label: 'Carrinho',
  noun: ['carrinho', 'carrinhos'],

  defaults: {
    // medidas finais em mm; a altura vai do chão ao topo da bandeja de cima
    length: 750,
    width: 400,
    height: 850,
    shelves: 3,

    // perfis: um só, ou um por função (roles)
    sameProfile: true,
    profile: '20x30',
    roleProfiles: { post: '30x30', frame: '20x30', handle: '20x20' },
    frameUpright: true,

    // bandejas: quadro de metalon com a placa por cima
    panelMaterial: 'chapa',
    panelThickness: 2,
    braces: 1,

    // rodízios e alça
    caster: '4',
    handle: true,
    handleOut: 120,

    panelPrice: 0, // R$ por placa de bandeja
  },

  schema: {
    length: num(200, 2000),
    width: num(150, 1200),
    height: num(300, 1500),
    shelves: num(1, 6, true),
    sameProfile: bool,
    profile: oneOf(profileIds),
    roleProfiles: record(ROLES.map((r) => r.id), oneOf(profileIds)),
    frameUpright: bool,
    panelMaterial: oneOf(TOP_MATERIALS.map((m) => m.id)),
    panelThickness: num(0, 30),
    braces: num(0, 3, true),
    caster: oneOf(CASTERS.map((c) => c.id)),
    handle: bool,
    handleOut: num(60, 300),
    panelPrice: num(0, 5000),
  },

  roles: ROLES,

  // Ordem = ordem na lista de cortes. `explode`: para onde a peça se afasta na vista explodida.
  groups: {
    coluna: { label: 'Colunas', color: '#ff8a3d', explode: { spread: 1.1, lift: -0.1 } },
    quadro: { label: 'Bandejas', color: '#4fb3ff', explode: { spread: 0.9, lift: 0.4 } },
    reforco: { label: 'Reforços', color: '#c49bff', explode: { spread: 0.6, lift: 0.7 } },
    alca: { label: 'Alça', color: '#5fe0a0', explode: { spread: 1.5, lift: 0.2 } },
  },
  // ordem da animação de montagem ('sapata' são os rodízios e 'placa' as bandejas)
  assembly: ['coluna', 'sapata', 'quadro', 'reforco', 'alca', 'placa'],

  presets: [
    { id: 'oficina', label: 'Oficina', sub: '75×40 · 3', values: { length: 750, width: 400, height: 850, shelves: 3, panelMaterial: 'chapa', panelThickness: 2, caster: '4', handle: true } },
    { id: 'compacto', label: 'Compacto', sub: '60×35 · 2', values: { length: 600, width: 350, height: 750, shelves: 2, panelMaterial: 'chapa', panelThickness: 2, caster: '3', handle: true } },
    { id: 'grande', label: 'Grande', sub: '90×50 · 4', values: { length: 900, width: 500, height: 950, shelves: 4, panelMaterial: 'chapa', panelThickness: 2, caster: '5', handle: true } },
    { id: 'cozinha', label: 'Cozinha', sub: '70×45 · 3', values: { length: 700, width: 450, height: 850, shelves: 3, panelMaterial: 'madeira', panelThickness: 15, caster: '4', handle: true } },
    { id: 'salao', label: 'Salão', sub: '45×35 · 4', values: { length: 450, width: 350, height: 850, shelves: 4, panelMaterial: 'branco', panelThickness: 15, caster: '3', handle: false } },
  ],

  generate: generateCarrinho,

  // placas das bandejas, somadas às linhas genéricas (barras, rodízios, tampas, consumíveis)
  costs(params, model, qty) {
    if (!(params.panelPrice > 0) || !model.panels.length) return [];
    const n = model.panels.length * qty;
    return [{ kind: 'bandeja', label: 'Placas das bandejas', qty: n, unit: params.panelPrice, total: n * params.panelPrice }];
  },

  sections: carrinhoSections,
  summary: carrinhoSummary,
};
