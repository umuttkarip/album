'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { ArrowLeft, BookOpen, RectangleVertical, ChevronLeft, ChevronRight, Pencil, Plus, Grid2X2, X, MoreHorizontal, ImagePlus, LoaderCircle } from 'lucide-react';
import { canEdit, spansCenter, type Album, type Spread, type Asset, type User } from '../lib/model';
import { readingViews, paintView, hitPhoto, type ReadingView } from '../lib/render';
import { resolveSpreads } from '../lib/composition';
import type { Turn } from './BookCanvas';
const BookCanvas=lazy(()=>import('./BookCanvas'));
function Flat({canvas}:{canvas:HTMLCanvasElement}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current!;c.width=canvas.width;c.height=canvas.height;c.getContext('2d')!.drawImage(canvas,0,0);},[canvas]);return <canvas ref={ref} className="flat-page"/>;}
export default function Reader({album,spreads:sourceSpreads,assets,user,onBack,onEdit,onPhoto,onDetails}:{album:Album;spreads:Spread[];assets:Asset[];user:User;onBack:()=>void;onEdit:(id:string)=>void;onPhoto:(id:string)=>void;onDetails:()=>void}) {
  const spreads=useMemo(()=>resolveSpreads(sourceSpreads,assets,album.title),[sourceSpreads,assets,album.title]);
  const [mode,setMode]=useState<'single'|'book'>(()=>{try{const v=localStorage.getItem('album:view:'+user.id);if(v==='single'||v==='book')return v;}catch{}return typeof window!=='undefined'&&window.innerWidth<760?'single':'book';});
  const views=useMemo(()=>readingViews(spreads,mode),[spreads,mode]);
  const [index,setIndex]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(`album:position:${user.id}:${album.id}`)||'null');if(saved){const n=views.findIndex(v=>v.key===saved.key||v.spread.id===saved.id);if(n>=0)return n;}}catch{}return 0;});
  const [canvas,setCanvas]=useState<HTMLCanvasElement|null>(null),[turn,setTurn]=useState<Turn|null>(null),[loading,setLoading]=useState(false),[thumbnails,setThumbnails]=useState(false),[flat,setFlat]=useState(false),[reduced,setReduced]=useState(false),[error,setError]=useState('');
  const current=views[Math.min(index,views.length-1)],cache=useRef(new Map<string,Promise<HTMLCanvasElement>>()),motionRef=useRef<Turn|null>(null),pointer=useRef<{x:number;y:number;time:number;lastX:number;dragged:boolean;loading:boolean;up:boolean}|null>(null),frame=useRef<HTMLDivElement>(null),[frameSize,setFrameSize]=useState({w:700,h:600});
  useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);
  const ensure=useCallback((v:ReadingView)=>{const key=mode+':'+v.key+':'+v.spread.revision+':'+(v.spread.doc.autoLayout?v.spread.doc.elements.map(e=>e.id).join(','):'');let promise=cache.current.get(key);if(promise){cache.current.delete(key);cache.current.set(key,promise);}if(!promise){promise=paintView(v,mode);cache.current.set(key,promise);while(cache.current.size>5){const k=cache.current.keys().next().value!;const old=cache.current.get(k);cache.current.delete(k);void old?.catch(()=>{});}}return promise;},[mode]);
  useEffect(()=>{let alive=true;setLoading(true);void ensure(current).then(c=>{if(alive){setCanvas(c);setLoading(false);}}).catch(()=>{if(alive){setError('Sayfa yüklenemedi.');setLoading(false);}});if(views[index+1])void ensure(views[index+1]);if(views[index-1])void ensure(views[index-1]);try{localStorage.setItem(`album:position:${user.id}:${album.id}`,JSON.stringify({key:current.key,id:current.spread.id}));}catch{}return()=>{alive=false;};},[index,views,ensure,current,user.id,album.id]);
  useEffect(()=>{const host=frame.current;if(!host)return;const r=new ResizeObserver(([e])=>setFrameSize({w:e.contentRect.width,h:e.contentRect.height}));r.observe(host);return()=>r.disconnect();},[]);
  useEffect(()=>()=>{cache.current.forEach(p=>void p.then(c=>{c.width=c.height=1;}));cache.current.clear();},[]);
  const finish=useCallback((cancelled:boolean)=>{const t=motionRef.current;if(!t)return;if(!cancelled){setCanvas(t.to);setIndex(t.id);};setTurn(null);motionRef.current=null;},[]);
  async function go(next:number,instant=false){
    if(next<0||next>=views.length||next===index)return;if(motionRef.current&&!instant)return;
    try{const to=await ensure(views[next]);if(instant||flat||reduced||!canvas){motionRef.current=null;setTurn(null);setCanvas(to);setIndex(next);return;}
      const t:Turn={id:next,from:canvas,to,direction:next>index?1:-1,sourceCover:current.region==='cover',targetCover:views[next].region==='cover',start:performance.now(),duration:current.region==='cover'||views[next].region==='cover'?600:420,fromP:0,toP:1};motionRef.current=t;setTurn(t);
    }catch{setError('Sonraki sayfa yüklenemedi.');}
  }
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('dialog,input,textarea'))return;if(e.key==='ArrowRight'){e.preventDefault();void go(Math.min(views.length-1,index+1),true);}if(e.key==='ArrowLeft'){e.preventDefault();void go(Math.max(0,index-1),true);}if(e.key==='Escape')setThumbnails(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  async function toggleMode(){
    const next=mode==='single'?'book':'single',list=readingViews(spreads,next),n=Math.max(0,list.findIndex(v=>v.spread.id===current.spread.id)),view=list[n];
    setLoading(true);
    try{const ready=await paintView(view,next);motionRef.current=null;setTurn(null);setCanvas(ready);setMode(next);setIndex(n);
      const key=next+':'+view.key+':'+view.spread.revision+':'+(view.spread.doc.autoLayout?view.spread.doc.elements.map(e=>e.id).join(','):'');cache.current.set(key,Promise.resolve(ready));while(cache.current.size>5)cache.current.delete(cache.current.keys().next().value!);
      try{localStorage.setItem('album:view:'+user.id,next);}catch{}
    }catch{setError('Görünüm değiştirilemedi.');}finally{setLoading(false);}
  }

  function tap(e:React.PointerEvent){
    if(current.region==='cover'){void go(index+1);return;}const r=e.currentTarget.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width,ny=(e.clientY-r.top)/r.height;let x=nx*1000,y=ny*1250;
    if(mode==='book')x=nx*2000;else if(current.region==='right')x+=1000;else if(current.region==='full'){x=nx*2000;y=(y-312.5)*2;}
    if(y<0||y>1250)return;const photo=hitPhoto(current.spread.doc,x,y);if(photo?.assetId)onPhoto(photo.assetId);
  }
  function down(e:React.PointerEvent){if(e.button!==0||motionRef.current)return;pointer.current={x:e.clientX,y:e.clientY,time:performance.now(),lastX:e.clientX,dragged:false,loading:false,up:false};e.currentTarget.setPointerCapture(e.pointerId);}
  async function move(e:React.PointerEvent){const p=pointer.current;if(!p||p.up)return;p.lastX=e.clientX;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(!p.dragged&&(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25))return;
    if(!p.dragged){p.dragged=true;if(flat||reduced)return;const next=index+(dx<0?1:-1);if(next<0||next>=views.length)return;p.loading=true;const to=await ensure(views[next]);p.loading=false;if(p.up)return;const t:Turn={id:next,from:canvas!,to,direction:dx<0?1:-1,sourceCover:current.region==='cover',targetCover:views[next].region==='cover',start:performance.now(),duration:420,fromP:0,toP:1,dragging:true,progress:0};motionRef.current=t;setTurn(t);}
    const t=motionRef.current;if(t?.dragging){const progress=Math.max(0,Math.min(.98,(p.x-p.lastX)*t.direction/(e.currentTarget.clientWidth*.75)));const updated={...t,progress};motionRef.current=updated;setTurn(updated);}
  }
  function up(e:React.PointerEvent){const p=pointer.current;if(!p)return;p.up=true;pointer.current=null;if(!p.dragged){tap(e);return;}const t=motionRef.current;if(!t){if(flat||reduced)void go(index+(e.clientX<p.x?1:-1),true);return;}if(!t.dragging)return;
    const progress=t.progress||0,velocity=Math.abs(e.clientX-p.x)/Math.max(1,performance.now()-p.time),complete=progress>.28||velocity>.55;const updated={...t,dragging:false,start:performance.now(),fromP:progress,toP:complete?1:0,duration:complete?Math.max(140,420*(1-progress)):180};motionRef.current=updated;setTurn(updated);
  }
  function cancel(){const t=motionRef.current;pointer.current=null;if(t?.dragging){const n={...t,dragging:false,start:performance.now(),fromP:t.progress||0,toP:0,duration:180};motionRef.current=n;setTurn(n);}}
  const aspect=mode==='book'?1.6:.8,w=Math.max(100,Math.min(frameSize.w-40,(frameSize.h-40)*aspect)),h=w/aspect,editable=canEdit(user,album);
  return <div className="reader-screen">
    <header className="reader-header"><button className="icon-button" onClick={onBack} aria-label="Albümlere dön"><ArrowLeft/></button><div className="reader-heading"><h1>{album.title}</h1><span>{album.visibility==='shared'?'Ortak':'Özel'}</span></div><div className="header-actions"><button className="icon-button view-toggle" onClick={toggleMode} title={mode==='single'?'Açık deftere geç':'Tek sayfaya geç'} aria-label={mode==='single'?'Açık deftere geç':'Tek sayfaya geç'}>{mode==='single'?<BookOpen/>:<RectangleVertical/>}</button>{editable&&<><button className="icon-button" onClick={onDetails} aria-label="Albüm bilgileri"><MoreHorizontal/></button><button className="button secondary compact" aria-label="Sayfayı düzenle" onClick={()=>onEdit(current.spread.id)}><Pencil size={16}/><span>Düzenle</span></button></>}</div></header>
    {error&&<div className="notice error">{error}<button onClick={()=>{setError('');void go(index,true);}}>Yeniden dene</button></div>}
    <main className={'reader-stage '+mode} ref={frame}>
      <div className={'book-frame '+mode+' '+(current.region==='cover'?'is-cover':'')+' '+(loading?'is-loading':'')} style={{width:w,height:h}} onPointerDown={down} onPointerMove={e=>void move(e)} onPointerUp={up} onPointerCancel={cancel}>
        {canvas?(flat||reduced?<Flat canvas={canvas}/>:<Suspense fallback={<Flat canvas={canvas}/>}><BookCanvas canvas={canvas} book={mode==='book'} cover={current.region==='cover'} turn={turn} onDone={finish} onLost={()=>{setFlat(true);motionRef.current=null;setTurn(null);}} spanning={spansCenter(current.spread.doc)}/></Suspense>):<div className="page-loading"><LoaderCircle className="spin"/><span>Yükleniyor</span></div>}
      </div>
      {current.region==='cover'&&views.length>1&&<button className="open-book-hint" onClick={()=>void go(index+1)}>Albümü aç<ChevronRight size={16}/></button>}
      {!current.spread.doc.cover&&!current.spread.doc.elements.length&&editable&&<button className="empty-page-action" onClick={()=>onEdit(current.spread.id)}><ImagePlus size={22}/><span>Fotoğraf ekle</span></button>}
    </main>
    <footer className="reader-footer"><button className="text-button cover-link" onClick={()=>void go(0,true)}>Kapağa dön</button><div className="page-navigation"><button className="icon-button" disabled={index===0} onClick={()=>void go(index-1)} aria-label="Önceki sayfa"><ChevronLeft/></button><button className="page-counter" onClick={()=>setThumbnails(v=>!v)} aria-expanded={thumbnails}><Grid2X2 size={15}/><span>{current.label}</span><span className="muted">/ {Math.max(0,(spreads.length-1)*2)}</span></button><button className="icon-button" disabled={index===views.length-1} onClick={()=>void go(index+1)} aria-label="Sonraki sayfa"><ChevronRight/></button></div>{editable?<button className="text-button add-photo-link" onClick={()=>onEdit(current.spread.id)}><Plus size={16}/>Fotoğraf ekle</button>:<span/>}</footer>
    {thumbnails&&<div className="page-filmstrip"><div className="filmstrip-title"><span>Sayfalar</span><button className="icon-button small" aria-label="Önizlemeleri kapat" onClick={()=>setThumbnails(false)}><X size={17}/></button></div><div className="filmstrip-scroll">{views.map((v,i)=><button className={'filmstrip-item '+(i===index?'active':'')} key={v.key} onClick={()=>{void go(i,true);setThumbnails(false);}}><MiniPage view={v}/><span>{v.label}</span></button>)}</div></div>}
  </div>;
}
function MiniPage({view}:{view:ReadingView}){const ref=useRef<HTMLCanvasElement>(null),host=useRef<HTMLSpanElement>(null);useEffect(()=>{let live=true;const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();void paintView(view,'single').then(c=>{if(live&&ref.current){ref.current.width=80;ref.current.height=100;ref.current.getContext('2d')!.drawImage(c,0,0,80,100);}c.width=c.height=1;});});if(host.current)observer.observe(host.current);return()=>{live=false;observer.disconnect();};},[view]);return <span ref={host}><canvas ref={ref}/></span>;}
