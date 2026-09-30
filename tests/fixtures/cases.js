// Estados no formato antigo (v1, campos soltos) usados no teste de regressão da
// modularização: migrados para o formato novo, precisam gerar exatamente o mesmo resultado.
import mesa from '../../src/projects/mesa/index.js';

export const CASES = {
  padrao: {},
  ...Object.fromEntries(mesa.presets.map((p) => [`preset-${p.id}`, p.values])),
  reto: { corner: 'reto' },
  'reto-largura': { corner: 'reto', through: 'largura' },
  passante: { assembly: 'passante', sameProfile: false, legProfile: '30x30' },
  'trav-h': { stretcher: 'h' },
  'trav-u': { stretcher: 'u', stretcherHeight: 200 },
  'trav-perimetral': { stretcher: 'perimetral' },
  'barra-6m-qty3': { barLength: 6000, qty: 3 },
  emenda: { length: 2400 },
  estoque: { owned: { '20x30': 2 } },
  perfis: {
    frameUpright: false,
    legRotate: true,
    sameProfile: false,
    frameProfile: '20x40',
    legProfile: '40x40',
    stretcherProfile: '20x20',
    stretcher: 'laterais',
    chapa: 14,
  },
  'sem-beiral': { braces: 3, overhang: 0, topThickness: 0, showTop: false },
  custos: { topPrice: 300, feetPrice: 5, capPrice: 2, extras: 0, corner: 'reto' },
  'preco-antigo': { prices: { '20x30': 30 }, barLength: 3000 },
};

// Só o que importa comparar (sem referências a objetos internos).
export function project(d) {
  return {
    pieces: d.model.pieces.map(({ key, name, group, profile, axis, start, length, sec, ends, letter }) => ({
      key, name, group, profile, axis, start, length, sec, ends, letter,
    })),
    cutList: d.cutList.map(({ letter, name, group, profile, length, cuts, perTable, total }) => ({
      letter, name, group, profile, length, cuts, perTable, total,
    })),
    plan: d.plan.profiles.map((p) => ({
      profile: p.profile,
      count: p.count,
      toBuy: p.toBuy,
      bars: p.bars.map((b) => ({ leftover: b.leftover, cuts: b.cuts.map((c) => [c.letter, c.start, c.length, c.waste, c.splice]) })),
    })),
    costs: {
      lines: d.costs.lines.map(({ label, qty, unit, total }) => ({ label, qty, unit, total })),
      total: d.costs.total,
      meters: d.costs.meters,
      weight: d.costs.weight,
      welds: d.costs.welds,
    },
    warnings: d.warnings,
  };
}
