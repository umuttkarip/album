'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { ArrowLeft, BookOpen, RectangleVertical, ChevronLeft, ChevronRight, Pencil, Plus, Grid2X2, X, MoreHorizontal, ImagePlus, LoaderCircle,Smartphone } from 'lucide-react';
import { canEdit, spansCenter, type Album, type Spread, type Asset, type User } from '../lib/model';
import { readingViews, paintView, hitPhoto, type ReadingView } from '../lib/render';
import { resolveSpreads } from '../lib/composition';
import type { Turn } from './BookCanvas';
import ViewTransition,{type ViewMorph} from './ViewTransition';
import {readingMode,requiresOpenBook,savedViewIndex,readingResolution,readingPreferenceKey,initialReadingMode,readerPageSize,physicalPageStacks,type ReadingMode} from '../lib/reading';
import {createReaderRenderer} from '../lib/reader-renderer';
import {bookStyle} from '../lib/book-style';
const BookCanvas=lazy(()=>import('./BookCanvas'));
function Flat({canvas}:{canvas:HTMLCanvasElement}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current!;c.width=canvas.width;c.height=canvas.height;c.getContext('2d')!.drawImage(canvas,0,0);},[canvas]);return <canvas ref={ref} className="flat-page"/>;}
export default function Reader({album,spreads:sourceSpreads,assets,user,onBack,onEdit,onPhoto,onDetails,navigation}:{album:Album;spreads:Spread[];assets:Asset[];user:User;onBack:()=>void;onEdit:(id:string,side?:'left'|'right'|'full')=>void;onPhoto:(id:string)=>void;onDetails:()=>void;navigation?:React.ReactNode}) {
  const spreads=useMemo(()=>resolveSpreads(sourceSpreads,assets,album.title),[sourceSpreads,assets,album.title]);
  const [preference,setPreference]=useState<ReadingMode>(()=>{try{return initialReadingMode(localStorage.getItem(readingPreferenceKey(user.id)));}catch{return 'single';}});
  const [landscape,setLandscape]=useState(()=>typeof window!=='undefined'&&window.innerWidth>window.innerHeight&&window.innerHeight<=520);
  useEffect(()=>{const update=()=>setLandscape(window.innerWidth>window.innerHeight&&window.innerHeight<=520);window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
  const views=useMemo(()=>readingViews(spreads,preference),[spreads,preference]);
  const [index,setIndex]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(`album:position:${user.id}:${album.id}`)||'null');if(saved)return savedViewIndex(views,saved);}catch{}return 0;});
  const [canvas,setCanvas]=useState<HTMLCanvasElement|null>(null),[turn,setTurn]=useState<Turn|null>(null),[loading,setLoading]=useState(false),[thumbnails,setThumbnails]=useState(false),[flat,setFlat]=useState(false),[reduced,setReduced]=useState(false),[error,setError]=useState('');
  const [morph,setMorph]=useState<ViewMorph|null>(null),modeRequest=useRef(preference),modeGeneration=useRef(0),lastSide=useRef<'left'|'right'>('left');
  const renderer=useMemo(createReaderRenderer,[]);
  const current=views[Math.min(index,views.length-1)],motionRef=useRef<Turn|null>(null),pointer=useRef<{x:number;y:number;time:number;lastX:number;dragged:boolean;loading:boolean;up:boolean;modeChange:boolean}|null>(null),frame=useRef<HTMLDivElement>(null),[frameSize,setFrameSize]=useState({w:700,h:600});
  const mode=readingMode(current,preference),forcedBook=requiresOpenBook(current.spread.doc);
  const coverDoc=spreads.find(s=>s.doc.cover)?.doc||current.spread.doc;
  const stacks=useMemo(()=>physicalPageStacks(spreads,current),[spreads,current]);
  function displaySize(value:ReadingMode){return readerPageSize(frameSize,value,landscape);}
  useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);
  const ensure=useCallback((v:ReadingView)=>{const targetMode=readingMode(v,preference),size=readerPageSize(frameSize,targetMode,landscape),width=readingResolution({w:size.w+40,h:size.h+40},targetMode,window.devicePixelRatio);return renderer.view(v,targetMode,width);},[preference,frameSize.w,frameSize.h,landscape]);
  useEffect(()=>{let alive=true;setLoading(true);void ensure(current).then(c=>{if(alive){setCanvas(c);setLoading(false);}}).catch(()=>{if(alive){setError('Sayfa yüklenemedi.');setLoading(false);}});if(views[index+1])void ensure(views[index+1]);if(views[index-1])void ensure(views[index-1]);try{localStorage.setItem(`album:position:${user.id}:${album.id}`,JSON.stringify({key:current.key,id:current.spread.id}));}catch{}return()=>{alive=false;};},[index,views,ensure,current,user.id,album.id]);
  useEffect(()=>{const host=frame.current;if(!host)return;const r=new ResizeObserver(([e])=>setFrameSize({w:e.contentRect.width,h:e.contentRect.height}));r.observe(host);return()=>r.disconnect();},[]);
  useEffect(()=>()=>renderer.clear(),[]);
  const finish=useCallback((cancelled:boolean)=>{const t=motionRef.current;if(!t)return;if(!cancelled){setCanvas(t.to);setIndex(t.id);};setTurn(null);motionRef.current=null;},[]);
  function modeMorph(from:HTMLCanvasElement,to:HTMLCanvasElement,oldMode:ReadingMode,newMode:ReadingMode,id:number,split=false):ViewMorph{const fromSize=displaySize(oldMode),toSize=displaySize(newMode);return {id,from,to,full:newMode==='book'?to:from,fromBook:oldMode==='book',toBook:newMode==='book',side:lastSide.current,split,fromW:fromSize.w,fromH:fromSize.h,toW:toSize.w,toH:toSize.h};}
  async function go(next:number,instant=false){
    if(next<0||next>=views.length||next===index||motionRef.current&&!instant)return;setMorph(null);modeRequest.current=preference;const generation=++modeGeneration.current;
    try{const to=await ensure(views[next]);if(generation!==modeGeneration.current)return;const targetMode=readingMode(views[next],preference);
      if(instant||flat||reduced||!canvas||targetMode!==mode){motionRef.current=null;setTurn(null);if(!instant&&!flat&&!reduced&&canvas&&targetMode!==mode)setMorph(modeMorph(canvas,to,mode,targetMode,generation));setCanvas(to);setIndex(next);return;}
      const t:Turn={id:next,from:canvas,to,direction:next>index?1:-1,sourceCover:current.region==='cover',targetCover:views[next].region==='cover',start:performance.now(),duration:current.region==='cover'||views[next].region==='cover'?600:420,fromP:0,toP:1};motionRef.current=t;setTurn(t);
    }catch{if(generation===modeGeneration.current)setError('Sonraki sayfa yüklenemedi.');}
  }
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('dialog,input,textarea'))return;if(e.key==='ArrowRight'){e.preventDefault();void go(Math.min(views.length-1,index+1),true);}if(e.key==='ArrowLeft'){e.preventDefault();void go(Math.max(0,index-1),true);}if(e.key==='Escape')setThumbnails(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  async function toggleMode(){
    if(forcedBook)return;const next=modeRequest.current==='single'?'book':'single';modeRequest.current=next;const generation=++modeGeneration.current;
    if(current.region==='left'||current.region==='right')lastSide.current=current.region;
    const list=readingViews(spreads,next),n=Math.max(0,list.findIndex(v=>v.spread.id===current.spread.id&&(next==='book'||v.region==='full'||v.region==='cover'||v.region===lastSide.current))),view=list[n];setLoading(true);
    try{const size=displaySize(next),ready=await renderer.view(view,next,readingResolution({w:size.w+40,h:size.h+40},next,window.devicePixelRatio));if(generation!==modeGeneration.current)return;
      const oldCanvas=canvas,oldMode=mode,fromSize=displaySize(oldMode),toSize=displaySize(next);
      motionRef.current=null;setTurn(null);setCanvas(ready);setPreference(next);setIndex(n);
      if(oldCanvas&&!reduced&&!flat&&oldMode!==next&&current.region!=='cover')setMorph({id:generation,from:oldCanvas,to:ready,full:next==='book'?ready:oldCanvas,fromBook:oldMode==='book',toBook:next==='book',side:lastSide.current,split:current.region!=='full'||oldMode==='book'&&!spansCenter(current.spread.doc),fromW:fromSize.w,fromH:fromSize.h,toW:toSize.w,toH:toSize.h});else setMorph(null);
      try{localStorage.setItem(readingPreferenceKey(user.id),next);}catch{}
    }catch{if(generation===modeGeneration.current){modeRequest.current=preference;setError('Görünüm değiştirilemedi.');}}finally{if(generation===modeGeneration.current)setLoading(false);}
  }

  function tap(e:React.PointerEvent){
    if(current.region==='cover'){void go(index+1);return;}const r=e.currentTarget.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width,ny=(e.clientY-r.top)/r.height;let x=nx*1000,y=ny*1250;
    if(mode==='book')x=nx*2000;else if(current.region==='right')x+=1000;else if(current.region==='full'){x=nx*2000;y=(y-312.5)*2;}
    if(y<0||y>1250)return;const photo=hitPhoto(current.spread.doc,x,y);if(photo?.assetId)onPhoto(photo.assetId);
  }
  function down(e:React.PointerEvent){if(e.button!==0||motionRef.current)return;pointer.current={x:e.clientX,y:e.clientY,time:performance.now(),lastX:e.clientX,dragged:false,loading:false,up:false,modeChange:false};e.currentTarget.setPointerCapture(e.pointerId);}
  async function move(e:React.PointerEvent){const p=pointer.current;if(!p||p.up)return;p.lastX=e.clientX;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(!p.dragged&&(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25))return;
    if(!p.dragged){p.dragged=true;if(flat||reduced)return;const next=index+(dx<0?1:-1);if(next<0||next>=views.length)return;if(readingMode(views[next],preference)!==mode){p.modeChange=true;return;}p.loading=true;const to=await ensure(views[next]);p.loading=false;if(p.up)return;const t:Turn={id:next,from:canvas!,to,direction:dx<0?1:-1,sourceCover:current.region==='cover',targetCover:views[next].region==='cover',start:performance.now(),duration:420,fromP:0,toP:1,dragging:true,progress:0};motionRef.current=t;setTurn(t);}
    const t=motionRef.current;if(t?.dragging){const progress=Math.max(0,Math.min(.98,(p.x-p.lastX)*t.direction/(e.currentTarget.clientWidth*.75)));const updated={...t,progress};motionRef.current=updated;setTurn(updated);}
  }
  function up(e:React.PointerEvent){const p=pointer.current;if(!p)return;p.up=true;pointer.current=null;if(!p.dragged){tap(e);return;}const t=motionRef.current;if(!t){const dx=e.clientX-p.x,speed=Math.abs(dx)/Math.max(1,performance.now()-p.time);if(p.modeChange){if(Math.abs(dx)>Math.min(120,e.currentTarget.clientWidth*.22)||speed>.55)void go(index+(dx<0?1:-1));}else if(flat||reduced)void go(index+(dx<0?1:-1),true);return;}if(!t.dragging)return;
    const progress=t.progress||0,velocity=Math.abs(e.clientX-p.x)/Math.max(1,performance.now()-p.time),complete=progress>.28||velocity>.55;const updated={...t,dragging:false,start:performance.now(),fromP:progress,toP:complete?1:0,duration:complete?Math.max(140,420*(1-progress)):180};motionRef.current=updated;setTurn(updated);
  }
  function cancel(){const t=motionRef.current;pointer.current=null;if(t?.dragging){const n={...t,dragging:false,start:performance.now(),fromP:t.progress||0,toP:0,duration:180};motionRef.current=n;setTurn(n);}}
  const {w,h}=displaySize(mode),editable=canEdit(user,album);
  return <div className={'reader-screen'+(landscape?' is-landscape':'')} style={bookStyle(coverDoc)}>
    <header className="reader-header"><button className="icon-button" onClick={onBack} aria-label="Albümlere dön"><ArrowLeft/></button><div className="reader-heading"><h1>{album.title}</h1><span>{album.visibility==='shared'?'Ortak':'Özel'}</span></div>{navigation}<div className="header-actions"><button className="icon-button view-toggle" onClick={toggleMode} disabled={forcedBook} title={forcedBook?'İki sayfaya yayılan fotoğraf':mode==='single'?'Açık deftere geç':'Tek sayfaya geç'} aria-label={forcedBook?'İki sayfaya yayılan fotoğraf':mode==='single'?'Açık deftere geç':'Tek sayfaya geç'}>{mode==='single'?<BookOpen/>:<RectangleVertical/>}</button>{editable&&<><button className="icon-button" onClick={onDetails} aria-label="Albüm bilgileri"><MoreHorizontal/></button><button className="button secondary compact" aria-label="Sayfayı düzenle" onClick={()=>onEdit(current.spread.id,current.region==='left'||current.region==='right'?current.region:'full')}><Pencil size={16}/><span>Düzenle</span></button></>}</div></header>
    {error&&<div className="notice error">{error}<button onClick={()=>{setError('');void go(index,true);}}>Yeniden dene</button></div>}
    <div className="reader-layout" ref={frame}>
    <main className={'reader-stage '+mode} style={{width:w,height:h}}>
      <div className={'reader-stack '+(mode==='book'&&current.region!=='cover'?'spread-stack':'single-stack')} style={{width:current.region==='cover'&&mode==='book'?w/2:w,height:h,'--left-depth':stacks.leftDepth+'px','--right-depth':stacks.rightDepth+'px'} as React.CSSProperties} aria-hidden="true">
        <span className="stack-cover-board"/>{(mode==='book'&&current.region!=='cover'?(['left','right'] as const):(['right'] as const)).map(side=><div className={'page-stack '+side} key={side}><span className="stack-paper-block"/>{stacks[side].map((v,i)=><span className={'stack-leaf leaf-'+i} key={v.key}><LeafPage view={v}/></span>)}</div>)}
      </div>
      {morph&&<ViewTransition key={morph.id} value={morph} onDone={()=>setMorph(null)}/>}
      <div className={'book-frame '+mode+' '+(current.region==='cover'?'is-cover':'')+' '+(loading?'is-loading':'')+' '+(morph?'is-morphing':'')} style={{width:w,height:h}} onPointerDown={down} onPointerMove={e=>void move(e)} onPointerUp={up} onPointerCancel={cancel}>
        {canvas?(flat||reduced?<Flat canvas={canvas}/>:<Suspense fallback={<Flat canvas={canvas}/>}><BookCanvas canvas={canvas} book={mode==='book'} cover={current.region==='cover'} turn={turn} onDone={finish} onLost={()=>{setFlat(true);motionRef.current=null;setTurn(null);}} spanning={spansCenter(current.spread.doc)}/></Suspense>):<div className="page-loading"><LoaderCircle className="spin"/><span>Yükleniyor</span></div>}
      </div>
      {current.region==='cover'&&views.length>1&&<button className="open-book-hint" onClick={()=>void go(index+1)}>Albümü aç<ChevronRight size={16}/></button>}
      {!current.spread.doc.cover&&!current.spread.doc.elements.length&&editable&&<button className="empty-page-action" onClick={()=>onEdit(current.spread.id,current.region==='left'||current.region==='right'?current.region:'full')}><ImagePlus size={22}/><span>Fotoğraf ekle</span></button>}
    </main>
    <footer className="reader-footer"><button className="text-button cover-link" onClick={()=>void go(0,true)}>Kapağa dön</button><div className="page-navigation"><button className="icon-button" disabled={index===0} onClick={()=>void go(index-1)} aria-label="Önceki sayfa"><ChevronLeft/></button><button className="page-counter" onClick={()=>setThumbnails(v=>!v)} aria-expanded={thumbnails}><Grid2X2 size={15}/><span>{current.label}</span><span className="muted">/ {Math.max(0,(spreads.length-1)*2)}</span></button><button className="icon-button" disabled={index===views.length-1} onClick={()=>void go(index+1)} aria-label="Sonraki sayfa"><ChevronRight/></button></div>{editable?<button className="text-button add-photo-link" onClick={()=>onEdit(current.spread.id,current.region==='left'||current.region==='right'?current.region:'full')}><Plus size={16}/>Fotoğraf ekle</button>:<span/>}</footer>
    {mode==='book'&&!current.spread.doc.cover&&<p className="orientation-hint" role="status"><Smartphone size={15}/>Daha büyük görmek için telefonu yan çevir.</p>}
    </div>
    {thumbnails&&<div className="page-filmstrip" style={{bottom:Math.max(12,(frameSize.h-h-76)/2+76)}}><div className="filmstrip-title"><span>Sayfalar</span><button className="icon-button small" aria-label="Önizlemeleri kapat" onClick={()=>setThumbnails(false)}><X size={17}/></button></div><div className="filmstrip-scroll">{views.map((v,i)=><button className={'filmstrip-item '+(i===index?'active':'')} key={v.key} onClick={()=>{void go(i,true);setThumbnails(false);}}><MiniPage view={v}/><span>{v.label}</span></button>)}</div></div>}
  </div>;
}
function MiniPage({view}:{view:ReadingView}){const ref=useRef<HTMLCanvasElement>(null),host=useRef<HTMLSpanElement>(null);useEffect(()=>{let live=true;const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();void paintView(view,'single',80).then(c=>{if(live&&ref.current){ref.current.width=80;ref.current.height=100;ref.current.getContext('2d')!.drawImage(c,0,0,80,100);}c.width=c.height=1;});});if(host.current)observer.observe(host.current);return()=>{live=false;observer.disconnect();};},[view]);return <span ref={host}><canvas ref={ref}/></span>;}

function LeafPage({view}:{view:ReadingView}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{let active=true;void paintView(view,'single',240).then(c=>{if(active&&ref.current){ref.current.width=240;ref.current.height=300;ref.current.getContext('2d')!.drawImage(c,0,0,240,300);}c.width=c.height=1;});return()=>{active=false;};},[view]);return <canvas ref={ref}/>;}
