import { getProject } from '../projects/index.js';
import { resolveProfiles } from './profiles.js';
import { buildCutList } from './cutlist.js';
import { planCuts } from './cutting.js';
import { computeCosts } from './costs.js';

// Estado → tudo o que a interface mostra. O tipo de projeto gera as peças; o resto
// (lista de cortes, plano das barras, custos) é igual para todos os tipos.
export function derive(state) {
  const project = getProject(state.type);
  const params = state.projects[project.id];
  const profiles = resolveProfiles(project, params);
  const model = project.generate(params, { profiles, chapa: state.chapa });
  const cutList = buildCutList(model.pieces, state.qty, Object.keys(project.groups));
  const plan = planCuts(cutList, state);
  const extra = project.costs?.(params, model, state.qty) ?? [];
  const costs = computeCosts(state, model, plan, cutList, extra);
  return { project, params, profiles, model, cutList, plan, costs, warnings: [...model.warnings, ...plan.warnings] };
}
