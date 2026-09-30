import { h, esc, fmt, fmtMoney, fmtKg, countTo } from './dom.js';
import { ICONS } from './icons.js';
import { perfilText, chapaText, nounFor } from './options.js';

// Cores vêm dos grupos do tipo de projeto (d.project.groups); grupo desconhecido não pode
// derrubar o relatório
const groupColor = (groups, group) => groups?.[group]?.color ?? '#9a968c';

export function cutListHTML(cutList, groups) {
  const rows = cutList
    .map(
      (g) => `
      <tr data-gid="${esc(g.gid)}" tabindex="0" style="--g:${groupColor(groups, g.group)}">
        <td><span class="tag">${esc(g.letter)}</span></td>
        <td class="name">${esc(g.name)}</td>
        <td>${esc(perfilText(g.profile))}</td>
        <td class="num">${esc(g.total)}</td>
        <td class="num strong">${fmt(g.length)}</td>
        <td><span class="cuts ${g.miter ? 'is-45' : ''}">${esc(g.cuts)}</span></td>
      </tr>`,
    )
    .join('');
  return `
    <table class="cut-table">
      <thead><tr><th></th><th>Peça</th><th>Perfil</th><th class="num">Qtd</th><th class="num">Medida (mm)</th><th>Cortes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function planHTML(plan, cutList, groups) {
  const color = Object.fromEntries(cutList.map((g) => [g.gid, groupColor(groups, g.group)]));
  return plan.profiles
    .map((p) => {
      const bars = p.bars
        .map((b, i) => {
          const segs = b.cuts
            .map((c) => {
              const left = (c.start / p.barLength) * 100;
              const width = (c.length / p.barLength) * 100;
              const waste = c.waste ? `<span class="seg-waste" style="left:${((c.start - c.waste) / p.barLength) * 100}%;width:${(c.waste / p.barLength) * 100}%"></span>` : '';
              const title = esc(`${c.letter} · ${fmt(c.length)} mm${c.splice ? ` (emenda ${c.splice})` : ''}`);
              return `${waste}<span class="seg ${c.miter ? 'is-45' : ''}" data-gid="${esc(c.gid)}" role="button" tabindex="0" aria-pressed="false" aria-label="${title}" style="left:${left}%;width:${width}%;--g:${color[c.gid] ?? groupColor()}" title="${title}">
                <b>${esc(c.letter)}</b><i>${fmt(c.length)}</i></span>`;
            })
            .join('');
          const trim = b.cuts.length && b.cuts[0].start - (b.cuts[0].waste || 0) > 0 ? `<span class="seg-trim" style="width:${((b.cuts[0].start - (b.cuts[0].waste || 0)) / p.barLength) * 100}%"></span>` : '';
          // a palavra "sobra" e o número somem em sobras estreitas (container query no CSS)
          const left = b.leftover > 0 ? `<span class="seg-left" style="width:${(b.leftover / p.barLength) * 100}%" title="sobra ${fmt(b.leftover)} mm"><i><span>sobra </span>${fmt(b.leftover)}</i></span>` : '';
          return `
          <div class="bar-row" style="--d:${i}">
            <span class="bar-name">#${i + 1}</span>
            <div class="bar">${trim}${segs}${left}</div>
          </div>`;
        })
        .join('');
      const owned = p.owned ? ` · ${esc(p.owned)} em estoque` : '';
      return `
      <section class="plan-profile">
        <header>
          <h4>${esc(perfilText(p.profile))} <small>${fmt(p.barLength)} mm</small></h4>
          <span class="plan-meta">${esc(p.count)} barra${p.count > 1 ? 's' : ''}${owned} · comprar <b>${esc(p.toBuy)}</b> · aproveitamento ${Math.round(p.efficiency * 100)}%</span>
        </header>
        ${bars}
      </section>`;
    })
    .join('');
}

// `noun`: nome do tipo de projeto no singular e plural (["mesa", "mesas"])
export function costsHTML(costs, state, noun) {
  // chapa fora do catálogo: omite a espessura em vez de imprimir "undefined mm"
  const chapa = chapaText(state.chapa);
  const lines = costs.lines
    .map(
      (l) => `<tr><td>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td><td class="num">${esc(l.qty)}</td><td class="num">${fmtMoney(l.unit)}</td><td class="num strong">${fmtMoney(l.total)}</td></tr>`,
    )
    .join('');
  return `
    <table class="cost-table">
      <thead><tr><th>Item</th><th class="num">Qtd</th><th class="num">Unit.</th><th class="num">Total</th></tr></thead>
      <tbody>${lines}</tbody>
      <tfoot>
        <tr><td colspan="3">Total${state.qty > 1 ? ` · ${fmt(state.qty)} ${esc(nounFor(noun, state.qty))}` : ''}</td><td class="num">${fmtMoney(costs.total)}</td></tr>
        ${state.qty > 1 ? `<tr class="sub"><td colspan="3">Por ${esc(noun[0])}</td><td class="num">${fmtMoney(costs.perTable)}</td></tr>` : ''}
      </tfoot>
    </table>
    <dl class="facts">
      <div><dt>Metalon em peças</dt><dd>${fmt(costs.meters)} m</dd></div>
      <div><dt>Peso do aço${chapa ? ` (${esc(chapa)})` : ''}</dt><dd>${fmtKg(costs.weight)}</dd></div>
      <div><dt>Pontos de solda</dt><dd>${esc(costs.welds)}</dd></div>
    </dl>`;
}

// "Forma" do plano: muda quando entra/sai um perfil ou muda o número de barras.
// Só nesse caso (ou ao abrir a aba) as barras são animadas de novo.
const planShape = (plan) => plan.profiles.map((p) => `${p.profile}:${p.bars.length}`).join();

export class Report {
  constructor(root, { onSelect, onHover, onToggle }) {
    this.root = root;
    this.onToggle = onToggle;
    this.tab = 'cortes';
    this.selected = null;
    this.planShape = null;
    // último inset avisado (-1 = fechada), para não repetir o mesmo valor
    this.lastInset = -1;
    this.stats = {
      bars: h('b', { class: 'stat-num' }),
      cuts: h('b', { class: 'stat-num' }),
      kg: h('b', { class: 'stat-num' }),
      money: h('b', { class: 'stat-num' }),
    };
    const stat = (label, short, el, cls = '') =>
      h('div', { class: `stat ${cls}`, title: label }, el, h('span', { class: 'long' }, label), short && h('span', { class: 'short' }, short));

    const TABS = { cortes: 'Lista de cortes', barras: 'Plano de barras', custos: 'Custos' };
    this.warn = h('div', { class: 'warnings' });
    this.panels = Object.fromEntries(
      Object.keys(TABS).map((id) => [
        id,
        h('div', { class: 'tab-panel', 'data-tab': id, id: `mf-panel-${id}`, role: 'tabpanel', 'aria-labelledby': `mf-tab-${id}`, tabindex: 0 }),
      ]),
    );
    this.tabs = Object.entries(TABS).map(([id, label]) =>
      h(
        'button',
        { type: 'button', class: 'tab', role: 'tab', id: `mf-tab-${id}`, 'aria-controls': `mf-panel-${id}`, 'data-tab': id, onclick: () => this.setTab(id, true) },
        label,
      ),
    );
    const tablist = h('nav', { class: 'tabs', role: 'tablist', 'aria-label': 'Relatório' }, this.tabs);
    // setas ←/→ (e Home/End) andam entre as abas, como no padrão ARIA de abas
    tablist.addEventListener('keydown', (e) => {
      const i = this.tabs.indexOf(e.target);
      const n = this.tabs.length;
      const j = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (i < 0 || j === undefined) return;
      e.preventDefault();
      this.tabs[j].focus();
      this.setTab(this.tabs[j].dataset.tab, true);
    });

    this.handle = h(
      'button',
      { type: 'button', class: 'drawer-handle', 'aria-label': 'Abrir ou fechar relatório', 'aria-expanded': 'false', 'aria-controls': 'mf-drawer-body', onclick: () => this.toggle() },
      h('span', { class: 'grip' }),
    );

    this.head = h(
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
      tablist,
    );
    this.body = h('div', { class: 'drawer-body', id: 'mf-drawer-body' }, this.warn, ...Object.values(this.panels));
    // fechada, a gaveta só mostra o cabeçalho: o Tab não deve entrar no corpo escondido
    this.body.inert = true;
    root.append(this.handle, this.head, this.body);

    const body = this.body;
    body.addEventListener('click', (e) => {
      const row = e.target.closest('[data-gid]');
      const gid = row ? row.dataset.gid : null;
      onSelect(gid && gid === this.selected ? null : gid);
    });
    // Enter/Espaço numa linha ou segmento focado equivalem ao clique
    body.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!e.target.matches?.('[data-gid]')) return;
      e.preventDefault();
      e.target.click();
    });
    body.addEventListener('pointerover', (e) => onHover(e.target.closest('[data-gid]')?.dataset.gid ?? null));
    body.addEventListener('pointerleave', () => onHover(null));
    // com o teclado, o foco faz o papel do hover (realça a peça no 3D)
    body.addEventListener('focusin', (e) => onHover(e.target.closest?.('[data-gid]')?.dataset.gid ?? null));
    body.addEventListener('focusout', () => onHover(null));

    // A altura coberta muda com a janela (resize, rotação do celular) sem abrir nem
    // fechar a gaveta: avisa de novo para o 3D recalcular o inset. O ResizeObserver também
    // dispara logo no início, o que dá ao 3D a faixa da gaveta fechada.
    const onResize = () => this.notifyInset();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(onResize).observe(root);
    else window.addEventListener('resize', onResize);
    this.setTab(this.tab);
  }

  isOpen() {
    return this.root.classList.contains('is-open');
  }

  // Altura do 3D coberta pela gaveta: ela inteira aberta, ou só a faixa (--peek) fechada.
  // Lida do layout de destino, não da posição atual (que pode estar no meio da transição).
  notifyInset() {
    const open = this.isOpen();
    const peek = parseFloat(getComputedStyle(this.root).getPropertyValue('--peek')) || 0;
    const covered = open ? this.root.offsetHeight : Math.min(peek, this.root.offsetHeight);
    const key = `${open}:${covered}`;
    if (key === this.lastInset) return;
    this.lastInset = key;
    this.onToggle?.(open, covered);
  }

  toggle(force) {
    const was = this.isOpen();
    const open = force ?? !was;
    this.root.classList.toggle('is-open', open);
    this.body.inert = !open;
    this.handle.setAttribute('aria-expanded', String(open));
    if (open === was) return;
    this.notifyInset();
    if (open && this.tab === 'barras') this.animatePlan();
  }

  setTab(id, openDrawer = false) {
    const changed = id !== this.tab;
    const wasOpen = this.isOpen();
    this.tab = id;
    this.tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    Object.entries(this.panels).forEach(([k, p]) => p.classList.toggle('is-on', k === id));
    if (openDrawer) this.toggle(true);
    // se a gaveta acabou de abrir, toggle() já animou
    if (id === 'barras' && changed && wasOpen) this.animatePlan();
  }

  // Liga a animação de entrada das barras e desliga no fim: com a classe sempre ligada,
  // cada render (innerHTML novo) repetiria a animação a cada tick de slider.
  animatePlan() {
    const p = this.panels.barras;
    clearTimeout(this.animTimer);
    p.classList.remove('is-anim');
    void p.offsetWidth;
    p.classList.add('is-anim');
    const rows = [...p.querySelectorAll('.bar-row')].map((r) => Number(r.style.getPropertyValue('--d')) || 0);
    this.animTimer = setTimeout(() => p.classList.remove('is-anim'), 700 + Math.max(0, ...rows) * 70);
  }

  stopPlanAnim() {
    clearTimeout(this.animTimer);
    this.panels.barras.classList.remove('is-anim');
  }

  setSelected(gid) {
    this.selected = gid;
    this.root.querySelectorAll('[data-gid]').forEach((el) => {
      const on = el.dataset.gid === gid;
      el.classList.toggle('is-selected', on);
      if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', String(on));
    });
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

    // o innerHTML abaixo descarta o elemento focado; guarda qual era para devolver o foco
    const active = document.activeElement;
    const refocus = this.body.contains(active) && active.dataset.gid ? `${active.classList.contains('seg') ? '.seg' : 'tr'}[data-gid="${CSS.escape(active.dataset.gid)}"]` : null;

    this.warn.innerHTML = d.warnings.map((w) => `<p class="warning">${ICONS.warn}<span>${esc(w)}</span></p>`).join('');
    const { groups, noun } = d.project;
    this.panels.cortes.innerHTML =
      cutListHTML(d.cutList, groups) +
      `<p class="legend">Medidas na ponta maior. Peças 45°/45° são trapézios: corte alternando o lado para aproveitar o ângulo.${state.qty > 1 ? ` Quantidades já multiplicadas por ${fmt(state.qty)} ${esc(nounFor(noun, state.qty))}.` : ''}</p>`;

    const shape = planShape(d.plan);
    const shapeChanged = this.planShape !== null && shape !== this.planShape;
    this.planShape = shape;
    this.panels.barras.innerHTML =
      planHTML(d.plan, d.cutList, groups) +
      `<p class="legend"><span class="key-trim"></span> refilo &nbsp; <span class="key-waste"></span> perda do 1º corte a 45° &nbsp; <span class="key-left"></span> sobra · disco de ${fmt(state.kerf)} mm por corte</p>`;
    // mesma forma: desliga a animação em curso para as barras novas não recomeçarem do zero
    if (shapeChanged && this.tab === 'barras' && this.isOpen()) this.animatePlan();
    else this.stopPlanAnim();

    this.panels.custos.innerHTML = costsHTML(d.costs, state, noun);
    this.setSelected(this.selected);
    // se a peça mudou de gid (medida nova), o foco fica no painel em vez de cair no <body>
    if (refocus) (this.body.querySelector(refocus) ?? this.panels[this.tab]).focus({ preventScroll: true });
  }
}
