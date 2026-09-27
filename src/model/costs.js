import { kgPerMeter, profileLabel } from './catalog.js';

export function computeCosts(state, model, plan, cutList) {
  const qty = state.qty;
  const lines = [];
  for (const p of plan.profiles) {
    const unit = state.prices[p.profile] ?? 0;
    lines.push({
      kind: 'barra',
      label: `Barras ${profileLabel(p.profile)} · ${(p.barLength / 1000).toLocaleString('pt-BR')} m`,
      note: p.owned ? `${p.count} no plano − ${p.owned} em estoque` : null,
      qty: p.toBuy,
      unit,
      total: p.toBuy * unit,
    });
  }
  lines.push({ kind: 'sapata', label: 'Sapatas / ponteiras dos pés', qty: model.feetCount * qty, unit: state.feetPrice, total: model.feetCount * qty * state.feetPrice });
  if (model.openEnds) {
    lines.push({ kind: 'ponteira', label: 'Tampas para pontas abertas', qty: model.openEnds * qty, unit: state.capPrice, total: model.openEnds * qty * state.capPrice });
  }
  if (state.topPrice > 0) {
    lines.push({ kind: 'tampo', label: 'Tampo', qty, unit: state.topPrice, total: qty * state.topPrice });
  }
  if (state.extras > 0) {
    lines.push({ kind: 'extra', label: 'Consumíveis (eletrodo, disco, tinta)', qty: 1, unit: state.extras, total: state.extras });
  }

  const total = lines.reduce((s, l) => s + l.total, 0);
  const meters = cutList.reduce((s, g) => s + (g.length * g.total) / 1000, 0);
  const weight = cutList.reduce((s, g) => s + (g.length / 1000) * g.total * kgPerMeter(g.profile, state.chapa), 0);

  return { lines, total, perTable: total / qty, meters, weight, welds: model.welds * qty };
}
