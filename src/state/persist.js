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

export function loadState() {
  const hash = location.hash.replace(/^#/, '');
  if (hash.startsWith('m=')) {
    try {
      return sanitize(decode(hash.slice(2)));
    } catch {
      /* link inválido: segue para o armazenamento local */
    }
  }
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return sanitize(JSON.parse(saved));
  } catch {
    /* armazenamento indisponível */
  }
  return { ...DEFAULTS };
}

export function saveState(state) {
  const d = diff(state);
  const hash = Object.keys(d).length ? `#m=${encode(d)}` : '';
  history.replaceState(null, '', location.pathname + location.search + hash);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d));
  } catch {
    /* ignora */
  }
}

export const shareUrl = () => location.href;
