import { h, fmtMoney } from './dom.js';
import { slider, stepper, segmented, toggle, swatches, note, dynamic } from './controls.js';
import { ICONS, tubeIcon } from './icons.js';
import {
  PROFILES, CHAPAS, FINISHES, TOP_MATERIALS, BAR_PRESETS, TABLE_PRESETS, isRect, profileLabel,
} from '../model/catalog.js';
import { resolveProfiles } from '../model/table.js';

const OPEN_KEY = 'mesaforja:open';

const profileOptions = PROFILES.map((p) => ({ value: p.id, label: profileLabel(p.id), icon: tubeIcon(p.a, p.b) }));
const usedProfiles = (s) => [...new Set(Object.values(resolveProfiles(s)))];
const money = (v) => fmtMoney(v).replace('R$', '').trim();

const UNION_NOTES = {
  '45': '<b>Meia-esquadria 45°</b> — cantos limpos, sem pontas abertas. A medida da peça é tirada na <i>ponta maior</i>; exige esquadro na hora de ponteá-las.',
  reto: '<b>Reto (topo)</b> — mais fácil de cortar e alinhar. Um lado passa inteiro e o outro encosta nele; as pontas aparentes pedem tampa ou chapinha.',
  passante: '<b>Pernas até o tampo</b> — o quadro fica entre as pernas, tudo em corte reto. Estrutura robusta, visual de bancada.',
};

