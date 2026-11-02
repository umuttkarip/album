import React,{useMemo,useState} from 'react';
import {Check} from 'lucide-react';
import {designs,type DesignId} from '../lib/design';
import type {Asset} from '../lib/model';
import {themeDocument,themedCover,themedSpread} from '../lib/themes';
import {DocumentPreview} from './DocumentPreview';
import {bookStyle} from '../lib/book-style';
export default function ThemePicker({value,onChange,photos=[],title='Album',expanded=false}:{value:DesignId;onChange:(id:DesignId)=>void;photos?:Pick<Asset,'id'|'width'|'height'>[];title?:string;expanded?:boolean}){
  const [surface,setSurface]=useState<'cover'|'spread'>('cover'),[withPhotos,setWithPhotos]=useState(true);
  const options=useMemo(()=>designs.map(d=>({design:d,cover:themedCover(photos,title||'Album',themeDocument(d.id,true)),empty:themedCover([],title||'Album',themeDocument(d.id,true)),spread:themedSpread(photos,themeDocument(d.id))})),[photos,title]);
  const selected=options.find(o=>o.design.id===value)!;
  return <div className={'theme-selector'+(expanded?' expanded':'')}>
    {expanded&&<div className="design-preview">
      <div className="design-preview-tools"><div className="preview-tabs" role="group" aria-label="Tasarım önizlemesi"><button type="button" aria-pressed={surface==='cover'} onClick={()=>setSurface('cover')}>Kapak</button><button type="button" aria-pressed={surface==='spread'} onClick={()=>setSurface('spread')}>Açık sayfa</button></div>{photos.length>0&&surface==='cover'&&<button type="button" className="preview-content-toggle" aria-pressed={withPhotos} onClick={()=>setWithPhotos(v=>!v)}>{withPhotos?'Fotoğrafsız gör':'Fotoğraflı gör'}</button>}</div>
      <div className={'design-preview-desk '+surface} style={bookStyle(selected.cover)}><div className="design-preview-book"><DocumentPreview doc={surface==='spread'?selected.spread:withPhotos?selected.cover:selected.empty} width={surface==='spread'?960:640}/></div></div>
      <div className="design-preview-caption"><span>{selected.design.name}</span><span>{photos.length>0&&(surface==='spread'||withPhotos)?'Örnek fotoğraflarla':'Fotoğrafsız kapak'}</span></div>
    </div>}
    <div className="theme-picker" role="group" aria-label="Albüm tasarımı">{options.map(({design,cover,spread})=><button type="button" key={design.id} aria-label={design.name} className={'theme-option '+(value===design.id?'selected':'')} onClick={()=>onChange(design.id)} aria-pressed={value===design.id}><span className="theme-specimen"><span className="theme-cover"><DocumentPreview doc={cover} width={160}/></span><span className="theme-spread"><DocumentPreview doc={spread} width={240}/></span></span><span className="theme-name">{design.name}{value===design.id&&<Check size={15}/>}</span></button>)}</div>
  </div>;
}
