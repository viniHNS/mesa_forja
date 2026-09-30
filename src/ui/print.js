import { cutListHTML, planHTML, costsHTML } from './report.js';
import { esc, fmt } from './dom.js';
import { perfilText, chapaOf, nounFor } from './options.js';

// "pernas 30×30 · quadro 20×30" (ou só "20×30" com um perfil só), a partir das funções
// (roles) do tipo; funções que não se aplicam (ex.: sem travessa) ficam de fora
function profilesText(project, params, profiles) {
  if (params.sameProfile) return perfilText(params.profile);
  return project.roles
    .filter((r) => (r.when ? r.when(params) : true))
    .map((r) => `${r.short ?? r.label} ${perfilText(profiles[r.id])}`)
    .join(' · ');
}

// limpeza agendada da impressão anterior (afterprint + folga)
let pending = null;
const cancelPending = () => {
  if (!pending) return;
  clearTimeout(pending.timer);
  window.removeEventListener('afterprint', pending.onAfter);
  pending = null;
};

export function printReport(state, d, snapshot) {
  const root = document.getElementById('print-root');
  cancelPending();
  const { project, params } = d;
  const summary = project.summary(params, d);
  const perfis = profilesText(project, params, d.profiles);
  const chapa = chapaOf(state.chapa);
  const rows = [...summary.rows, ['Barras', `${fmt(state.barLength)} mm · disco ${fmt(state.kerf)} mm · refilo ${fmt(state.trim)} mm`]];

  root.innerHTML = `
    <header class="p-head">
      <div>
        <h1>${esc(summary.title)}</h1>
        <p>${fmt(state.qty)} ${esc(nounFor(project.noun, state.qty))} · metalon ${esc(perfis)}${chapa ? ` · chapa #${chapa.id}` : ''}</p>
      </div>
      <p class="p-brand">MesaForja<br><small>${new Date().toLocaleDateString('pt-BR')}</small></p>
    </header>
    <div class="p-grid">
      <section class="p-hero">
        ${snapshot ? `<img src="${esc(snapshot)}" alt="Estrutura: ${esc(project.label)}">` : ''}
        <dl>
          ${rows.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${esc(dd)}</dd></div>`).join('')}
        </dl>
        ${d.warnings.length ? `<div class="p-warn">${d.warnings.map((w) => `<p>⚠ ${esc(w)}</p>`).join('')}</div>` : ''}
      </section>
      <section class="p-side">
        <h2>Lista de cortes</h2>
        ${cutListHTML(d.cutList, project.groups)}
        <p class="legend">Medidas na ponta maior. Peças 45°/45° são trapézios: corte alternando o lado para aproveitar o ângulo.</p>
        <h2>Custos estimados</h2>
        ${costsHTML(d.costs, state, project.noun)}
      </section>
    </div>
    <section class="p-page">
      <h2>Plano de corte das barras</h2>
      <div class="p-plan">${planHTML(d.plan, d.cutList, project.groups)}</div>
      <p class="legend"><span class="key-trim"></span> refilo &nbsp; <span class="key-waste"></span> perda do 1º corte a 45° &nbsp; <span class="key-left"></span> sobra · disco de ${fmt(state.kerf)} mm por corte</p>
    </section>
  `;

  // Depois de imprimir, esvazia o #print-root para soltar o PNG em base64 da memória.
  // A folga cobre navegadores móveis em que o afterprint chega antes da página ser gerada.
  const job = { timer: 0 };
  job.onAfter = () => {
    window.removeEventListener('afterprint', job.onAfter);
    job.timer = setTimeout(() => {
      if (pending === job) pending = null;
      root.replaceChildren();
    }, 1500);
  };
  pending = job;
  window.addEventListener('afterprint', job.onAfter);

  let printed = false;
  const go = () => {
    if (printed) return;
    printed = true;
    window.print();
  };
  const img = root.querySelector('img');
  if (!img) return go();
  // imagem que não carrega não pode travar a impressão: imprime sem ela
  const fail = () => {
    img.remove();
    go();
  };
  img.onload = go;
  img.onerror = fail;
  if (img.complete) (img.naturalWidth ? go : fail)();
}
