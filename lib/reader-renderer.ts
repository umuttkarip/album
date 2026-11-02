import {AsyncCache} from './async-cache';
import {paintDoc,paintView,type ReadingView} from './render';
import type {PageDoc} from './model';
export function createReaderRenderer(){
  const docs=new AsyncCache<HTMLCanvasElement>(4),views=new AsyncCache<HTMLCanvasElement>(6),ids=new WeakMap<PageDoc,number>();let next=0;
  const id=(doc:PageDoc)=>{let key=ids.get(doc);if(!key){key=++next;ids.set(doc,key);}return key;};
  const source=(doc:PageDoc,width:number)=>docs.get(id(doc)+':'+width,()=>paintDoc(doc,width));
  return {view:(v:ReadingView,mode:'single'|'book',width:number)=>views.get(id(v.spread.doc)+':'+v.key+':'+mode+':'+width,()=>paintView(v,mode,width,source)),clear:()=>{views.clear();docs.clear();}};
}
