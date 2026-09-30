import { h } from './dom.js';
import { segmented } from './controls.js';
import { ICONS } from './icons.js';
import { sectionContext } from './sections.js';
import { PROJECTS, getProject } from '../projects/index.js';

const OPEN_KEY = 'mesaforja:open';

// Seletor de tipo de projeto: só aparece quando há mais de um tipo registrado
function typeSection(store) {
  return {
    id: 'tipo',
    title: 'Tipo de projeto',
    open: true,
    controls: [
      segmented(store, {
        ariaLabel: 'Tipo de projeto',
        path: 'type',
        options: PROJECTS.map((p) => ({ value: p.id, label: p.label })),
        className: 'tall',
      }),
    ],
  };
}

// Barra lateral: as seções vêm do tipo de projeto atual (project.sections) e são refeitas
// quando o tipo muda. Painéis abertos/fechados ficam salvos por tipo.
export class Sidebar {
  constructor(root, store) {
    this.root = root;
    this.store = store;
    this.type = null;
    this.controls = [];
    this.open = {};
    try {
      this.open = JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}') ?? {};
    } catch {
      /* ignora */
    }
  }

  saveOpen() {
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(this.open));
    } catch {
      /* ignora */
    }
  }

  build(type) {
    this.type = type;
    this.controls = [];
    this.root.replaceChildren();
    const project = getProject(type);
    const sections = project.sections(sectionContext(this.store, project));
    if (PROJECTS.length > 1) sections.unshift(typeSection(this.store));

    sections.forEach((sec, i) => {
      const key = `${type}/${sec.id}`;
      const isOpen = this.open[key] ?? sec.open;
      const bodyId = `painel-${sec.id}`;
      const body = h('div', { class: 'panel-body', id: bodyId }, h('div', { class: 'panel-inner' }));
      const inner = body.firstChild;
      // recolhido, o conteúdo continua no DOM (a animação precisa): inert tira do Tab
      body.inert = !isOpen;
      const head = h(
        'button',
        { type: 'button', class: 'panel-head', 'aria-expanded': String(isOpen), 'aria-controls': bodyId },
        h('span', { class: 'screw' }),
        h('span', { class: 'panel-title' }, sec.title),
        h('span', { class: 'panel-led' }),
        h('span', { class: 'panel-chev', html: ICONS.chevron }),
        h('span', { class: 'screw' }),
      );
      const panel = h('section', { class: `panel${isOpen ? ' is-open' : ''}`, style: { '--i': i } }, head, body);
      head.addEventListener('click', () => {
        const next = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', next);
        head.setAttribute('aria-expanded', String(next));
        body.inert = !next;
        this.open[key] = next;
        this.saveOpen();
      });
      for (const c of sec.controls) {
        const wrap = h('div', { class: 'ctl-wrap' }, h('div', { class: 'ctl-wrap-inner' }, c.el));
        inner.append(wrap);
        this.controls.push({ ...c, wrap });
      }
      this.root.append(panel);
    });
  }

  update(state, derived) {
    if (state.type !== this.type) this.build(state.type);
    for (const c of this.controls) {
      const visible = c.when ? c.when(state, derived) : true;
      c.wrap.classList.toggle('is-hidden', !visible);
      c.wrap.inert = !visible;
      c.update(state, derived);
    }
  }
}
