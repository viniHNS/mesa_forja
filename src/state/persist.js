import { DEFAULTS } from './defaults.js';

const LS_KEY = 'mesaforja:state';

// Só guarda o que difere do padrão: links mais curtos e padrões novos chegam para todos.
function diff(state) {
  const out = {};
  for (const k of Object.keys(state)) {
    if (JSON.stringify(state[k]) !== JSON.stringify(DEFAULTS[k])) out[k] = state[k];
  }
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

function sanitize(raw) {
  const s = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return s;
  for (const k of Object.keys(DEFAULTS)) {
    if (!(k in raw)) continue;
    const def = DEFAULTS[k];
    const v = raw[k];
    if (typeof def === 'object' && def !== null) {
      if (v && typeof v === 'object') s[k] = { ...def, ...v };
    } else if (typeof v === typeof def) {
      s[k] = v;
    }
  }
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

export const sameProject = (a, b) => JSON.stringify(diff(a)) === JSON.stringify(diff(b));

/**
 * Grava o projeto na URL e, se `local`, também no navegador. Um projeto aberto por link
 * não passa `local` até o visitante editá-lo: senão abrir o link de outra pessoa apagaria
 * o projeto que ele tinha salvo.
 *
 * replaceState não dispara `hashchange`, então esta escrita nunca é confundida com um
 * link novo colado na barra de endereço.
 */
export function saveState(state, { local = true } = {}) {
  const d = diff(state);
  const hash = Object.keys(d).length ? `#m=${encode(d)}` : '';
  history.replaceState(null, '', location.pathname + location.search + hash);
  if (!local) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {
    /* ignora */
  }
}
