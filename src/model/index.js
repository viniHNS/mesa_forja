import { generateTable } from './table.js';
import { buildCutList } from './cutlist.js';
import { planCuts } from './cutting.js';
import { computeCosts } from './costs.js';

export function derive(state) {
  const model = generateTable(state);
  const cutList = buildCutList(model.pieces, state.qty);
  const plan = planCuts(cutList, state);
  const costs = computeCosts(state, model, plan, cutList);
  return { model, cutList, plan, costs, warnings: [...model.warnings, ...plan.warnings] };
}
