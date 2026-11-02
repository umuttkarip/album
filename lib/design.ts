export const fonts = [
  { family: 'Commissioner', label: 'Commissioner' },
  { family: 'Literata', label: 'Literata' },
  { family: 'Caveat', label: 'Caveat' },
  { family: 'DM Serif Display', label: 'DM Serif Display' },
] as const;
export type FontFamily = typeof fonts[number]['family'];
export const paperNames = { ivory: 'Krem', mist: 'Gri', charcoal: 'Koyu', sage: 'Adaçayı', sand: 'Kum', lilac: 'Lila' };
export const textures = [{ id: 'plain', label: 'Düz' }, { id: 'dots', label: 'Noktalı' }, { id: 'lines', label: 'Çizgili' }] as const;
