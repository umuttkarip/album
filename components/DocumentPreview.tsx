import React,{useState} from 'react';
import type { PageDoc } from '../lib/model';
import PagePreview from './PagePreview';
import {paperStyle} from '../lib/book-style';
import { fonts, type FontFamily } from '../lib/design';

export function DocumentPreview({doc,width=320,loadingLabel=false}:{doc:PageDoc;width?:number;loadingLabel?:boolean}){
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  return <span className="template-thumb" role="img" aria-busy={loadingLabel&&status==='loading'} aria-label={doc.cover?'Kapak önizlemesi':'Sayfa önizlemesi'} style={{...paperStyle(doc),aspectRatio:doc.cover?'4/5':'8/5'}}><PagePreview doc={doc} width={width} onStatus={loadingLabel?setStatus:undefined}/>{loadingLabel&&status!=='ready'&&<span className="preview-loading-label">{status==='loading'?'Yükleniyor':'Önizleme yüklenemedi'}</span>}</span>;
}
export function FontPicker({value,onChange}:{value:FontFamily;onChange:(font:FontFamily)=>void}){
  return <div className="font-options" role="group" aria-label="Yazı tipi">{fonts.map(font=><button key={font.family} type="button" style={{fontFamily:font.family}} className={value===font.family?'active':''} aria-pressed={value===font.family} onClick={()=>onChange(font.family)}>{font.label}</button>)}</div>;
}
