import { h, fmtMoney } from './dom.js';
import { stepper, segmented, toggle, swatches, slider, dynamic } from './controls.js';
import { PROFILE_OPTIONS, perfilText } from './options.js';
import { CHAPAS, FINISHES, BAR_PRESETS } from '../model/catalog.js';
import { usedProfiles } from '../model/profiles.js';

// Seções da barra lateral que servem a qualquer tipo de projeto. Cada tipo monta a sua
// lista em sections(ctx) misturando estas com as próprias.
//
// ctx = { store, project, p(campo) → 'projects.<id>.<campo>', P(state) → parâmetros do tipo }
// Controles com `when(state, derived)` só aparecem quando a função devolve true.

export const when = (fn, ctl) => Object.assign(ctl, { when: fn });
export const money = (v) => fmtMoney(v).replace('R$', '').trim();

// Contexto das seções de um tipo
export function sectionContext(store, project) {
  return {
    store,
    project,
    p: (k) => `projects.${project.id}.${k}`,
    P: (st) => st.projects[project.id],
  };
}

export function presetsSection({ store, project, P }) {
  return {
    id: 'modelo',
    title: 'Modelos rápidos',
    open: true,
    controls: [
      {
        el: h(
          'div',
          { class: 'presets' },
          project.presets.map((preset) =>
            h(
              'button',
              {
                type: 'button',
                class: 'plate',
                onclick: () => {
                  store.set(`projects.${project.id}`, { ...P(store.get()), ...preset.values });
                  document.dispatchEvent(new CustomEvent('mf:reframe'));
                },
              },
              h('b', {}, preset.label),
              h('small', {}, preset.sub),
            ),
          ),
        ),
        update() {},
      },
    ],
  };
}

export const qtyControl = ({ store, project }) =>
  stepper(store, { label: `Quantidade de ${project.noun[1]}`, path: 'qty', unit: 'un' });

// Chapa, perfil único ou um por função (roles do tipo), mais controles extras do tipo
export function perfilSection({ store, project, p, P }, extra = []) {
  return {
    id: 'perfil',
    title: 'Perfil do metalon',
    open: true,
    controls: [
      segmented(store, {
        label: 'Chapa (espessura da parede)',
        path: 'chapa',
        options: CHAPAS.map((c) => ({ value: c.id, label: `#${c.id}`, sub: `${String(c.mm).replace('.', ',')} mm` })),
      }),
      toggle(store, { label: 'Mesmo perfil na estrutura toda', path: p('sameProfile'), hint: 'Um perfil só = menos tipos de barra para comprar e melhor aproveitamento.' }),
      when(
        (st) => P(st).sameProfile,
        segmented(store, { label: 'Perfil', path: p('profile'), options: PROFILE_OPTIONS, cols: 4, className: 'chips' }),
      ),
      ...project.roles.map((role) =>
        when(
          (st) => !P(st).sameProfile && (role.when ? role.when(P(st)) : true),
          segmented(store, { label: role.label, path: p(`roleProfiles.${role.id}`), options: PROFILE_OPTIONS, cols: 4, className: 'chips' }),
        ),
      ),
      ...extra,
    ],
  };
}

export function acabamentoSection({ store }) {
  return {
    id: 'acabamento',
    title: 'Acabamento',
    open: false,
    controls: [swatches(store, { label: 'Pintura do metalon', path: 'finish', options: FINISHES })],
  };
}

export function barrasSection({ store, project, P }) {
  return {
    id: 'barras',
    title: 'Barras e corte',
    open: true,
    controls: [
      segmented(store, {
        label: 'Tamanho da barra',
        path: 'barLength',
        options: BAR_PRESETS.map((v) => ({ value: v, label: `${(v / 1000).toLocaleString('pt-BR')} m` })),
      }),
      slider(store, { label: 'Outro tamanho', path: 'barLength', step: 50 }),
      slider(store, { label: 'Espessura do disco', path: 'kerf', step: 0.5, hint: 'Material perdido em cada corte.' }),
      slider(store, { label: 'Refilo da ponta', path: 'trim', step: 1, hint: 'Descarte no início da barra (ponta amassada/torta).' }),
      dynamic(
        (st) => usedProfiles(project, P(st)).join(),
        (st) =>
          usedProfiles(project, P(st)).map((id) =>
            stepper(store, { label: `Barras ${perfilText(id)} que já tenho`, path: `owned.${id}`, unit: 'un' }),
          ),
      ),
    ],
  };
}

// Preço por metro de cada perfil usado, sapatas, tampas de ponta e consumíveis, mais
// controles extras do tipo (ex.: preço do tampo da mesa)
export function custosSection({ store, project, P }, extra = []) {
  return {
    id: 'custos',
    title: 'Custos',
    open: false,
    controls: [
      // Só recria os steppers quando muda o conjunto de perfis; o preço da barra na dica
      // acompanha barLength pelo update, sem reconstruir (nem perder o foco) a cada tick.
      dynamic(
        (st) => usedProfiles(project, P(st)).join(),
        (st) =>
          usedProfiles(project, P(st)).map((id) =>
            stepper(store, {
              label: `Preço por metro ${perfilText(id)}`,
              path: `meterPrices.${id}`,
              step: 0.5,
              prefix: 'R$',
              format: money,
              hint: (s) => {
                const m = (Number(s.meterPrices?.[id]) || 0) * ((Number(s.barLength) || 0) / 1000);
                return `Barra de ${((Number(s.barLength) || 0) / 1000).toLocaleString('pt-BR')} m: ${fmtMoney(m)}`;
              },
            }),
          ),
      ),
      when(
        (st, d) => d?.model.feet.some((f) => f.kind !== 'rodizio'),
        stepper(store, { label: 'Sapata (unidade)', path: 'feetPrice', step: 0.5, prefix: 'R$', format: money }),
      ),
      when(
        (st, d) => d?.model.feet.some((f) => f.kind === 'rodizio'),
        stepper(store, { label: 'Rodízio (unidade)', path: 'casterPrice', step: 0.5, prefix: 'R$', format: money }),
      ),
      when(
        (st, d) => d?.model.openEnds > 0,
        stepper(store, { label: 'Tampa de ponta (unidade)', path: 'capPrice', step: 0.5, prefix: 'R$', format: money }),
      ),
      stepper(store, { label: 'Consumíveis (eletrodo, disco, tinta)', path: 'extras', step: 5, prefix: 'R$', format: money }),
      ...extra,
    ],
  };
}
