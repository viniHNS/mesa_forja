// Mini diagramas técnicos (traço em currentColor)
const svg = (body, vb = '0 0 44 30') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const legs = '<rect x="5" y="4" width="5" height="5" fill="currentColor" stroke="none"/><rect x="34" y="4" width="5" height="5" fill="currentColor" stroke="none"/><rect x="5" y="21" width="5" height="5" fill="currentColor" stroke="none"/><rect x="34" y="21" width="5" height="5" fill="currentColor" stroke="none"/>';
const L = '<path d="M7.5 9v12"/>';
const R = '<path d="M36.5 9v12"/>';
const B = '<path d="M10 6.5h24"/>';
const F = '<path d="M10 23.5h24"/>';
const C = '<path d="M7.5 15h29"/>';

export const ICONS = {
  nenhuma: svg(legs),
  laterais: svg(legs + L + R),
  u: svg(legs + L + R + B),
  h: svg(legs + L + R + C),
  perimetral: svg(legs + L + R + B + F),

  sob: svg('<rect x="3" y="5" width="38" height="5" rx="1"/><path d="M6 10v16M38 10v16"/>'),
  passante: svg('<path d="M5 5v21M39 5v21"/><rect x="8" y="5" width="28" height="5" rx="1"/>'),

  m45: svg('<path d="M6 25V6h32"/><path d="M13 25V13h25"/><path d="M6 6l7 7" stroke-dasharray="2 2"/>'),
  reto: svg('<path d="M6 25V6h32"/><path d="M13 25V13h25"/><path d="M6 13h7"/>'),

  compr: svg('<rect x="4" y="6" width="36" height="18" rx="1"/><path d="M4 6h36M4 24h36" stroke-width="4"/>'),
  larg: svg('<rect x="4" y="6" width="36" height="18" rx="1"/><path d="M4 6v18M40 6v18" stroke-width="4"/>'),

  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>',
};

export const tubeIcon = (a, b) => {
  const k = 16 / Math.max(a, b);
  return `<span class="tube-icon" style="--w:${Math.round(b * k)}px;--h:${Math.round(a * k)}px"></span>`;
};
