import { getCaster, kgPerMeter, profileLabel } from './catalog.js';

// `extra`: linhas próprias do tipo de projeto (ex.: tampo da mesa), antes dos consumíveis.
export function computeCosts(state, model, plan, cutList, extra = []) {
  const qty = state.qty;
  const lines = [];
  for (const p of plan.profiles) {
    const unit = Math.round((state.meterPrices[p.profile] ?? 0) * (p.barLength / 1000) * 100) / 100;
    lines.push({
      kind: 'barra',
      label: `Barras ${profileLabel(p.profile)} · ${(p.barLength / 1000).toLocaleString('pt-BR')} m`,
      note: p.owned ? `${p.count} no plano − ${p.owned} em estoque` : null,
      qty: p.toBuy,
      unit,
      total: p.toBuy * unit,
    });
  }
  // pés: sapata (padrão) ou rodízio ({ kind: 'rodizio', caster })
  const casters = model.feet.filter((f) => f.kind === 'rodizio');
  const feet = (model.feet.length - casters.length) * qty;
  if (feet) lines.push({ kind: 'sapata', label: 'Sapatas / ponteiras dos pés', qty: feet, unit: state.feetPrice, total: feet * state.feetPrice });
  if (casters.length) {
    const n = casters.length * qty;
    lines.push({ kind: 'rodizio', label: `Rodízios ${getCaster(casters[0].caster).label}`, qty: n, unit: state.casterPrice, total: n * state.casterPrice });
  }
  if (model.openEnds) {
    lines.push({ kind: 'ponteira', label: 'Tampas para pontas abertas', qty: model.openEnds * qty, unit: state.capPrice, total: model.openEnds * qty * state.capPrice });
  }
  lines.push(...extra);
  if (state.extras > 0) {
    lines.push({ kind: 'extra', label: 'Consumíveis (eletrodo, disco, tinta)', qty: 1, unit: state.extras, total: state.extras });
  }

  const total = lines.reduce((s, l) => s + l.total, 0);
  const meters = cutList.reduce((s, g) => s + (g.length * g.total) / 1000, 0);
  const weight = cutList.reduce((s, g) => s + (g.length / 1000) * g.total * kgPerMeter(g.profile, state.chapa), 0);

  return { lines, total, perTable: total / qty, meters, weight, welds: model.welds * qty };
}
