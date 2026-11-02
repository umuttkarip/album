import React from 'react';
import type { PageDoc } from '../lib/model';
import PagePreview from './PagePreview';
import {paperStyle} from '../lib/book-style';
import { fonts, type FontFamily } from '../lib/design';

export function DocumentPreview({doc,width=320}:{doc:PageDoc;width?:number}){
  return <span className="template-thumb" role="img" aria-label={doc.cover?'Kapak önizlemesi':'Sayfa önizlemesi'} style={{...paperStyle(doc),aspectRatio:doc.cover?'4/5':'8/5'}}><PagePreview doc={doc} width={width}/></span>;
}
export function FontPicker({value,onChange}:{value:FontFamily;onChange:(font:FontFamily)=>void}){
  return <div className="font-options" role="group" aria-label="Yazı tipi">{fonts.map(font=><button key={font.family} type="button" style={{fontFamily:font.family}} className={value===font.family?'active':''} aria-pressed={value===font.family} onClick={()=>onChange(font.family)}>{font.label}</button>)}</div>;
}
