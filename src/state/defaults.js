import { CHAPAS, DEFAULT_METER_PRICES, FINISHES, PROFILES } from '../model/catalog.js';
import { PROJECTS } from '../projects/index.js';
import { num, oneOf, bool, record } from './schema.js';

// Versão do formato do estado (links e localStorage). Ao mudar o formato, suba a versão e
// acrescente a migração em persist.js.
export const VERSION = 2;

// Estado = tipo atual + parâmetros de cada tipo (projects) + o que é compartilhado entre os
// tipos (quantidade, chapa, barras, preços, acabamento). Os parâmetros de cada tipo vêm do
// `defaults` do seu descritor em src/projects/<id>/index.js.
export const DEFAULTS = {
  v: VERSION,
  type: PROJECTS[0].id,
  projects: Object.fromEntries(PROJECTS.map((p) => [p.id, p.defaults])),

  qty: 1,
  chapa: 18,
  finish: 'preto',
  showPanels: true, // tampo, prateleiras, assento... no 3D

  // barras e corte
  barLength: 2000,
  kerf: 3,
  trim: 5,
  owned: {},

  // custos (R$)
  meterPrices: { ...DEFAULT_METER_PRICES }, // por metro de cada perfil
  feetPrice: 3,
  casterPrice: 25, // rodízio (unidade)
  capPrice: 1.5,
  extras: 40,
};

// Valores aceitos nos campos compartilhados (os de cada tipo ficam no `schema` do tipo).
// persist.js usa isto para validar o que vem de link ou do localStorage, então as faixas
// precisam cobrir tudo o que os controles da sidebar permitem.
const profileIds = PROFILES.map((p) => p.id);

export const SCHEMA = {
  type: oneOf(PROJECTS.map((p) => p.id)),
  qty: num(1, 50, true),
  chapa: oneOf(CHAPAS.map((c) => c.id)),
  finish: oneOf(FINISHES.map((f) => f.id)),
  showPanels: bool,
  barLength: num(500, 6000),
  kerf: num(0, 5),
  trim: num(0, 50),
  owned: record(profileIds, num(0, 99, true)),
  meterPrices: record(profileIds, num(0, 1000)),
  feetPrice: num(0, 200),
  casterPrice: num(0, 500),
  capPrice: num(0, 200),
  extras: num(0, 10000),
};

/**
 * Regra de validação de um caminho do estado, no formato do store: 'qty',
 * 'meterPrices.20x30', 'projects.mesa.length', 'projects.mesa.roleProfiles.leg'.
 * Devolve undefined para caminhos que o schema não conhece.
 */
export function ruleFor(path) {
  let [key, ...rest] = path.split('.');
  let schema = SCHEMA;
  if (key === 'projects') {
    const project = PROJECTS.find((p) => p.id === rest[0]);
    if (!project) return undefined;
    schema = project.schema;
    [key, ...rest] = rest.slice(1);
  }
  const rule = Object.hasOwn(schema, key) ? schema[key] : undefined;
  if (rule?.kind === 'record') return rest.length === 1 && rule.keys.includes(rest[0]) ? rule.value : undefined;
  return rest.length ? undefined : rule;
}
