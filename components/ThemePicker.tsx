import React,{useMemo} from 'react';
import {Check} from 'lucide-react';
import {designs,type DesignId} from '../lib/design';
import type {Asset} from '../lib/model';
import {themeDocument,themedCover,themedSpread} from '../lib/themes';
import {DocumentPreview} from './DocumentPreview';
export default function ThemePicker({value,onChange,photos=[],title='Album'}:{value:DesignId;onChange:(id:DesignId)=>void;photos?:Pick<Asset,'id'|'width'|'height'>[];title?:string}){
  const options=useMemo(()=>designs.map(d=>({design:d,cover:themedCover(photos,title||'Album',themeDocument(d.id,true)),spread:themedSpread(photos,themeDocument(d.id))})),[photos,title]);
  return <div className="theme-picker" role="group" aria-label="Albüm tasarımı">{options.map(({design,cover,spread})=><button type="button" key={design.id} className={'theme-option '+(value===design.id?'selected':'')} onClick={()=>onChange(design.id)} aria-pressed={value===design.id}><span className="theme-specimen"><span className="theme-cover"><DocumentPreview doc={cover}/></span><span className="theme-spread"><DocumentPreview doc={spread}/></span></span><span className="theme-name">{design.name}{value===design.id&&<Check size={16}/>}</span></button>)}</div>;
}
