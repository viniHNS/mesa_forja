import { CASTERS } from '../../model/catalog.js';

// Opções do carrinho usadas pela barra lateral (label/sub) e pelo PDF.
export const CASTER_OPTIONS = CASTERS.map((c) => ({ value: c.id, label: c.label, sub: `${c.h} mm` }));
