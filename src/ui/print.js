import { cutListHTML, planHTML, costsHTML } from './report.js';
import { fmt } from './dom.js';
import { profileLabel } from '../model/catalog.js';

const ASSEMBLY = { sob: 'Quadro sobre as pernas', passante: 'Pernas até o tampo' };
const CORNER = { '45': 'Meia-esquadria 45°', reto: 'Reto (topo)' };
const STRETCHER = { nenhuma: 'Sem travessa', laterais: 'Laterais', u: 'Em U (laterais + fundo)', h: 'Em H', perimetral: 'Perímetro' };

export function printReport(state, d, snapshot) {
  const root = document.getElementById('print-root');
  const pr = d.model.profiles;
  const union = state.assembly === 'passante' ? ASSEMBLY.passante : `${ASSEMBLY.sob} · ${CORNER[state.corner]}`;
  const perfis = state.sameProfile
    ? profileLabel(pr.frame)
    : `pernas ${profileLabel(pr.leg)} · quadro ${profileLabel(pr.frame)}${state.stretcher !== 'nenhuma' ? ` · travessas ${profileLabel(pr.stretcher)}` : ''}`;

  root.innerHTML = `
    <header class="p-head">
      <div>
        <h1>Mesa ${fmt(state.length)} × ${fmt(state.width)} × ${fmt(state.height)} mm</h1>
        <p>${state.qty} ${state.qty > 1 ? 'mesas' : 'mesa'} · metalon ${perfis} · chapa #${state.chapa}</p>
      </div>
      <p class="p-brand">MesaForja<br><small>${new Date().toLocaleDateString('pt-BR')}</small></p>
    </header>
    <div class="p-grid">
      <section class="p-hero">
        <img src="${snapshot}" alt="Estrutura da mesa">
        <dl>
          <div><dt>Montagem</dt><dd>${union}</dd></div>
          <div><dt>Reforços sob o tampo</dt><dd>${state.braces}</dd></div>
          <div><dt>Travessa inferior</dt><dd>${STRETCHER[state.stretcher]}${state.stretcher !== 'nenhuma' ? ` a ${fmt(state.stretcherHeight)} mm do chão` : ''}</dd></div>
          <div><dt>Tampo</dt><dd>${fmt(state.topThickness)} mm · beiral ${fmt(d.model.dims.O)} mm</dd></div>
          <div><dt>Estrutura (quadro)</dt><dd>${fmt(d.model.dims.fL)} × ${fmt(d.model.dims.fW)} mm</dd></div>
          <div><dt>Barras</dt><dd>${fmt(state.barLength)} mm · disco ${fmt(state.kerf)} mm · refilo ${fmt(state.trim)} mm</dd></div>
        </dl>
        ${d.warnings.length ? `<div class="p-warn">${d.warnings.map((w) => `<p>⚠ ${w}</p>`).join('')}</div>` : ''}
      </section>
      <section class="p-side">
        <h2>Lista de cortes</h2>
        ${cutListHTML(d.cutList)}
        <p class="legend">Medidas na ponta maior. Peças 45°/45° são trapézios: corte alternando o lado para aproveitar o ângulo.</p>
        <h2>Custos estimados</h2>
        ${costsHTML(d.costs, state)}
      </section>
    </div>
    <section class="p-page">
      <h2>Plano de corte das barras</h2>
      <div class="p-plan">${planHTML(d.plan, d.cutList)}</div>
      <p class="legend"><span class="key-trim"></span> refilo &nbsp; <span class="key-waste"></span> perda do 1º corte a 45° &nbsp; <span class="key-left"></span> sobra · disco de ${fmt(state.kerf)} mm por corte</p>
    </section>
  `;

  const img = root.querySelector('img');
  const go = () => window.print();
  if (img.complete) go();
  else img.onload = go;
}
