import { bounds, type PageDoc } from './model';
import type { ReadingView } from './render';
export type ReadingMode='single'|'book';
export function requiresOpenBook(doc:PageDoc){
  return !doc.cover&&doc.elements.some(e=>{if(e.type!=='photo'||e.w<=e.h)return false;const b=bounds(e);return b.min<998&&b.max>1002;});
}
export const readingMode=(view:ReadingView,preference:ReadingMode):ReadingMode=>requiresOpenBook(view.spread.doc)?'book':preference;
export function savedViewIndex(views:ReadingView[],saved:{key?:string;id?:string}|null){
  if(!saved)return 0;const exact=views.findIndex(v=>v.key===saved.key);if(exact>=0)return exact;return Math.max(0,views.findIndex(v=>v.spread.id===saved.id));
}
