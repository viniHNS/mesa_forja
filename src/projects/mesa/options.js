import { ICONS } from '../../ui/icons.js';

// Opções de montagem da mesa, usadas pela barra lateral (label/sub) e pelo PDF (long).
// Ficam num lugar só para os textos não divergirem.
export const ASSEMBLY_OPTIONS = [
  { value: 'sob', label: 'Quadro sobre as pernas', icon: ICONS.sob },
  { value: 'passante', label: 'Pernas até o tampo', icon: ICONS.passante },
];

export const CORNER_OPTIONS = [
  { value: '45', label: '45° (meia-esquadria)', long: 'Meia-esquadria 45°', icon: ICONS.m45 },
  { value: 'reto', label: 'Reto (topo)', icon: ICONS.reto },
];

export const THROUGH_OPTIONS = [
  { value: 'comprimento', label: 'Comprimento', icon: ICONS.compr },
  { value: 'largura', label: 'Largura', icon: ICONS.larg },
];

export const STRETCHER_OPTIONS = [
  { value: 'nenhuma', label: 'Sem', long: 'Sem travessa', icon: ICONS.nenhuma },
  { value: 'laterais', label: 'Laterais', icon: ICONS.laterais },
  { value: 'u', label: 'U', long: 'Em U (laterais + fundo)', icon: ICONS.u, title: 'Laterais + fundo: deixa a frente livre (escrivaninha)' },
  { value: 'h', label: 'H', long: 'Em H', icon: ICONS.h },
  { value: 'perimetral', label: 'Perímetro', icon: ICONS.perimetral },
];

export const values = (options) => options.map((o) => o.value);
