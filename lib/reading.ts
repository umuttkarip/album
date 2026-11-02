import { bounds, type PageDoc } from './model';
import type { ReadingView } from './render';
export type ReadingMode='single'|'book';
export const readingPreferenceKey=(userId:string)=>'album:view:v2:'+userId;
export const initialReadingMode=(saved:unknown):ReadingMode=>saved==='book'?'book':'single';
export function readerPageSize(frame:{w:number;h:number},mode:ReadingMode,landscape=false){
  const rails=landscape&&frame.w>=720;
  const aspect=mode==='book'?1.6:.8,reserve=rails?0:landscape?54:76,edge=rails?248:landscape?28:40;
  const w=Math.max(80,Math.min(frame.w-edge,(frame.h-reserve-(rails?48:landscape?12:40))*aspect));
  return {w,h:w/aspect};
}
export function readingResolution(frame:{w:number;h:number},mode:ReadingMode,dpr=1){const aspect=mode==='book'?1.6:.8,css=Math.max(100,Math.min(frame.w-40,(frame.h-40)*aspect));return Math.min(mode==='book'?1792:1024,Math.max(256,Math.ceil(css*Math.min(1.5,Math.max(1,dpr))/128)*128));}
export function requiresOpenBook(doc:PageDoc){
  return !doc.cover&&doc.elements.some(e=>{if(e.type!=='photo'||e.w<=e.h)return false;const b=bounds(e);return b.min<998&&b.max>1002;});
}
export const readingMode=(view:ReadingView,preference:ReadingMode):ReadingMode=>requiresOpenBook(view.spread.doc)?'book':preference;
export function savedViewIndex(views:ReadingView[],saved:{key?:string;id?:string}|null){
  if(!saved)return 0;const exact=views.findIndex(v=>v.key===saved.key);if(exact>=0)return exact;return Math.max(0,views.findIndex(v=>v.spread.id===saved.id));
}
