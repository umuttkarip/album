import React,{useEffect,useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {isFileDrag,snapshotFiles} from '../lib/upload-files';

export default function FileDropZone({children,className='',disabled=false,label='Fotoğrafları buraya bırak',onFiles}:{children:React.ReactNode;className?:string;disabled?:boolean;label?:string;onFiles:(files:File[],target:EventTarget)=>void}){
  const [dragging,setDragging]=useState(false),depth=useRef(0);
  const reset=()=>{depth.current=0;setDragging(false);};
  useEffect(()=>{
    // An accidental drop outside a target must never navigate away from a draft.
    const prevent=(e:DragEvent)=>{if(e.dataTransfer&&isFileDrag(e.dataTransfer))e.preventDefault();};
    window.addEventListener('dragover',prevent);window.addEventListener('drop',prevent);window.addEventListener('drop',reset,true);window.addEventListener('dragend',reset);window.addEventListener('blur',reset);
    return()=>{window.removeEventListener('dragover',prevent);window.removeEventListener('drop',prevent);window.removeEventListener('drop',reset,true);window.removeEventListener('dragend',reset);window.removeEventListener('blur',reset);};
  },[]);
  return <div className={'file-drop-zone '+className} onDragEnter={e=>{if(!isFileDrag(e.dataTransfer))return;e.preventDefault();depth.current++;setDragging(true);}} onDragOver={e=>{if(!isFileDrag(e.dataTransfer))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect=disabled?'none':'copy';}} onDragLeave={e=>{if(!isFileDrag(e.dataTransfer))return;if(--depth.current<=0)reset();}} onDrop={e=>{if(!isFileDrag(e.dataTransfer))return;e.preventDefault();e.stopPropagation();const files=snapshotFiles(e.dataTransfer.files);reset();if(!disabled&&files.length)onFiles(files,e.target);}}>
    {children}
    {dragging&&<div className={'file-drop-overlay '+(disabled?'drop-disabled':'')} aria-live="polite"><span><Upload size={28}/>{disabled?'Yükleme şu anda kullanılamıyor':label}</span></div>}
  </div>;
}
