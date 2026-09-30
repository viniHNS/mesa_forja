export const cutLabel = (p) => p.ends.map((e) => `${e.cut}°`).join(' / ');

// Agrupa peças iguais (mesmo nome, perfil, comprimento e cortes) e dá uma letra a cada grupo.
// `groupOrder`: ordem dos grupos de peças do tipo de projeto (pernas antes do quadro etc.).
export function buildCutList(pieces, qty, groupOrder = []) {
  const rank = (g) => (groupOrder.includes(g) ? groupOrder.indexOf(g) : groupOrder.length);
  const map = new Map();
  for (const p of pieces) {
    const cuts = cutLabel(p);
    const gid = `${p.name}|${p.profile}|${p.length}|${cuts}`;
    p.gid = gid;
    if (!map.has(gid)) {
      const m = p.ends.find((e) => e.cut === 45);
      map.set(gid, {
        gid,
        name: p.name,
        group: p.group,
        profile: p.profile,
        length: p.length,
        cuts,
        miter: Boolean(m),
        miterDepth: m ? p.sec[m.plane] : 0,
        perTable: 0,
        ids: [],
      });
    }
    const g = map.get(gid);
    g.perTable += 1;
    g.ids.push(p.id);
  }

  const list = [...map.values()].sort(
    (a, b) => rank(a.group) - rank(b.group) || b.length - a.length,
  );
  list.forEach((g, i) => {
    g.letter = String.fromCharCode(65 + i);
    g.total = g.perTable * qty;
  });
  for (const p of pieces) p.letter = map.get(p.gid).letter;
  return list;
}
