import { slider, stepper, segmented, toggle, swatches, note } from '../../ui/controls.js';
import { TOP_MATERIALS, isRect } from '../../model/catalog.js';
import { resolveProfiles } from '../../model/profiles.js';
import {
  when, money, presetsSection, qtyControl, perfilSection, acabamentoSection, barrasSection, custosSection,
} from '../../ui/sections.js';
import { CASTER_OPTIONS } from './options.js';

/** Seções da barra lateral do carrinho, na ordem em que aparecem. */
export function carrinhoSections(ctx) {
  const { store, project, p, P } = ctx;
  const prof = (st) => resolveProfiles(project, P(st));

  return [
    presetsSection(ctx),
    {
      id: 'dimensoes',
      title: 'Dimensões',
      open: true,
      // min/max = faixa do trilho; o visor aceita até o máximo do schema
      controls: [
        slider(store, { label: 'Comprimento', path: p('length'), min: 400, max: 1200, step: 10 }),
        slider(store, { label: 'Largura', path: p('width'), min: 250, max: 800, step: 10 }),
        slider(store, { label: 'Altura total', path: p('height'), min: 450, max: 1200, step: 5, hint: 'Do chão ao topo da bandeja de cima, com os rodízios.' }),
        stepper(store, { label: 'Bandejas', path: p('shelves'), unit: 'un' }),
        qtyControl(ctx),
      ],
    },
    perfilSection(ctx, [
      when(
        (st) => isRect(prof(st).frame),
        toggle(store, { label: 'Quadro com o lado maior em pé', path: p('frameUpright'), hint: 'Em pé o quadro fica mais rígido e a bandeja ganha borda mais alta.' }),
      ),
    ]),
    {
      id: 'bandejas',
      title: 'Bandejas',
      open: true,
      controls: [
        toggle(store, { label: 'Mostrar bandejas no 3D', path: 'showPanels' }),
        swatches(store, { label: 'Material', path: p('panelMaterial'), options: TOP_MATERIALS }),
        slider(store, { label: 'Espessura', path: p('panelThickness'), step: 0.5, hint: 'Entra no cálculo da altura das colunas.' }),
        stepper(store, { label: 'Reforços por bandeja', path: p('braces'), unit: 'un', hint: 'Travessas no meio do quadro, de frente a fundo: seguram a placa.' }),
        note(() => 'As placas das bandejas de baixo e do meio levam <b>recorte nos 4 cantos</b> para passar as colunas.'),
      ],
    },
    {
      id: 'rodas',
      title: 'Rodízios e alça',
      open: false,
      controls: [
        segmented(store, { label: 'Rodízio (diâmetro da roda)', path: p('caster'), options: CASTER_OPTIONS }),
        toggle(store, { label: 'Alça para empurrar', path: p('handle'), hint: 'Em U, de metalon, no lado direito, na altura da bandeja de cima.' }),
        when((st) => P(st).handle, slider(store, { label: 'Saída da alça', path: p('handleOut'), step: 5 })),
      ],
    },
    acabamentoSection(ctx),
    barrasSection(ctx),
    custosSection(ctx, [
      stepper(store, { label: 'Placa da bandeja (unidade)', path: p('panelPrice'), step: 5, prefix: 'R$', format: money }),
    ]),
  ];
}
