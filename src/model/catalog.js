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

// Preço de referência por metro, chapa 18 (editável na interface). O custo de cada barra é
// preço/m × tamanho da barra, então trocar o tamanho da barra não exige rever os preços.
export const DEFAULT_METER_PRICES = {
  '20x20': 11,
  '20x30': 13.5,
  '30x30': 16.5,
  '20x40': 16.5,
  '30x40': 20,
  '40x40': 23,
  '30x50': 25,
  '50x50': 29,
};

const STEEL_DENSITY = 7.85e-6; // kg/mm³

export const getProfile = (id) => PROFILES.find((p) => p.id === id) ?? PROFILES[1];
export const isRect = (id) => {
  const p = getProfile(id);
  return p.a !== p.b;
};
export const profileLabel = (id) => String(id).replace('x', '×');
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
  // no 3D a chapa leva a mesma pintura do metalon
  { id: 'chapa', label: 'Chapa de aço', swatch: 'linear-gradient(135deg,#8d9197,#5d6168 55%,#a3a7ad)' },
];

// Rodízios por diâmetro nominal da roda. d = diâmetro da roda, w = largura da roda,
// h = altura do chão até o topo da placa (soma na altura do projeto), plate = lado da placa.
export const CASTERS = [
  { id: '3', label: '3"', d: 75, w: 24, h: 100, plate: 60 },
  { id: '4', label: '4"', d: 100, w: 28, h: 128, plate: 70 },
  { id: '5', label: '5"', d: 125, w: 32, h: 155, plate: 80 },
];
export const getCaster = (id) => CASTERS.find((c) => c.id === id) ?? CASTERS[1];

export const BAR_PRESETS = [1000, 1500, 2000, 3000, 6000];

// Presets, grupos de peças (cores) e opções de montagem são de cada tipo de projeto:
// ficam em src/projects/<id>/.
