import React from 'react';
import {BOOK_HEIGHT,BOOK_BLEED,paperRect,bindingRects,type BoundBook} from '../lib/book-stack';

/** The no-WebGL/reduced-motion book uses the same paper geometry as the 3D scene. */
export default function BookBinding({model,cursor,height,cover}:{model:BoundBook;cursor:number;height:number;cover:boolean}){
  const unit=BOOK_HEIGHT/Math.max(1,height),bleed=BOOK_BLEED*unit,width=model.book?2:1,center=model.book&&cover?.5:0;
  const paper=model.leaves.flatMap(leaf=>{const rect=paperRect(model,leaf,cursor,unit);return rect?[rect]:[];}).sort((a,b)=>a.z-b.z);
  return <svg className="book-underlay" aria-hidden="true" viewBox={`${center-width/2-bleed} ${-BOOK_HEIGHT/2-bleed} ${width+bleed*2} ${BOOK_HEIGHT+bleed*2}`}>
    <g className="binding-shadow">{bindingRects(model,cursor,unit).map(r=><rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={unit*4} fill={r.color}/>)}</g>
    {paper.map(r=><rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={unit*3} fill={r.color}/>)}
  </svg>;
}
