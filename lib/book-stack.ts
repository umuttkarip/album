import type {Spread} from './model';
import type {ReadingView} from './render';
import type {ReadingMode} from './reading';
import {paperSurface} from './paper';

export const BOOK_HEIGHT=1.25;
export const BOOK_BLEED=18;
export type BoundLeaf={id:string;index:number;front:string;back:string};
export type BoundBook={book:boolean;cloth:string;leaves:BoundLeaf[]};
export type PaperRect={id:string;x:number;y:number;w:number;h:number;z:number;color:string;side:'left'|'right'};

/** One identity per physical sheet. Page navigation never rebuilds this list. */
export function boundBook(spreads:Spread[],mode:ReadingMode):BoundBook{
  const cover=spreads.find(s=>s.doc.cover),pages=spreads.filter(s=>!s.doc.cover);
  const cloth=cover?paperSurface(cover.doc).color:'#aebca7';
  const front:BoundLeaf={id:cover?.id||'binding',index:-1,front:cloth,back:pages[0]?paperSurface(pages[0].doc).color:cloth};
  const leaves=mode==='book'?pages.map((s,i)=>({id:s.id,index:i,front:paperSurface(s.doc,'right').color,back:paperSurface(pages[i+1]?.doc||s.doc,'left').color}))
    :pages.flatMap((s,i)=>(['left','right'] as const).map((side,j)=>({id:s.id+':'+side,index:i*2+j,front:paperSurface(s.doc,side).color,back:paperSurface(s.doc,side).color})));
  return {book:mode==='book',cloth,leaves:[front,...leaves]};
}
export function boundCursor(spreads:Spread[],view:ReadingView,mode:ReadingMode){
  if(view.region==='cover')return -1;
  const index=Math.max(0,spreads.filter(s=>!s.doc.cover).findIndex(s=>s.id===view.spread.id));
  return mode==='book'?index:index*2+(view.region==='right'?1:0);
}
export const paperPitch=(model:BoundBook)=>Math.min(.42,8.5/Math.max(1,model.leaves.length));
/** The left binding is exposed only after the rigid cover crosses the spine. */
export function coverOpenness(sourceCover:boolean,targetCover:boolean,progress:number){
  if(sourceCover)return Math.max(0,-Math.cos(Math.PI*progress));
  if(targetCover)return Math.max(0,Math.cos(Math.PI*progress));
  return 1;
}
export function edgeInk(color:string,index:number){
  const shade=index%2===0?.975:.94;
  return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*shade).toString(16).padStart(2,'0')).join('');
}

/** Continuous position in the binding, including fractional turns and cancelled drags. */
export function paperRect(model:BoundBook,leaf:BoundLeaf,cursor:number,unit:number):PaperRect|null{
  const left=model.book&&leaf.index<=cursor-1+1e-7;
  if(!left&&leaf.index<cursor-1e-7)return null; // This is the sheet currently turning.
  const distance=Math.max(0,left?cursor-1-leaf.index:leaf.index-cursor),depth=distance*paperPitch(model);
  const w=1+depth*unit*.42;
  return {id:leaf.id,side:left?'left':'right',x:model.book?(left?-w:0):-.5,y:-BOOK_HEIGHT/2+depth*unit*.78,w,h:BOOK_HEIGHT,z:-.012-depth*.001,color:edgeInk(left?leaf.back:leaf.front,leaf.index)};
}
export function bindingRects(model:BoundBook,cursor:number,unit:number,openness=model.book?Math.max(0,Math.min(1,cursor+1)):0):PaperRect[]{
  const last=model.leaves.at(-1)?.index||0,pitch=paperPitch(model);
  const sides:('left'|'right')[]=model.book&&openness>0?['left','right']:['right'];
  return sides.map(side=>{
    const left=side==='left',depth=Math.max(0,left?cursor:last-cursor)*pitch,margin=2.5*unit;
    const w=(1+margin*2)*(left?openness:1),spine=model.book?0:-.5;
    return {id:'board-'+side,side,x:left?-w+margin:spine-margin,y:-BOOK_HEIGHT/2-margin+depth*unit*.78,w,h:BOOK_HEIGHT+margin*2,z:-.16,color:edgeInk(model.cloth,1)};
  });
}
