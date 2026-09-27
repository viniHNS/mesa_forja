import { h, fmt, pulse } from './dom.js';
import { getIn } from '../state/store.js';

const val = (v, s) => (typeof v === 'function' ? v(s) : v);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Aceita "1.200", "1200", "2,5" e "2.5"
function parseNum(str) {
  const s = String(str).trim().replace(/\s|R\$/g, '');
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return parseFloat(s.replace(/\./g, ''));
  return parseFloat(s);
}

// Visor LCD editável
function lcdInput({ unit, onCommit, onStep, prefix }) {
  const input = h('input', { class: 'lcd-input', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' });
  const el = h('div', { class: 'lcd' }, prefix && h('span', { class: 'lcd-unit lcd-prefix' }, prefix), input, unit && h('span', { class: 'lcd-unit' }, unit));
  input.addEventListener('focus', () => input.select());
  input.addEventListener('change', () => onCommit(parseNum(input.value)));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onStep?.(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey ? 10 : 1);
    }
  });
  let last;
  return {
    el,
    input,
    show(v, format = fmt) {
      if (document.activeElement !== input) input.value = format(v);
      if (last !== undefined && last !== v) pulse(el);
      last = v;
    },
  };
}

export function slider(store, { label, path, min, max, hardMax, step = 1, unit = 'mm', hint }) {
  const range = h('input', { type: 'range', class: 'knob-range', step, 'aria-label': label });
  let lim = { min: 0, max: 1, hard: 1 };
  const commit = (v) => {
    if (Number.isNaN(v)) v = getIn(store.get(), path);
    v = clamp(Math.round(v / step) * step, lim.min, lim.hard);
    store.set(path, v);
    lcd.show(v);
  };
  const lcd = lcdInput({
    unit,
    onCommit: commit,
    onStep: (dir, mul) => commit(getIn(store.get(), path) + dir * step * mul),
  });
  range.addEventListener('input', () => store.set(path, Number(range.value)));
  const el = h(
    'div',
    { class: 'ctl ctl-slider' },
    h('div', { class: 'ctl-row' }, h('label', { class: 'ctl-label' }, label), lcd.el),
    h('div', { class: 'groove' }, range),
    hint && h('p', { class: 'ctl-hint' }, hint),
  );
  return {
    el,
    update(s) {
      lim = { min: val(min, s), max: val(max, s) };
      lim.hard = Math.max(lim.max, val(hardMax, s) ?? lim.max);
      range.min = lim.min;
      range.max = lim.max;
      const v = getIn(s, path);
      if (Number(range.value) !== v) range.value = v;
      const p = ((clamp(v, lim.min, lim.max) - lim.min) / (lim.max - lim.min || 1)) * 100;
      range.style.setProperty('--p', `${p}%`);
      lcd.show(v);
    },
  };
}

export function stepper(store, { label, path, min = 0, max = 99, step = 1, unit, hint, format = fmt, prefix }) {
  const get = () => getIn(store.get(), path) ?? 0;
  const commit = (v) => {
    if (Number.isNaN(v)) v = get();
    store.set(path, clamp(Math.round(v / step) * step, min, max));
    lcd.show(get(), format);
  };
  const lcd = lcdInput({ unit, prefix, onCommit: commit, onStep: (d, m) => commit(get() + d * step * m) });
  const btn = (dir, text) => {
    const b = h('button', { type: 'button', class: 'key key-sq', 'aria-label': dir > 0 ? 'Aumentar' : 'Diminuir' }, text);
    let timer;
    const stop = () => clearInterval(timer);
    b.addEventListener('pointerdown', () => {
      commit(get() + dir * step);
      stop();
      const t0 = Date.now();
      timer = setInterval(() => Date.now() - t0 > 380 && commit(get() + dir * step), 70);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    return b;
  };
  const el = h(
    'div',
    { class: 'ctl ctl-stepper' },
    h('label', { class: 'ctl-label' }, label),
    h('div', { class: 'stepper' }, btn(-1, '−'), lcd.el, btn(1, '+')),
    hint && h('p', { class: 'ctl-hint' }, hint),
  );
  return { el, update: (s) => lcd.show(getIn(s, path) ?? 0, format) };
}

export function segmented(store, { label, path, options, cols, className = '' }) {
  const keys = options.map((o) =>
    h(
      'button',
      { type: 'button', class: 'key', 'data-v': String(o.value), onclick: () => store.set(path, o.value), title: o.title },
      o.icon && h('span', { class: 'key-icon', html: o.icon }),
      h('span', { class: 'key-text' }, o.label, o.sub && h('small', {}, o.sub)),
      h('span', { class: 'key-led' }),
    ),
  );
  const el = h(
    'div',
    { class: `ctl ctl-seg ${className}` },
    label && h('span', { class: 'ctl-label' }, label),
    h('div', { class: 'keys', role: 'group', style: { '--cols': cols ?? options.length } }, keys),
  );
  return {
    el,
    update(s) {
      const v = String(getIn(s, path));
      keys.forEach((k) => {
        const on = k.dataset.v === v;
        k.classList.toggle('is-on', on);
        k.setAttribute('aria-pressed', on);
      });
    },
  };
}

export function toggle(store, { label, path, hint }) {
  const sw = h(
    'button',
    { type: 'button', class: 'switch', role: 'switch', 'aria-label': label, onclick: () => store.set(path, !getIn(store.get(), path)) },
    h('span', { class: 'switch-track' }, h('span', { class: 'switch-knob' })),
  );
  const el = h(
    'div',
    { class: 'ctl ctl-toggle' },
    h('div', { class: 'ctl-row' }, h('span', { class: 'led' }), h('label', { class: 'ctl-label' }, label), sw),
    hint && h('p', { class: 'ctl-hint' }, hint),
  );
  return {
    el,
    update(s) {
      const on = Boolean(getIn(s, path));
      el.classList.toggle('is-on', on);
      sw.setAttribute('aria-checked', on);
    },
  };
}

export function swatches(store, { label, path, options }) {
  const btns = options.map((o) =>
    h(
      'button',
      { type: 'button', class: 'swatch', 'data-v': o.id, title: o.label, 'aria-label': o.label, onclick: () => store.set(path, o.id) },
      h('span', { class: 'swatch-dot', style: { background: o.swatch ?? o.color } }),
      h('span', { class: 'swatch-label' }, o.label),
    ),
  );
  const el = h('div', { class: 'ctl ctl-swatches' }, h('span', { class: 'ctl-label' }, label), h('div', { class: 'swatches' }, btns));
  return {
    el,
    update(s) {
      const v = getIn(s, path);
      btns.forEach((b) => b.classList.toggle('is-on', b.dataset.v === v));
    },
  };
}

export function note(fn) {
  const el = h('p', { class: 'ctl-note' });
  let last = '';
  return {
    el,
    update(s, d) {
      const text = fn(s, d);
      if (text === last) return;
      last = text;
      el.innerHTML = text;
      pulse(el);
    },
  };
}

// Lista dinâmica: recria os controles filhos quando a "assinatura" muda
export function dynamic(signature, build) {
  const el = h('div', { class: 'ctl-dynamic' });
  let sig = null;
  let children = [];
  return {
    el,
    update(s, d) {
      const next = signature(s, d);
      if (next !== sig) {
        sig = next;
        children = build(s, d);
        el.replaceChildren(...children.map((c) => c.el));
      }
      children.forEach((c) => c.update(s, d));
    },
  };
}
