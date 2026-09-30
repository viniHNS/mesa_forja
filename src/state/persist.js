import { DEFAULTS, SCHEMA, VERSION } from './defaults.js';
import { check, isPlainObject, sanitizeWith } from './schema.js';
import { PROJECTS, getProject } from '../projects/index.js';

const LS_KEY = 'mesaforja:state';

const differs = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

// O que em `value` difere de `base`, só nas `keys` (as do schema). Objetos (roleProfiles,
// meterPrices, owned) entram só com os itens que mudaram: sanitize completa o resto com o
// padrão. Devolve undefined quando não há diferença.
function delta(value, base, keys = Object.keys(value)) {
  const d = {};
  for (const k of keys) {
    if (isPlainObject(value[k]) && isPlainObject(base[k])) {
      const sub = delta(value[k], base[k]);
      if (sub) d[k] = sub;
    } else if (differs(value[k], base[k])) d[k] = value[k];
  }
  return Object.keys(d).length ? d : undefined;
}

// Só guarda o que difere do padrão: links mais curtos e padrões novos chegam para todos.
// `all`: todos os tipos (localStorage, cada tipo lembra as próprias medidas); senão só o
// tipo atual (link: quem recebe não precisa dos outros projetos de quem mandou).
function diff(state, { all }) {
  const out = { v: VERSION, ...delta(state, DEFAULTS, Object.keys(SCHEMA)) };
  const projects = {};
  for (const p of all ? PROJECTS : [getProject(state.type)]) {
    const d = delta(state.projects[p.id], p.defaults, Object.keys(p.defaults));
    if (d) projects[p.id] = d;
  }
  if (Object.keys(projects).length) out.projects = projects;
  return out;
}

const encode = (obj) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

function decode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

// ---- Migrações: MIGRATIONS[n] leva um estado da versão n para a n + 1.
// Dados sem `v` são da versão 1 (antes dos tipos de projeto).

const MESA_V1 = [
  'length', 'width', 'height', 'sameProfile', 'profile', 'frameUpright', 'legRotate', 'assembly', 'corner',
  'through', 'braces', 'stretcher', 'stretcherHeight', 'topThickness', 'overhang', 'topMaterial', 'topPrice',
];
const ROLES_V1 = { leg: 'legProfile', frame: 'frameProfile', stretcher: 'stretcherProfile' };
const SHARED_V1 = ['qty', 'chapa', 'finish', 'barLength', 'kerf', 'trim', 'owned', 'meterPrices', 'feetPrice', 'capPrice', 'extras'];

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(obj, k)).map((k) => [k, obj[k]]));

const MIGRATIONS = {
  // v1: tudo solto (só existia a mesa) → v2: type + projects.mesa + compartilhado
  1(raw) {
    const mesa = pick(raw, MESA_V1);
    const roleProfiles = {};
    for (const [role, old] of Object.entries(ROLES_V1)) if (Object.hasOwn(raw, old)) roleProfiles[role] = raw[old];
    if (Object.keys(roleProfiles).length) mesa.roleProfiles = roleProfiles;

    const out = { v: 2, type: 'mesa', projects: { mesa }, ...pick(raw, SHARED_V1) };
    if (Object.hasOwn(raw, 'showTop')) out.showPanels = raw.showTop;

    // antes do preço por metro, `prices` era o preço por barra
    if (isPlainObject(raw.prices) && !Object.hasOwn(raw, 'meterPrices')) {
      const bar = check(SCHEMA.barLength, raw.barLength) ?? DEFAULTS.barLength;
      out.meterPrices = {};
      for (const [id, price] of Object.entries(raw.prices)) {
        if (typeof price === 'number') out.meterPrices[id] = Math.round((price / (bar / 1000)) * 100) / 100;
      }
    }
    return out;
  },
};

function migrate(raw) {
  let v = Number.isInteger(raw.v) ? raw.v : 1;
  while (v < VERSION && MIGRATIONS[v]) raw = MIGRATIONS[v++](raw);
  return raw;
}

/**
 * Tudo que vem de fora (link, localStorage) passa por aqui: migra formatos antigos, descarta
 * campos desconhecidos e exige que cada valor obedeça ao SCHEMA (compartilhado) ou ao
 * `schema` do tipo. Isso também protege os innerHTML, que confiam que perfil, chapa e afins
 * são sempre valores do catálogo.
 */
export function sanitize(raw) {
  raw = migrate(isPlainObject(raw) ? raw : {});
  const s = sanitizeWith(SCHEMA, raw, DEFAULTS);
  s.v = VERSION;
  const projects = isPlainObject(raw.projects) ? raw.projects : {};
  s.projects = Object.fromEntries(
    PROJECTS.map((p) => [p.id, sanitizeWith(p.schema, Object.hasOwn(projects, p.id) ? projects[p.id] : null, p.defaults)]),
  );
  return s;
}

/** Projeto que está no link (#m=...), ou null se não há link válido. */
export function readLink() {
  const hash = location.hash.replace(/^#/, '');
  if (!hash.startsWith('m=')) return null;
  try {
    return sanitize(decode(hash.slice(2)));
  } catch {
    return null; // link quebrado
  }
}

/** Último projeto salvo neste navegador, ou null se nunca salvou. */
export function readLocal() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? sanitize(JSON.parse(saved)) : null;
  } catch {
    return null; // armazenamento indisponível
  }
}

/** Estado inicial e de onde ele veio: 'link', 'local' ou 'default'. */
export function loadState() {
  const link = readLink();
  if (link) return { state: link, source: 'link' };
  const local = readLocal();
  return local ? { state: local, source: 'local' } : { state: sanitize(null), source: 'default' };
}

/** O que vai no link (para comparar projetos e para os testes). */
export const linkData = (state) => diff(state, { all: false });

export const sameProject = (a, b) => JSON.stringify(linkData(a)) === JSON.stringify(linkData(b));

/**
 * Grava o projeto na URL e, se `local`, também no navegador. Um projeto aberto por link
 * não passa `local` até o visitante editá-lo: senão abrir o link de outra pessoa apagaria
 * o projeto que ele tinha salvo.
 *
 * replaceState não dispara `hashchange`, então esta escrita nunca é confundida com um
 * link novo colado na barra de endereço.
 */
export function saveState(state, { local = true } = {}) {
  const d = linkData(state);
  // só a versão = projeto padrão: URL limpa
  const hash = Object.keys(d).length > 1 ? `#m=${encode(d)}` : '';
  history.replaceState(null, '', location.pathname + location.search + hash);
  if (!local) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(diff(state, { all: true })));
  } catch {
    /* ignora */
  }
}
