import React,{useEffect,useRef,useState} from 'react';
import {MoreHorizontal,Trash2,X} from 'lucide-react';
import type {Asset} from '../lib/model';
import Dialog from './Dialog';
import {createPortal} from 'react-dom';

export default function PhotoTile({asset,children,className='',imageClassName='',imageStyle,onOpen,onRemove,openLabel='Fotoğrafı aç',disabled=false}:{asset:Asset;children:React.ReactNode;className?:string;imageClassName?:string;imageStyle?:React.CSSProperties;onOpen:()=>void;onRemove?:()=>void;openLabel?:string;disabled?:boolean}){
  const [menu,setMenu]=useState(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),start=useRef<{x:number;y:number}|null>(null),consumed=useRef(false);
  const clear=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;start.current=null;};
  useEffect(()=>()=>clear(),[]);
  return <div className={'photo-tile '+className} onDragStart={e=>e.preventDefault()}>
    <button type="button" className={'photo-tile-open '+imageClassName} style={imageStyle} disabled={disabled} aria-label={asset.filename} onContextMenu={e=>{e.preventDefault();if(!disabled){consumed.current=true;setMenu(true);}}} onPointerDown={e=>{clear();consumed.current=false;if(disabled||e.pointerType==='mouse'||!e.isPrimary)return;start.current={x:e.clientX,y:e.clientY};timer.current=setTimeout(()=>{consumed.current=true;setMenu(true);clear();},500);}} onPointerMove={e=>{if(start.current&&Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>8)clear();}} onPointerUp={clear} onPointerCancel={clear} onClick={e=>{if(consumed.current){e.preventDefault();consumed.current=false;return;}onOpen();}}>{children}</button>
    <button type="button" className="photo-menu-trigger icon-button" disabled={disabled} aria-label={asset.filename+' seçenekleri'} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(true)}><MoreHorizontal size={20}/></button>
    {menu&&createPortal(<Dialog className="photo-options" label="Fotoğraf seçenekleri" onClose={()=>setMenu(false)}><div className="modal-heading"><h2>Fotoğraf</h2><button type="button" className="icon-button" aria-label="Seçenekleri kapat" onClick={()=>setMenu(false)}><X/></button></div><button type="button" className="photo-option-action" onClick={()=>{setMenu(false);onOpen();}}>{openLabel}</button>{onRemove&&<button type="button" className="photo-option-action danger-text" onClick={()=>{setMenu(false);onRemove();}}><Trash2 size={18}/>{asset.kind==='sticker'?'Çıkartmayı sil':'Fotoğrafı sil'}</button>}</Dialog>,document.body)}
  </div>;
}
