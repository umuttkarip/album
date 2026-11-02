import React, { useEffect, useRef } from 'react';
import type { PageDoc } from '../lib/model';
import { paintDoc } from '../lib/render';
import { fonts, type FontFamily } from '../lib/design';

export function DocumentPreview({doc}:{doc:PageDoc}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let active=true;void paintDoc(doc,320).then(canvas=>{if(active&&ref.current){ref.current.width=canvas.width;ref.current.height=canvas.height;ref.current.getContext('2d')!.drawImage(canvas,0,0);}canvas.width=canvas.height=1;});return()=>{active=false;};},[doc]);
  return <span className="template-thumb"><canvas ref={ref}/></span>;
}
export function FontPicker({value,onChange}:{value:FontFamily;onChange:(font:FontFamily)=>void}){
  return <div className="font-options" role="group" aria-label="Yazı tipi">{fonts.map(font=><button key={font.family} type="button" style={{fontFamily:font.family}} className={value===font.family?'active':''} aria-pressed={value===font.family} onClick={()=>onChange(font.family)}>{font.label}</button>)}</div>;
}
