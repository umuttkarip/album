import React,{useEffect,useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {isFileDrag,isExternalFileDrag,snapshotFiles} from '../lib/upload-files';

export default function FileDropZone({children,className='',disabled=false,label='Fotoğrafları buraya bırak',onFiles}:{children:React.ReactNode;className?:string;disabled?:boolean;label?:string;onFiles:(files:File[],target:EventTarget)=>void}){
  const [dragging,setDragging]=useState(false),depth=useRef(0),internal=useRef(false);
  const reset=()=>{depth.current=0;setDragging(false);};
  useEffect(()=>{
    // An accidental drop outside a target must never navigate away from a draft.
    const prevent=(e:DragEvent)=>{if(e.dataTransfer&&isFileDrag(e.dataTransfer))e.preventDefault();};
    const start=(e:DragEvent)=>{internal.current=!e.defaultPrevented;reset();};
    const end=()=>{internal.current=false;reset();};
    window.addEventListener('dragstart',start);window.addEventListener('dragover',prevent);window.addEventListener('drop',prevent);window.addEventListener('drop',reset,true);window.addEventListener('dragend',end);window.addEventListener('blur',end);
    return()=>{window.removeEventListener('dragstart',start);window.removeEventListener('dragover',prevent);window.removeEventListener('drop',prevent);window.removeEventListener('drop',reset,true);window.removeEventListener('dragend',end);window.removeEventListener('blur',end);};
  },[]);
  return <div className={'file-drop-zone '+className} onDragEnter={e=>{if(!isExternalFileDrag(e.dataTransfer,internal.current))return;e.preventDefault();depth.current++;setDragging(true);}} onDragOver={e=>{if(!isFileDrag(e.dataTransfer))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect=disabled||!isExternalFileDrag(e.dataTransfer,internal.current)?'none':'copy';}} onDragLeave={e=>{if(!isFileDrag(e.dataTransfer))return;if(--depth.current<=0)reset();}} onDrop={e=>{if(!isFileDrag(e.dataTransfer))return;e.preventDefault();e.stopPropagation();const external=isExternalFileDrag(e.dataTransfer,internal.current),files=external?snapshotFiles(e.dataTransfer.files):[];internal.current=false;reset();if(!disabled&&files.length)onFiles(files,e.target);}}>
    {children}
    {dragging&&<div className={'file-drop-overlay '+(disabled?'drop-disabled':'')} aria-live="polite"><span><Upload size={28}/>{disabled?'Yükleme şu anda kullanılamıyor':label}</span></div>}
  </div>;
}
