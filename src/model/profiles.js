// Perfis por função (roles) de um tipo de projeto: um perfil só para tudo (sameProfile)
// ou um por função (roleProfiles). Devolve { [role]: profileId }.
export function resolveProfiles(project, params) {
  return Object.fromEntries(project.roles.map((r) => [r.id, params.sameProfile ? params.profile : params.roleProfiles[r.id]]));
}

// Perfis distintos que o projeto usa (para estoque e preços). Funções escondidas pelo `when`
// (ex.: travessa desligada, sem alça) não contam.
export function usedProfiles(project, params) {
  const prof = resolveProfiles(project, params);
  return [...new Set(project.roles.filter((r) => !r.when || r.when(params)).map((r) => prof[r.id]))];
}