function sections(store) {
  const when = (fn, ctl) => Object.assign(ctl, { when: fn });

  return [
    {
      id: 'modelo',
      title: 'Modelos rápidos',
      open: true,
      controls: [
        {
          el: h(
            'div',
            { class: 'presets' },
            TABLE_PRESETS.map((p) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'plate',
                  onclick: () => {
                    store.merge(p.values);
                    document.dispatchEvent(new CustomEvent('mf:reframe'));
                  },
                },
                h('b', {}, p.label),
                h('small', {}, p.sub),
              ),
            ),
          ),
          update() {},
        },
      ],
    },
    {
      id: 'dimensoes',
      title: 'Dimensões',
      open: true,
      controls: [
        slider(store, { label: 'Comprimento', path: 'length', min: 400, max: 2800, hardMax: 6000, step: 10 }),
        slider(store, { label: 'Largura', path: 'width', min: 300, max: 1400, hardMax: 3000, step: 10 }),
        slider(store, { label: 'Altura total', path: 'height', min: 300, max: 1200, hardMax: 1500, step: 5, hint: 'Do chão até o topo do tampo.' }),
        stepper(store, { label: 'Quantidade de mesas', path: 'qty', min: 1, max: 50, unit: 'un' }),
      ],
    },
    {
      id: 'perfil',
      title: 'Perfil do metalon',
      open: true,
      controls: [
        segmented(store, {
          label: 'Chapa (espessura da parede)',
          path: 'chapa',
          options: CHAPAS.map((c) => ({ value: c.id, label: `#${c.id}`, sub: `${String(c.mm).replace('.', ',')} mm` })),
        }),
        toggle(store, { label: 'Mesmo perfil na estrutura toda', path: 'sameProfile', hint: 'Um perfil só = menos tipos de barra para comprar e melhor aproveitamento.' }),
        when(
          (st) => st.sameProfile,
          segmented(store, { label: 'Perfil', path: 'profile', options: profileOptions, cols: 4, className: 'chips' }),
        ),
        when(
          (st) => !st.sameProfile,
          segmented(store, { label: 'Pernas', path: 'legProfile', options: profileOptions, cols: 4, className: 'chips' }),
        ),
        when(
          (st) => !st.sameProfile,
          segmented(store, { label: 'Quadro e reforços', path: 'frameProfile', options: profileOptions, cols: 4, className: 'chips' }),
        ),
        when(
          (st) => !st.sameProfile && st.stretcher !== 'nenhuma',
          segmented(store, { label: 'Travessas inferiores', path: 'stretcherProfile', options: profileOptions, cols: 4, className: 'chips' }),
        ),
        when(
          (st) => isRect(resolveProfiles(st).frame) || isRect(resolveProfiles(st).stretcher),
          toggle(store, { label: 'Quadro com o lado maior em pé', path: 'frameUpright', hint: 'Em pé o quadro fica mais rígido (menos flexão).' }),
        ),
        when(
          (st) => isRect(resolveProfiles(st).leg),
          toggle(store, { label: 'Girar pernas 90°', path: 'legRotate' }),
        ),
      ],
    },
    {
      id: 'montagem',
      title: 'Montagem e união',
      open: true,
      controls: [
        segmented(store, {
          label: 'Montagem',
          path: 'assembly',
          options: [
            { value: 'sob', label: 'Quadro sobre as pernas', icon: ICONS.sob },
            { value: 'passante', label: 'Pernas até o tampo', icon: ICONS.passante },
          ],
          className: 'tall',
        }),
        when(
          (st) => st.assembly === 'sob',
          segmented(store, {
            label: 'União dos cantos do quadro',
            path: 'corner',
            options: [
              { value: '45', label: '45° (meia-esquadria)', icon: ICONS.m45 },
              { value: 'reto', label: 'Reto (topo)', icon: ICONS.reto },
            ],
            className: 'tall',
          }),
        ),
        when(
          (st) => st.assembly === 'sob' && st.corner === 'reto',
          segmented(store, {
            label: 'Lado que passa inteiro',
            path: 'through',
            options: [
              { value: 'comprimento', label: 'Comprimento', icon: ICONS.compr },
              { value: 'largura', label: 'Largura', icon: ICONS.larg },
            ],
            className: 'tall',
          }),
        ),
        note((st) => UNION_NOTES[st.assembly === 'passante' ? 'passante' : st.corner]),
        stepper(store, { label: 'Reforços sob o tampo', path: 'braces', min: 0, max: 8, unit: 'un', hint: 'Travessas internas do quadro: apoiam o tampo em mesas longas.' }),
      ],
    },
    {
      id: 'travessa',
      title: 'Travessa inferior',
      open: false,
      controls: [
        segmented(store, {
          path: 'stretcher',
          options: [
            { value: 'nenhuma', label: 'Sem', icon: ICONS.nenhuma },
            { value: 'laterais', label: 'Laterais', icon: ICONS.laterais },
            { value: 'u', label: 'U', icon: ICONS.u, title: 'Laterais + fundo: deixa a frente livre (escrivaninha)' },
            { value: 'h', label: 'H', icon: ICONS.h },
            { value: 'perimetral', label: 'Perímetro', icon: ICONS.perimetral },
          ],
          className: 'icons',
        }),
        when(
          (st) => st.stretcher !== 'nenhuma',
          slider(store, { label: 'Altura do chão', path: 'stretcherHeight', min: 40, max: (st) => Math.max(60, st.height - 250), step: 5 }),
        ),
      ],
    },
    {
      id: 'tampo',
      title: 'Tampo',
      open: false,
      controls: [
        toggle(store, { label: 'Mostrar tampo no 3D', path: 'showTop' }),
        swatches(store, { label: 'Material', path: 'topMaterial', options: TOP_MATERIALS }),
        slider(store, { label: 'Espessura', path: 'topThickness', min: 0, max: 60, step: 1, hint: 'Entra no cálculo da altura das pernas.' }),
        slider(store, { label: 'Sobra do tampo (beiral)', path: 'overhang', min: 0, max: 150, step: 5, hint: 'Quanto o tampo passa da estrutura em cada lado.' }),
      ],
    },
    {
      id: 'acabamento',
      title: 'Acabamento',
      open: false,
      controls: [swatches(store, { label: 'Pintura do metalon', path: 'finish', options: FINISHES })],
    },
    {
      id: 'barras',
      title: 'Barras e corte',
      open: true,
      controls: [
        segmented(store, {
          label: 'Tamanho da barra',
          path: 'barLength',
          options: BAR_PRESETS.map((v) => ({ value: v, label: `${(v / 1000).toLocaleString('pt-BR')} m` })),
        }),
        slider(store, { label: 'Outro tamanho', path: 'barLength', min: 500, max: 6000, step: 50 }),
        slider(store, { label: 'Espessura do disco', path: 'kerf', min: 0, max: 5, step: 0.5, hint: 'Material perdido em cada corte.' }),
        slider(store, { label: 'Refilo da ponta', path: 'trim', min: 0, max: 50, step: 1, hint: 'Descarte no início da barra (ponta amassada/torta).' }),
        dynamic(
          (st) => usedProfiles(st).join(),
          (st) =>
            usedProfiles(st).map((id) =>
              stepper(store, { label: `Barras ${profileLabel(id)} que já tenho`, path: `owned.${id}`, min: 0, max: 99, unit: 'un' }),
            ),
        ),
      ],
    },
    {
      id: 'custos',
      title: 'Custos',
      open: false,
      controls: [
        dynamic(
          (st) => usedProfiles(st).join() + st.barLength,
          (st) =>
            usedProfiles(st).map((id) =>
              stepper(store, {
                label: `Preço da barra ${profileLabel(id)} · ${(st.barLength / 1000).toLocaleString('pt-BR')} m`,
                path: `prices.${id}`,
                min: 0,
                max: 5000,
                step: 0.5,
                prefix: 'R$',
                format: money,
              }),
            ),
        ),
        stepper(store, { label: 'Sapata (unidade)', path: 'feetPrice', min: 0, max: 200, step: 0.5, prefix: 'R$', format: money }),
        when(
          (st) => st.assembly === 'sob' && st.corner === 'reto',
          stepper(store, { label: 'Tampa de ponta (unidade)', path: 'capPrice', min: 0, max: 200, step: 0.5, prefix: 'R$', format: money }),
        ),
        stepper(store, { label: 'Consumíveis (eletrodo, disco, tinta)', path: 'extras', min: 0, max: 10000, step: 5, prefix: 'R$', format: money }),
        stepper(store, { label: 'Tampo (por mesa)', path: 'topPrice', min: 0, max: 20000, step: 10, prefix: 'R$', format: money }),
      ],
    },
  ];
}

export class Sidebar {
  constructor(root, store) {
    this.controls = [];
    let open = {};
    try {
      open = JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}');
    } catch {
      /* ignora */
    }
    const saveOpen = () => {
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(open));
      } catch {
        /* ignora */
      }
    };

    sections(store).forEach((sec, i) => {
      const isOpen = open[sec.id] ?? sec.open;
      const body = h('div', { class: 'panel-body' }, h('div', { class: 'panel-inner' }));
      const inner = body.firstChild;
      const head = h(
        'button',
        { type: 'button', class: 'panel-head', 'aria-expanded': isOpen },
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
        head.setAttribute('aria-expanded', next);
        open[sec.id] = next;
        saveOpen();
      });
      for (const c of sec.controls) {
        const wrap = h('div', { class: 'ctl-wrap' }, h('div', { class: 'ctl-wrap-inner' }, c.el));
        inner.append(wrap);
        this.controls.push({ ...c, wrap });
      }
      root.append(panel);
    });
  }

  update(state, derived) {
    for (const c of this.controls) {
      const visible = c.when ? c.when(state) : true;
      c.wrap.classList.toggle('is-hidden', !visible);
      c.wrap.inert = !visible;
      c.update(state, derived);
    }
  }
}
