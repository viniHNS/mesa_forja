import { DEFAULT_PRICES } from '../model/catalog.js';

export const DEFAULTS = {
  // medidas finais da mesa (tampo) em mm
  length: 1200,
  width: 800,
  height: 750,
  qty: 1,

  // perfil
  chapa: 18,
  sameProfile: true,
  profile: '20x30',
  frameProfile: '20x30',
  legProfile: '30x30',
  stretcherProfile: '20x20',
  frameUpright: true,
  legRotate: false,

  // montagem e união
  assembly: 'sob', // 'sob' = quadro sobre as pernas | 'passante' = pernas até o tampo
  corner: '45', // '45' | 'reto'
  through: 'comprimento', // no canto reto, qual lado passa inteiro
  braces: 1,
  stretcher: 'nenhuma', // nenhuma | laterais | u | h | perimetral
  stretcherHeight: 150,

  // tampo
  showTop: true,
  topThickness: 25,
  overhang: 30,
  topMaterial: 'madeira',

  // acabamento
  finish: 'preto',

  // barras e corte
  barLength: 2000,
  kerf: 3,
  trim: 5,
  owned: {},

  // custos (R$)
  prices: { ...DEFAULT_PRICES },
  feetPrice: 3,
  capPrice: 1.5,
  extras: 40,
  topPrice: 0,
};
