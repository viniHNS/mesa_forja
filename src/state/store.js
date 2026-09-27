export const getIn = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

function setIn(obj, [key, ...rest], value) {
  const copy = { ...obj };
  copy[key] = rest.length ? setIn(obj[key] ?? {}, rest, value) : value;
  return copy;
}

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  const emit = () => subs.forEach((fn) => fn(state));
  return {
    get: () => state,
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
