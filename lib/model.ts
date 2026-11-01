import { apiUrl } from './network';
export const PAGE_W = 1000, PAGE_H = 1250, SPREAD_W = 2000;
export type User = { id: 'umut' | 'sude'; name: string; admin: boolean };
export type Paper = 'ivory' | 'mist' | 'charcoal';
export const papers: Record<Paper, string> = { ivory: '#f2efe7', mist: '#e6e8e5', charcoal: '#343939' };
export type ElementType = 'photo' | 'text' | 'sticker' | 'stroke';
export type PageElement = {
  id: string; type: ElementType; x: number; y: number; w: number; h: number;
  rotation: number; opacity: number; assetId?: string; stickerId?: string;
  text?: string; font?: 'Commissioner' | 'Literata'; size?: number; color?: string;
  align?: 'left' | 'center' | 'right'; fit?: 'contain' | 'cover'; frame?: boolean;
  crop?: { scale: number; x: number; y: number }; points?: number[]; eraser?: boolean;
  caption?: string; date?: string;
};
export type PageDoc = { version: 1; paper: Paper; cover: boolean; elements: PageElement[] };
export type Spread = { id: string; album_id: string; position: number; revision: number; doc: PageDoc; lock_owner?: string | null; lock_expires?: number };
export type Asset = { id: string; album_id: string; kind: 'photo' | 'sticker'; filename: string; mime: string; width: number; height: number; created_by: string; ready: number };
export type Album = { id: string; title: string; description: string; visibility: 'shared' | 'personal'; owner_id: string; paper: Paper; created_at: number; updated_at: number; photo_count?: number; cover_asset_id?: string; cover_doc?: PageDoc };
export const uid = () => crypto.randomUUID();
export const blankDoc = (paper: Paper = 'ivory', cover = false): PageDoc => ({ version: 1, paper, cover, elements: [] });
export const canRead = (u: User, a: Pick<Album, 'visibility' | 'owner_id'>) => u.admin || a.visibility === 'shared' || a.owner_id === u.id;
export const canEdit = (u: User, a: Pick<Album, 'visibility' | 'owner_id'>) => a.visibility === 'shared' || a.owner_id === u.id;
export const assetUrl = (id: string, variant = 'display') => apiUrl(`assets/${encodeURIComponent(id)}/${variant}`);
export const newElement = (type: ElementType, extra: Partial<PageElement> = {}): PageElement => ({ id: uid(), type, x: 100, y: 150, w: 650, h: 800, rotation: 0, opacity: 1, ...extra });
export const templates = [
  { id: 'single', name: 'Ortada', count: 2, description: 'Her sayfada bir fotoğraf' },
  { id: 'full', name: 'Tam sayfa', count: 2, description: 'Kenarlara kadar fotoğraf' },
  { id: 'duo', name: 'İkili', count: 4, description: 'Her sayfada iki fotoğraf' },
  { id: 'grid', name: 'Dörtlü', count: 8, description: 'Dört fotoğraflı sayfalar' },
  { id: 'note', name: 'Fotoğraf ve not', count: 2, description: 'Fotoğrafa bir cümle ekle' },
  { id: 'panorama', name: 'Çift sayfa', count: 1, description: 'İki sayfaya yayılan tek fotoğraf' },
];
export function applyTemplate(id: string, assets: readonly Pick<Asset, 'id' | 'width' | 'height'>[], paper: Paper = 'ivory', cover = false): PageDoc {
  const doc = blankDoc(paper, cover); let n = 0;
  if (id === 'panorama' && !cover) {
    if (assets[0]) doc.elements.push(newElement('photo', { assetId: assets[0].id, x: 0, y: 160, w: 2000, h: 930, fit: 'contain' }));
    return doc;
  }
  for (let page = 0; page < (cover ? 1 : 2); page++) {
    const offset = page * PAGE_W;
    const cells = id === 'grid' ? [[75,160,405,405],[520,160,405,405],[75,660,405,405],[520,660,405,405]]
      : id === 'duo' ? [[80,110,840,480],[80,660,840,480]]
      : id === 'full' ? [[0,0,1000,1250]] : id === 'note' ? [[90,140,820,800]] : [[90,150,820,950]];
    for (const [x,y,w,h] of cells) { const a = assets[n++]; if (a) doc.elements.push(newElement('photo', { assetId: a.id, x: x + offset, y, w, h, fit: id === 'full' || id === 'grid' ? 'cover' : 'contain', frame: id !== 'full' })); }
    if (id === 'note' && doc.elements.some(e => e.x >= offset && e.x < offset + PAGE_W)) doc.elements.push(newElement('text', { x: offset + 100, y: 1020, w: 800, h: 120, text: 'Bir not ekle', size: 35, font: 'Literata', color: paper === 'charcoal' ? '#e6e8df' : '#444b47', align: 'center' }));
  }
  return doc;
}
export function bounds(e: PageElement) {
  const r = e.rotation * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const xs = [[0,0],[e.w,0],[0,e.h],[e.w,e.h]].map(([x,y]) => e.x + x*c-y*s);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}
