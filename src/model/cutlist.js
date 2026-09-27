import { GROUP_ORDER } from './catalog.js';

export const cutLabel = (p) => p.ends.map((e) => `${e.cut}°`).join(' / ');

// Agrupa peças iguais (mesmo nome, perfil, comprimento e cortes) e dá uma letra a cada grupo.
export function buildCutList(pieces, qty) {
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
    (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || b.length - a.length,
  );
  list.forEach((g, i) => {
    g.letter = String.fromCharCode(65 + i);
    g.total = g.perTable * qty;
  });
  for (const p of pieces) p.letter = map.get(p.gid).letter;
  return list;
}
