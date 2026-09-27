// Plano de corte: distribui as peças nas barras (bin packing 1D).
// Cada corte consome `kerf` mm (espessura do disco). `trim` é o refilo descartado no início da barra.
// Peças com 45° desperdiçam um triângulo (≈ largura da seção) no primeiro corte em ângulo da barra;
// as seguintes aproveitam o ângulo anterior girando o tubo (encaixe em trapézio).

function expandItems(cutList, qty, usable, warnings) {
  const items = [];
  for (const g of cutList) {
    const count = g.perTable * qty;
    let parts = 1;
    if (g.length > usable) {
      parts = Math.ceil(g.length / usable);
      warnings.push(
        `${g.letter} · ${g.name} (${g.length} mm) é maior que a barra: sai em ${parts} partes com emenda soldada.`,
      );
    }
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < parts; k++) {
        items.push({
          gid: g.gid,
          letter: g.letter,
          group: g.group,
          length: Math.round((g.length / parts) * 10) / 10,
          miter: g.miter && (parts === 1 || k === 0 || k === parts - 1),
          depth: g.miterDepth,
          splice: parts > 1 ? `${k + 1}/${parts}` : null,
        });
      }
    }
  }
  return items.sort((a, b) => b.length - a.length);
}

function pack(items, usable, kerf, strategy) {
  const bars = [];
  const extraFor = (bar, it) => (it.miter && !bar.miter ? it.depth : 0);
  for (const it of items) {
    let target = null;
    let bestRem = Infinity;
    for (const bar of bars) {
      const rem = usable - bar.used - extraFor(bar, it) - it.length;
      if (rem < 0) continue;
      if (strategy === 'first') {
        target = bar;
        break;
      }
      if (rem < bestRem) {
        bestRem = rem;
        target = bar;
      }
    }
    if (!target) {
      target = { items: [], used: 0, miter: false };
      bars.push(target);
    }
    target.used += extraFor(target, it) + it.length + kerf;
    target.miter ||= it.miter;
    target.items.push(it);
  }
  return bars;
}

function layoutBar(bar, barLength, kerf, trim) {
  let cursor = trim;
  let miterSeen = false;
  const cuts = [];
  for (const it of bar.items) {
    let waste = 0;
    if (it.miter && !miterSeen) {
      waste = it.depth;
      miterSeen = true;
    }
    cursor += waste;
    cuts.push({ ...it, start: cursor, waste });
    cursor += it.length + kerf;
  }
  const end = cursor - kerf;
  const leftover = Math.max(0, barLength - end - kerf);
  return { cuts, end, leftover };
}

export function planCuts(cutList, { qty = 1, barLength = 2000, kerf = 3, trim = 5, owned = {} }) {
  const warnings = [];
  const usable = barLength - trim;
  const profiles = [...new Set(cutList.map((g) => g.profile))];

  const result = profiles.map((profile) => {
    const items = expandItems(
      cutList.filter((g) => g.profile === profile),
      qty,
      usable,
      warnings,
    );
    const options = ['best', 'first'].map((st) => pack(items, usable, kerf, st));
    const score = (bars) => {
      const maxLeft = Math.max(...bars.map((b) => usable - b.used));
      return bars.length * 1e6 - maxLeft; // menos barras; empate: maior sobra reaproveitável
    };
    const bars = options.sort((a, b) => score(a) - score(b))[0].map((b) => layoutBar(b, barLength, kerf, trim));

    const pieceTotal = items.reduce((s, it) => s + it.length, 0);
    const have = Math.max(0, Math.round(owned[profile] ?? 0));
    return {
      profile,
      barLength,
      bars,
      count: bars.length,
      owned: have,
      toBuy: Math.max(0, bars.length - have),
      pieces: items.length,
      pieceTotal,
      efficiency: bars.length ? pieceTotal / (bars.length * barLength) : 0,
      lowerBound: Math.ceil(pieceTotal / usable),
    };
  });

  return {
    profiles: result,
    totalBars: result.reduce((s, r) => s + r.count, 0),
    totalToBuy: result.reduce((s, r) => s + r.toBuy, 0),
    totalCuts: result.reduce((s, r) => s + r.pieces, 0),
    warnings,
  };
}
