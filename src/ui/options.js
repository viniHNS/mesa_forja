import { PROFILES, CHAPAS, profileLabel } from '../model/catalog.js';
import { fmt } from './dom.js';
import { tubeIcon } from './icons.js';

// Opções e textos comuns a todos os tipos de projeto. As opções próprias de um tipo
// (ex.: montagem da mesa) ficam em src/projects/<id>/options.js.

export const PROFILE_OPTIONS = PROFILES.map((p) => ({ value: p.id, label: profileLabel(p.id), icon: tubeIcon(p.a, p.b) }));

// Texto por extenso de uma opção; valor desconhecido vira '—' em vez de "undefined"
export const optionText = (options, value) => {
  const o = options.find((x) => String(x.value) === String(value));
  return o ? o.long ?? o.label : '—';
};

// profileLabel quebra com valor que não é string (link adulterado): devolve '—'
export const perfilText = (id) => (typeof id === 'string' && id ? profileLabel(id) : '—');

// Chapa do catálogo, ou null se não existir (quem chama omite o texto em vez de "undefined")
export const chapaOf = (id) => CHAPAS.find((c) => c.id === id) ?? null;

// "#18 · 1,2 mm", ou null se a chapa não existir no catálogo
export const chapaText = (id) => {
  const c = chapaOf(id);
  return c ? `#${c.id} · ${fmt(c.mm)} mm` : null;
};

// "mesa"/"mesas" conforme a quantidade, a partir do `noun` do tipo de projeto
export const nounFor = (noun, qty) => (qty > 1 ? noun[1] : noun[0]);
