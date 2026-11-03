import React,{useEffect,useLayoutEffect,useRef} from 'react';
import type {PageDoc} from '../lib/model';
import {paintDoc,paintView,paintPreviewPaper,type ReadingView} from '../lib/render';

export default function PagePreview({doc,view,width=320,lazy=false,onStatus}:{doc:PageDoc;view?:ReadingView;width?:number;lazy?:boolean;onStatus?:(status:'loading'|'ready'|'error')=>void}){
  const ref=useRef<HTMLCanvasElement>(null);
  function show(canvas:HTMLCanvasElement){if(ref.current){ref.current.width=canvas.width;ref.current.height=canvas.height;ref.current.getContext('2d')!.drawImage(canvas,0,0);}canvas.width=canvas.height=1;}
  useLayoutEffect(()=>{show(paintPreviewPaper(doc,width,view));},[doc,width,view]);
  useEffect(()=>{
    let active=true;
    onStatus?.('loading');
    const load=()=>void (view?paintView(view,'single',width):paintDoc(doc,width)).then(canvas=>{if(active){show(canvas);onStatus?.('ready');}else canvas.width=canvas.height=1;}).catch(()=>{if(active)onStatus?.('error');});
    if(!lazy){load();return()=>{active=false;};}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}});
    if(ref.current)observer.observe(ref.current);return()=>{active=false;observer.disconnect();};
  },[doc,width,view,lazy,onStatus]);
  return <canvas ref={ref}/>;
}
