// Regras de validação do estado. Usadas pelo estado compartilhado (defaults.js) e pelo
// `schema` de cada tipo de projeto (src/projects/<id>/index.js).
//
//   num(min, max, int?)  número finito; fora da faixa é trazido para dentro
//   oneOf([...])         precisa ser um dos valores
//   bool                 true/false
//   record(keys, rule)   objeto com só essas chaves, cada valor validado por `rule`

export const num = (min, max, int = false) => ({ kind: 'number', min, max, int });
export const oneOf = (values) => ({ kind: 'enum', values });
export const bool = { kind: 'bool' };
export const record = (keys, value) => ({ kind: 'record', keys, value });

export const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// Devolve o valor válido para a regra, ou undefined se não dá para aproveitar.
export function check(rule, v) {
  switch (rule.kind) {
    case 'number': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      const n = rule.int ? Math.round(v) : v;
      return Math.min(rule.max, Math.max(rule.min, n));
    }
    case 'enum':
      return rule.values.includes(v) ? v : undefined;
    case 'bool':
      return typeof v === 'boolean' ? v : undefined;
    default:
      return undefined;
  }
}

/**
 * Copia de `raw` só o que o `schema` aceita, por cima dos `defaults`. Chaves desconhecidas
 * (inclusive __proto__) são ignoradas porque só as chaves do schema são lidas.
 */
export function sanitizeWith(schema, raw, defaults) {
  const s = { ...defaults };
  if (!isPlainObject(raw)) return s;
  for (const [k, rule] of Object.entries(schema)) {
    if (!Object.hasOwn(raw, k)) continue;
    const v = raw[k];
    if (rule.kind === 'record') {
      if (!isPlainObject(v)) continue;
      const out = { ...defaults[k] };
      for (const key of rule.keys) {
        if (!Object.hasOwn(v, key)) continue;
        const ok = check(rule.value, v[key]);
        if (ok !== undefined) out[key] = ok;
      }
      s[k] = out;
    } else {
      const ok = check(rule, v);
      if (ok !== undefined) s[k] = ok;
    }
  }
  return s;
}
