import { slider, stepper, segmented, toggle, swatches, note } from '../../ui/controls.js';
import { TOP_MATERIALS, isRect } from '../../model/catalog.js';
import { resolveProfiles } from '../../model/profiles.js';
import {
  when, money, presetsSection, qtyControl, perfilSection, acabamentoSection, barrasSection, custosSection,
} from '../../ui/sections.js';
import { ASSEMBLY_OPTIONS, CORNER_OPTIONS, THROUGH_OPTIONS, STRETCHER_OPTIONS } from './options.js';

const UNION_NOTES = {
  '45': '<b>Meia-esquadria 45°</b> — cantos limpos, sem pontas abertas. A medida da peça é tirada na <i>ponta maior</i>; exige esquadro na hora de ponteá-las.',
  reto: '<b>Reto (topo)</b> — mais fácil de cortar e alinhar. Um lado passa inteiro e o outro encosta nele; as pontas aparentes pedem tampa ou chapinha.',
  passante: '<b>Pernas até o tampo</b> — o quadro fica entre as pernas, tudo em corte reto. Estrutura robusta, visual de bancada.',
};

/** Seções da barra lateral da mesa, na ordem em que aparecem. */
export function mesaSections(ctx) {
  const { store, project, p, P } = ctx;
  const prof = (st) => resolveProfiles(project, P(st));
  // travessa inferior: acima disso ela bateria no quadro (o generate também limita, com aviso)
  const travMax = (st) => Math.max(60, P(st).height - 250);

  return [
    presetsSection(ctx),
    {
      id: 'dimensoes',
      title: 'Dimensões',
      open: true,
      // min/max = faixa do trilho; o visor aceita até o máximo do schema
      controls: [
        slider(store, { label: 'Comprimento', path: p('length'), min: 400, max: 2800, step: 10 }),
        slider(store, { label: 'Largura', path: p('width'), min: 300, max: 1400, step: 10 }),
        slider(store, { label: 'Altura total', path: p('height'), min: 300, max: 1200, step: 5, hint: 'Do chão até o topo do tampo.' }),
        qtyControl(ctx),
      ],
    },
    perfilSection(ctx, [
      when(
        (st) => isRect(prof(st).frame) || isRect(prof(st).stretcher),
        toggle(store, { label: 'Quadro com o lado maior em pé', path: p('frameUpright'), hint: 'Em pé o quadro fica mais rígido (menos flexão).' }),
      ),
      when((st) => isRect(prof(st).leg), toggle(store, { label: 'Girar pernas 90°', path: p('legRotate') })),
    ]),
    {
      id: 'montagem',
      title: 'Montagem e união',
      open: true,
      controls: [
        segmented(store, { label: 'Montagem', path: p('assembly'), options: ASSEMBLY_OPTIONS, className: 'tall' }),
        when(
          (st) => P(st).assembly === 'sob',
          segmented(store, { label: 'União dos cantos do quadro', path: p('corner'), options: CORNER_OPTIONS, className: 'tall' }),
        ),
        when(
          (st) => P(st).assembly === 'sob' && P(st).corner === 'reto',
          segmented(store, { label: 'Lado que passa inteiro', path: p('through'), options: THROUGH_OPTIONS, className: 'tall' }),
        ),
        note((st) => UNION_NOTES[P(st).assembly === 'passante' ? 'passante' : P(st).corner] ?? ''),
        stepper(store, { label: 'Reforços sob o tampo', path: p('braces'), unit: 'un', hint: 'Travessas internas do quadro: apoiam o tampo em mesas longas.' }),
      ],
    },
    {
      id: 'travessa',
      title: 'Travessa inferior',
      open: false,
      controls: [
        segmented(store, { ariaLabel: 'Tipo de travessa inferior', path: p('stretcher'), options: STRETCHER_OPTIONS, className: 'icons' }),
        when(
          (st) => P(st).stretcher !== 'nenhuma',
          slider(store, { label: 'Altura do chão', path: p('stretcherHeight'), min: 40, max: travMax, hardMax: travMax, step: 5 }),
        ),
      ],
    },
    {
      id: 'tampo',
      title: 'Tampo',
      open: false,
      controls: [
        toggle(store, { label: 'Mostrar tampo no 3D', path: 'showPanels' }),
        swatches(store, { label: 'Material', path: p('topMaterial'), options: TOP_MATERIALS }),
        slider(store, { label: 'Espessura', path: p('topThickness'), step: 1, hint: 'Entra no cálculo da altura das pernas.' }),
        slider(store, { label: 'Sobra do tampo (beiral)', path: p('overhang'), step: 5, hint: 'Quanto o tampo passa da estrutura em cada lado.' }),
      ],
    },
    acabamentoSection(ctx),
    barrasSection(ctx),
    custosSection(ctx, [
      stepper(store, { label: 'Tampo (por mesa)', path: p('topPrice'), step: 10, prefix: 'R$', format: money }),
    ]),
  ];
}
