export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, pv] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, pv);
        else el.style[p] = pv;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Escapa texto variável antes de ir para innerHTML/template string (conteúdo e atributos)
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmt = (v) => nf.format(v);
export const fmtMoney = (v) => money.format(v);
export const fmtKg = (v) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v)} kg`;

// Rápido "pulso" visual quando um valor muda
export function pulse(el) {
  el.classList.remove('is-pulse');
  void el.offsetWidth;
  el.classList.add('is-pulse');
}

// Anima um número de onde estava até o novo valor
export function countTo(el, to, format = fmt, duration = 450) {
  const from = Number(el.dataset.value ?? to);
  el.dataset.value = to;
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = format(to);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(from + (to - from) * e);
    if (p < 1 && el.dataset.value == to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
