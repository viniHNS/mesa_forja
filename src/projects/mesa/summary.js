import { fmt } from '../../ui/dom.js';
import { optionText } from '../../ui/options.js';
import { ASSEMBLY_OPTIONS, CORNER_OPTIONS, STRETCHER_OPTIONS } from './options.js';

/**
 * Título e linhas de resumo do PDF. Texto puro: quem monta o HTML escapa.
 * @param params parâmetros da mesa
 * @param d      resultado do derive (usa d.model.dims)
 */
export function mesaSummary(params, d) {
  const dims = d.model.dims;
  const union =
    params.assembly === 'passante'
      ? optionText(ASSEMBLY_OPTIONS, 'passante')
      : `${optionText(ASSEMBLY_OPTIONS, 'sob')} · ${optionText(CORNER_OPTIONS, params.corner)}`;
  const stretcher = `${optionText(STRETCHER_OPTIONS, params.stretcher)}${params.stretcher !== 'nenhuma' ? ` a ${fmt(params.stretcherHeight)} mm do chão` : ''}`;
  return {
    title: `Mesa ${fmt(params.length)} × ${fmt(params.width)} × ${fmt(params.height)} mm`,
    rows: [
      ['Montagem', union],
      ['Reforços sob o tampo', fmt(params.braces)],
      ['Travessa inferior', stretcher],
      ['Tampo', `${fmt(params.topThickness)} mm · beiral ${fmt(dims.O)} mm`],
      ['Estrutura (quadro)', `${fmt(dims.fL)} × ${fmt(dims.fW)} mm`],
    ],
  };
}
