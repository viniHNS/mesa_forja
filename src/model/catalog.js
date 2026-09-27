// Chapas MSG usuais em metalon (espessura da parede em mm)
export const CHAPAS = [
  { id: 20, mm: 0.9 },
  { id: 18, mm: 1.2 },
  { id: 16, mm: 1.5 },
  { id: 14, mm: 1.9 },
];

// a = lado menor, b = lado maior (mm)
export const PROFILES = [
  { id: '20x20', a: 20, b: 20 },
  { id: '20x30', a: 20, b: 30 },
  { id: '30x30', a: 30, b: 30 },
  { id: '20x40', a: 20, b: 40 },
  { id: '30x40', a: 30, b: 40 },
  { id: '40x40', a: 40, b: 40 },
  { id: '30x50', a: 30, b: 50 },
  { id: '50x50', a: 50, b: 50 },
];

// Preço de referência por barra de 2 m, chapa 18 (editável na interface)
export const DEFAULT_PRICES = {
  '20x20': 22,
  '20x30': 27,
  '30x30': 33,
  '20x40': 33,
  '30x40': 40,
  '40x40': 46,
  '30x50': 50,
  '50x50': 58,
};

const STEEL_DENSITY = 7.85e-6; // kg/mm³

export const getProfile = (id) => PROFILES.find((p) => p.id === id) ?? PROFILES[1];
export const isRect = (id) => {
  const p = getProfile(id);
  return p.a !== p.b;
};
export const profileLabel = (id) => id.replace('x', '×');
export const wallOf = (chapa) => (CHAPAS.find((c) => c.id === chapa) ?? CHAPAS[1]).mm;

export function kgPerMeter(profileId, chapa) {
  const { a, b } = getProfile(profileId);
  const t = wallOf(chapa);
  const area = a * b - (a - 2 * t) * (b - 2 * t); // mm²
  return area * 1000 * STEEL_DENSITY;
}

export const FINISHES = [
  { id: 'preto', label: 'Preto fosco', color: '#1d1e21', metalness: 0.35, roughness: 0.55 },
  { id: 'grafite', label: 'Grafite', color: '#4b4f55', metalness: 0.6, roughness: 0.42 },
  { id: 'branco', label: 'Branco', color: '#e8e6e1', metalness: 0.1, roughness: 0.45 },
  { id: 'aco', label: 'Aço bruto', color: '#a9adb2', metalness: 1, roughness: 0.32 },
  { id: 'cobre', label: 'Cobre', color: '#b8733a', metalness: 1, roughness: 0.3 },
];

export const TOP_MATERIALS = [
  { id: 'madeira', label: 'Madeira', swatch: 'repeating-linear-gradient(8deg,#9a6a3f 0 3px,#7f5330 3px 5px,#a8764a 5px 9px)' },
  { id: 'branco', label: 'MDF branco', swatch: '#f1eee7' },
  { id: 'preto', label: 'MDF preto', swatch: '#232325' },
  { id: 'vidro', label: 'Vidro', swatch: 'linear-gradient(135deg,#e2f4ef,#8fbfb3 60%,#cfe9e2)' },
];

export const BAR_PRESETS = [1000, 1500, 2000, 3000, 6000];

export const TABLE_PRESETS = [
  { id: 'jantar4', label: 'Jantar 4', sub: '120×80', values: { length: 1200, width: 800, height: 750, stretcher: 'nenhuma', braces: 1, overhang: 30 } },
  { id: 'jantar6', label: 'Jantar 6', sub: '160×90', values: { length: 1600, width: 900, height: 750, stretcher: 'nenhuma', braces: 2, overhang: 40 } },
  { id: 'escrivaninha', label: 'Escrivaninha', sub: '120×60', values: { length: 1200, width: 600, height: 750, stretcher: 'u', stretcherHeight: 150, braces: 1, overhang: 20 } },
  { id: 'bancada', label: 'Bancada', sub: '150×60', values: { length: 1500, width: 600, height: 900, stretcher: 'perimetral', stretcherHeight: 150, braces: 2, overhang: 20 } },
  { id: 'bistro', label: 'Bistrô', sub: '70×70', values: { length: 700, width: 700, height: 1050, stretcher: 'perimetral', stretcherHeight: 300, braces: 0, overhang: 40 } },
  { id: 'centro', label: 'Centro', sub: '100×50', values: { length: 1000, width: 500, height: 420, stretcher: 'nenhuma', braces: 0, overhang: 20 } },
];

export const GROUPS = {
  perna: { label: 'Pernas', color: '#ff8a3d' },
  quadro: { label: 'Quadro', color: '#4fb3ff' },
  reforco: { label: 'Reforços', color: '#c49bff' },
  travessa: { label: 'Travessas', color: '#5fe0a0' },
};
export const GROUP_ORDER = ['perna', 'quadro', 'reforco', 'travessa'];
