export const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

function setIn(obj, [key, ...rest], value) {
  const copy = { ...obj };
  copy[key] = rest.length ? setIn(obj[key] ?? {}, rest, value) : value;
  return copy;
}

// `rule(path)`: regra do schema daquele caminho (ou undefined). Os controles da sidebar
// tiram dela os limites, para não repetir as faixas que a validação já conhece.
export function createStore(initial, { rule = () => undefined } = {}) {
  let state = initial;
  const subs = new Set();
  const emit = () => subs.forEach((fn) => fn(state));
  return {
    get: () => state,
    rule,
    set(path, value) {
      if (getIn(state, path) === value) return;
      state = setIn(state, path.split('.'), value);
      emit();
    },
    merge(patch) {
      state = { ...state, ...patch };
      emit();
    },
    replace(next) {
      state = next;
      emit();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