export const spansCenter = (d: PageDoc) => !d.cover && d.elements.some(e => { const b = bounds(e); return b.min < 998 && b.max > 1002; });
export function validDoc(value: unknown): value is PageDoc {
  if (!value || typeof value !== 'object') return false;
  const d = value as PageDoc;
  if (d.version !== 1 || !Object.hasOwn(papers,d.paper) || typeof d.cover !== 'boolean' || !Array.isArray(d.elements) || d.elements.length > 1200) return false;
  const ids = new Set<string>();
  return d.elements.every(e => {
    if (!e || typeof e.id !== 'string' || e.id.length > 80 || ids.has(e.id) || !['photo','text','sticker','stroke'].includes(e.type)) return false;
    ids.add(e.id);
    if (![e.x,e.y,e.w,e.h,e.rotation,e.opacity].every(Number.isFinite) || e.w <= 0 || e.h <= 0 || Math.abs(e.x) > 8000 || Math.abs(e.y) > 8000 || e.w > 8000 || e.h > 8000 || e.opacity < 0 || e.opacity > 1) return false;
    if (e.type === 'photo' && typeof e.assetId !== 'string') return false;
    if (e.caption!==undefined && (typeof e.caption!=='string'||e.caption.length>500)) return false;
    if (e.date!==undefined && (typeof e.date!=='string'||(e.date!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(e.date)))) return false;
    if (e.type === 'text' && (typeof e.text !== 'string' || e.text.length > 5000 || !['Commissioner','Literata'].includes(e.font || 'Commissioner') || !Number.isFinite(e.size) || e.size! < 8 || e.size! > 200)) return false;
    if (e.type === 'stroke' && (!Array.isArray(e.points) || e.points.length < 4 || e.points.length % 2 || e.points.length > 20000 || !e.points.every(Number.isFinite) || !Number.isFinite(e.size) || e.size! < 1 || e.size! > 100)) return false;
    if (e.crop && (![e.crop.scale,e.crop.x,e.crop.y].every(Number.isFinite) || e.crop.scale < 1 || e.crop.scale > 8 || Math.abs(e.crop.x) > 1 || Math.abs(e.crop.y) > 1)) return false;
    return !e.color || /^#[a-f\d]{6}$/i.test(e.color);
  });
}
export function photoBox(e: PageElement, iw: number, ih: number) {
  const scale = (e.fit === 'cover' ? Math.max(e.w / iw, e.h / ih) : Math.min(e.w / iw, e.h / ih)) * (e.crop?.scale || 1);
  const w = iw * scale, h = ih * scale;
  return { x: (e.w - w) / 2 + (e.crop?.x || 0) * Math.max(0, w - e.w) / 2, y: (e.h - h) / 2 + (e.crop?.y || 0) * Math.max(0, h - e.h) / 2, w, h };
}
export function captionText(e: PageElement) {let date='';if(e.date){const d=new Date(e.date+'T12:00:00');if(!Number.isNaN(d.getTime()))date=new Intl.DateTimeFormat('tr',{day:'numeric',month:'long',year:'numeric'}).format(d);}return [e.caption,date].filter(Boolean).join('\n');}
