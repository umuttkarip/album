import { bounds, type PageDoc,type Spread } from './model';
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
export function physicalPageStacks(spreads:Spread[],current:ReadingView,mode:ReadingMode=current.region==='full'?'book':'single'){
  const faces=spreads.filter(s=>!s.doc.cover).flatMap<ReadingView>(s=>(['left','right'] as const).map((region,i)=>({spread:s,region,key:s.id+':'+region,label:String(s.position*2+1+i)})));
  const first=current.region==='cover'?0:Math.max(0,faces.findIndex(v=>v.spread.id===current.spread.id));
  const start=first+(current.region==='right'?1:0),end=current.region==='cover'?0:first+(current.region==='full'?2:current.region==='right'?2:1);
  // A right-hand turn reveals the next right face underneath; the next left face
  // is the reverse of the turning sheet, not a page lying behind the book.
  const left=mode==='book'?faces.slice(0,first).filter(v=>v.region==='left').reverse().slice(0,2):faces.slice(Math.max(0,start-2),start).reverse();
  const right=mode==='book'?faces.slice(end).filter(v=>v.region==='right').slice(0,2):faces.slice(end,end+2);
  return {left,right,leftDepth:current.region==='cover'?0:Math.min(10,1.5+start*.16),rightDepth:Math.min(10,Math.max(0,faces.length-end)*.16+1.5)};
}
export function readingResolution(frame:{w:number;h:number},mode:ReadingMode,dpr=1){const aspect=mode==='book'?1.6:.8,css=Math.max(100,Math.min(frame.w-40,(frame.h-40)*aspect));return Math.min(mode==='book'?1792:1024,Math.max(256,Math.ceil(css*Math.min(1.5,Math.max(1,dpr))/128)*128));}
export function requiresOpenBook(doc:PageDoc){
  return !doc.cover&&doc.elements.some(e=>{if(e.type!=='photo'||e.w<=e.h)return false;const b=bounds(e);return b.min<998&&b.max>1002;});
}
export const readingMode=(view:ReadingView,preference:ReadingMode):ReadingMode=>requiresOpenBook(view.spread.doc)?'book':preference;
export function savedViewIndex(views:ReadingView[],saved:{key?:string;id?:string}|null){
  if(!saved)return 0;const exact=views.findIndex(v=>v.key===saved.key);if(exact>=0)return exact;return Math.max(0,views.findIndex(v=>v.spread.id===saved.id));
}
