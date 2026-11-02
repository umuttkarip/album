export const fonts = [
  { family: 'Commissioner', label: 'Commissioner' },
  { family: 'Literata', label: 'Literata' },
  { family: 'Caveat', label: 'Caveat' },
  { family: 'DM Serif Display', label: 'DM Serif Display' },
] as const;
export type FontFamily = typeof fonts[number]['family'];
export const paperNames = { ivory: 'Krem', mist: 'Gri', charcoal: 'Koyu', sage: 'Adaçayı', sand: 'Kum', lilac: 'Lila' };
export const textures = [{ id: 'plain', label: 'Düz' }, { id: 'dots', label: 'Noktalı' }, { id: 'lines', label: 'Çizgili' }] as const;

export const designs = [
  { id:'plain', name:'Düz', color:'#f8f7f2', ink:'#414544', pattern:'plain' },
  { id:'linen', name:'Keten', color:'#aebca7', ink:'#354537', pattern:'linen' },
  { id:'kraft', name:'Kraft', color:'#bb9771', ink:'#49392c', pattern:'grain' },
  { id:'gingham', name:'Kareli', color:'#c3cddd', ink:'#3d4d65', pattern:'gingham' },
  { id:'collage', name:'Kolaj', color:'#526378', ink:'#f8f2e6', pattern:'grain' },
  { id:'dark', name:'Koyu', color:'#333c3b', ink:'#eee9dc', pattern:'grain' },
] as const;
export type DesignId = typeof designs[number]['id'];
export type Pattern = 'plain'|'grain'|'linen'|'dots'|'lines'|'grid'|'gingham';
export type PaperSurface = {color:string;pattern:Pattern;ink?:string};
export const patterns: {id:Pattern;name:string}[] = [{id:'plain',name:'Düz'},{id:'grain',name:'Kâğıt'},{id:'linen',name:'Keten'},{id:'dots',name:'Noktalı'},{id:'lines',name:'Çizgili'},{id:'grid',name:'Kareli'},{id:'gingham',name:'Ekose'}];
export const surfaceColors=['#faf9f5','#f7f2e8','#dfd9c9','#cfb38e','#dce4d8','#dce4ee','#e4dfeb','#353d3c'];
export const validDesign = (id:unknown):id is DesignId => designs.some(d=>d.id===id);
