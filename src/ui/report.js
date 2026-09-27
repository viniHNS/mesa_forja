import { h, fmt, fmtMoney, fmtKg, countTo } from './dom.js';
import { GROUPS, profileLabel, CHAPAS } from '../model/catalog.js';
import { ICONS } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function cutListHTML(cutList) {
  const rows = cutList
    .map(
      (g) => `
      <tr data-gid="${esc(g.gid)}" style="--g:${GROUPS[g.group].color}">
        <td><span class="tag">${g.letter}</span></td>
        <td class="name">${esc(g.name)}</td>
        <td>${profileLabel(g.profile)}</td>
        <td class="num">${g.total}</td>
        <td class="num strong">${fmt(g.length)}</td>
        <td><span class="cuts ${g.miter ? 'is-45' : ''}">${g.cuts}</span></td>
      </tr>`,
    )
    .join('');
  return `
    <table class="cut-table">
      <thead><tr><th></th><th>Peça</th><th>Perfil</th><th class="num">Qtd</th><th class="num">Medida (mm)</th><th>Cortes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function planHTML(plan, cutList) {
  const color = Object.fromEntries(cutList.map((g) => [g.gid, GROUPS[g.group].color]));
  return plan.profiles
    .map((p) => {
      const bars = p.bars
        .map((b, i) => {
          const segs = b.cuts
            .map((c) => {
              const left = (c.start / p.barLength) * 100;
              const width = (c.length / p.barLength) * 100;
              const waste = c.waste ? `<span class="seg-waste" style="left:${((c.start - c.waste) / p.barLength) * 100}%;width:${(c.waste / p.barLength) * 100}%"></span>` : '';
              return `${waste}<span class="seg ${c.miter ? 'is-45' : ''}" data-gid="${esc(c.gid)}" style="left:${left}%;width:${width}%;--g:${color[c.gid]}" title="${c.letter} · ${fmt(c.length)} mm${c.splice ? ` (emenda ${c.splice})` : ''}">
                <b>${c.letter}</b><i>${fmt(c.length)}</i></span>`;
            })
            .join('');
          const trim = b.cuts.length && b.cuts[0].start - (b.cuts[0].waste || 0) > 0 ? `<span class="seg-trim" style="width:${((b.cuts[0].start - (b.cuts[0].waste || 0)) / p.barLength) * 100}%"></span>` : '';
          const left = b.leftover > 0 ? `<span class="seg-left" style="width:${(b.leftover / p.barLength) * 100}%"><i>sobra ${fmt(b.leftover)}</i></span>` : '';
          return `
          <div class="bar-row" style="--d:${i}">
            <span class="bar-name">#${i + 1}</span>
            <div class="bar">${trim}${segs}${left}</div>
          </div>`;
        })
        .join('');
      const owned = p.owned ? ` · ${p.owned} em estoque` : '';
      return `
      <section class="plan-profile">
        <header>
          <h4>${profileLabel(p.profile)} <small>${fmt(p.barLength)} mm</small></h4>
          <span class="plan-meta">${p.count} barra${p.count > 1 ? 's' : ''}${owned} · comprar <b>${p.toBuy}</b> · aproveitamento ${Math.round(p.efficiency * 100)}%</span>
        </header>
        ${bars}
      </section>`;
    })
    .join('');
}

export function costsHTML(costs, state) {
  const chapa = CHAPAS.find((c) => c.id === state.chapa);
  const lines = costs.lines
    .map(
      (l) => `<tr><td>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td><td class="num">${l.qty}</td><td class="num">${fmtMoney(l.unit)}</td><td class="num strong">${fmtMoney(l.total)}</td></tr>`,
    )
    .join('');
  return `
    <table class="cost-table">
      <thead><tr><th>Item</th><th class="num">Qtd</th><th class="num">Unit.</th><th class="num">Total</th></tr></thead>
      <tbody>${lines}</tbody>
      <tfoot>
        <tr><td colspan="3">Total${state.qty > 1 ? ` · ${state.qty} mesas` : ''}</td><td class="num">${fmtMoney(costs.total)}</td></tr>
        ${state.qty > 1 ? `<tr class="sub"><td colspan="3">Por mesa</td><td class="num">${fmtMoney(costs.perTable)}</td></tr>` : ''}
      </tfoot>
    </table>
    <dl class="facts">
      <div><dt>Metalon em peças</dt><dd>${fmt(costs.meters)} m</dd></div>
      <div><dt>Peso do aço (#${state.chapa} · ${String(chapa?.mm).replace('.', ',')} mm)</dt><dd>${fmtKg(costs.weight)}</dd></div>
      <div><dt>Pontos de solda</dt><dd>${costs.welds}</dd></div>
    </dl>`;
}

export class Report {
  constructor(root, { onSelect, onHover, onToggle }) {
    this.root = root;
    this.onToggle = onToggle;
    this.tab = 'cortes';
    this.selected = null;
    this.stats = {
      bars: h('b', { class: 'stat-num' }),
      cuts: h('b', { class: 'stat-num' }),
      kg: h('b', { class: 'stat-num' }),
      money: h('b', { class: 'stat-num' }),
    };
    const stat = (label, short, el, cls = '') =>
      h('div', { class: `stat ${cls}`, title: label }, el, h('span', { class: 'long' }, label), short && h('span', { class: 'short' }, short));

    this.warn = h('div', { class: 'warnings' });
    this.panels = {
      cortes: h('div', { class: 'tab-panel', 'data-tab': 'cortes' }),
      barras: h('div', { class: 'tab-panel', 'data-tab': 'barras' }),
      custos: h('div', { class: 'tab-panel', 'data-tab': 'custos' }),
    };
    this.tabs = Object.entries({ cortes: 'Lista de cortes', barras: 'Plano de barras', custos: 'Custos' }).map(([id, label]) =>
      h('button', { type: 'button', class: 'tab', 'data-tab': id, onclick: () => this.setTab(id, true) }, label),
    );

    this.handle = h(
      'button',
      { type: 'button', class: 'drawer-handle', 'aria-label': 'Abrir ou fechar relatório', onclick: () => this.toggle() },
      h('span', { class: 'grip' }),
    );

    root.append(
      this.handle,
      h(
        'header',
        { class: 'drawer-head' },
        h(
          'div',
          { class: 'stats' },
          stat('barras p/ comprar', 'barras', this.stats.bars, 'is-accent'),
          stat('cortes', 'cortes', this.stats.cuts),
          stat('kg de aço', 'kg', this.stats.kg),
          stat('estimado', null, this.stats.money),
        ),
        h('nav', { class: 'tabs' }, this.tabs),
      ),
      h('div', { class: 'drawer-body' }, this.warn, ...Object.values(this.panels)),
    );

    const body = root.querySelector('.drawer-body');
    body.addEventListener('click', (e) => {
      const row = e.target.closest('[data-gid]');
      const gid = row ? row.dataset.gid : null;
      onSelect(gid && gid === this.selected ? null : gid);
    });
    body.addEventListener('pointerover', (e) => onHover(e.target.closest('[data-gid]')?.dataset.gid ?? null));
    body.addEventListener('pointerleave', () => onHover(null));
    this.setTab(this.tab);
  }

  toggle(force) {
    const was = this.root.classList.contains('is-open');
    const open = force ?? !was;
    this.root.classList.toggle('is-open', open);
    if (open !== was) this.onToggle?.(open, this.root.offsetHeight - this.root.querySelector('.drawer-head').offsetHeight);
  }

  setTab(id, openDrawer = false) {
    this.tab = id;
    this.tabs.forEach((t) => t.classList.toggle('is-on', t.dataset.tab === id));
    Object.entries(this.panels).forEach(([k, p]) => p.classList.toggle('is-on', k === id));
    if (openDrawer) this.toggle(true);
    if (id === 'barras') {
      const p = this.panels.barras;
      p.classList.remove('is-anim');
      void p.offsetWidth;
      p.classList.add('is-anim');
    }
  }

  setSelected(gid) {
    this.selected = gid;
    this.root.querySelectorAll('[data-gid]').forEach((el) => el.classList.toggle('is-selected', el.dataset.gid === gid));
  }

  setHover(gid) {
    this.root.querySelectorAll('.is-hover').forEach((el) => el.classList.remove('is-hover'));
    if (gid) this.root.querySelectorAll(`[data-gid="${CSS.escape(gid)}"]`).forEach((el) => el.classList.add('is-hover'));
  }

  render(d, state) {
    countTo(this.stats.bars, d.plan.totalToBuy, (v) => Math.round(v));
    countTo(this.stats.cuts, d.plan.totalCuts, (v) => Math.round(v));
    countTo(this.stats.kg, Math.round(d.costs.weight * 10) / 10, (v) =>
      v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    );
    countTo(this.stats.money, Math.round(d.costs.total), (v) => fmtMoney(Math.round(v)).replace(/,00$/, ''));

    this.warn.innerHTML = d.warnings.map((w) => `<p class="warning">${ICONS.warn}<span>${esc(w)}</span></p>`).join('');
    this.panels.cortes.innerHTML =
      cutListHTML(d.cutList) +
      `<p class="legend">Medidas na ponta maior. Peças 45°/45° são trapézios: corte alternando o lado para aproveitar o ângulo.${state.qty > 1 ? ` Quantidades já multiplicadas por ${state.qty} mesas.` : ''}</p>`;
    this.panels.barras.innerHTML =
      planHTML(d.plan, d.cutList) +
      `<p class="legend"><span class="key-trim"></span> refilo &nbsp; <span class="key-waste"></span> perda do 1º corte a 45° &nbsp; <span class="key-left"></span> sobra · disco de ${fmt(state.kerf)} mm por corte</p>`;
    this.panels.custos.innerHTML = costsHTML(d.costs, state);
    this.setSelected(this.selected);
  }
}
