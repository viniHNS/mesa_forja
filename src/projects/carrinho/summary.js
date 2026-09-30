import { fmt } from '../../ui/dom.js';
import { TOP_MATERIALS } from '../../model/catalog.js';

/**
 * Título e linhas de resumo do PDF. Texto puro: quem monta o HTML escapa.
 * @param params parâmetros do carrinho
 * @param d      resultado do derive (usa d.model.dims)
 */
export function carrinhoSummary(params, d) {
  const dims = d.model.dims;
  const material = TOP_MATERIALS.find((m) => m.id === params.panelMaterial)?.label ?? '';
  const rows = [
    ['Bandejas', `${fmt(dims.n)} de ${fmt(dims.L)} × ${fmt(dims.W)} mm · ${material} ${fmt(dims.T)} mm`],
    ['Vão livre entre bandejas', `${fmt(dims.gap)} mm`],
    ['Reforços por bandeja', fmt(params.braces)],
    ['Rodízios', `4 de ${dims.caster.label} · ${fmt(dims.caster.h)} mm de altura`],
    ['Alça', params.handle ? `Em U no lado direito, ${fmt(dims.out)} mm para fora` : 'Sem alça'],
  ];
  if (dims.T > 0 && dims.n > 1) {
    rows.push(['Recorte das placas', `${fmt(dims.px)} × ${fmt(dims.pz)} mm nos 4 cantos (menos a de cima)`]);
  }
  return {
    title: `Carrinho ${fmt(params.length)} × ${fmt(params.width)} × ${fmt(params.height)} mm`,
    rows,
  };
}
