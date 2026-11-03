'use client';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { ArrowLeft, BookOpen, RectangleVertical, ChevronLeft, ChevronRight, Pencil, Plus, Grid2X2, X, MoreHorizontal, ImagePlus, LoaderCircle,Smartphone } from 'lucide-react';
import { canEdit, spansCenter, type Album, type Spread, type Asset, type User, type PageElement } from '../lib/model';
import { readingViews, hitPhoto, type ReadingView } from '../lib/render';
import { resolveSpreads } from '../lib/composition';
import type { Turn } from './BookCanvas';
import ViewTransition,{type ViewMorph} from './ViewTransition';
import {readingMode,requiresOpenBook,savedViewIndex,readingResolution,readingPreferenceKey,initialReadingMode,readerPageSize,orientationReadingMode,phoneLandscape,matchingViewIndex,type ReadingMode} from '../lib/reading';
import {boundBook,boundCursor} from '../lib/book-stack';
import BookBinding from './BookBinding';
import {createReaderRenderer} from '../lib/reader-renderer';
import {bookStyle,paperStyle} from '../lib/book-style';
import PagePreview from './PagePreview';
import type {TourRead} from '../lib/onboarding';
const BookCanvas=lazy(()=>import('./BookCanvas'));
function Flat({canvas}:{canvas:HTMLCanvasElement}){const ref=useRef<HTMLCanvasElement>(null);useLayoutEffect(()=>{const c=ref.current!;c.width=canvas.width;c.height=canvas.height;c.getContext('2d')!.drawImage(canvas,0,0);},[canvas]);return <canvas ref={ref} className="flat-page"/>;}
export default function Reader({album,spreads:sourceSpreads,assets,user,onBack,onEdit,onPhoto,navigation,onTourRead,tourFromCover=false,guideActive=false}:{album:Album;spreads:Spread[];assets:Asset[];user:User;onBack:()=>void;onEdit:(id:string,side?:'left'|'right'|'full')=>void;onPhoto:(id:string,element?:PageElement)=>void;navigation?:React.ReactNode;onTourRead?:(read:TourRead)=>void;tourFromCover?:boolean;guideActive?:boolean}) {
  const spreads=useMemo(()=>resolveSpreads(sourceSpreads,assets,album.title),[sourceSpreads,assets,album.title]);
  const [savedPreference,setSavedPreference]=useState<ReadingMode>(()=>{try{return initialReadingMode(localStorage.getItem(readingPreferenceKey(user.id)));}catch{return 'single';}});
  const [preference,setPreference]=useState<ReadingMode>(()=>typeof window==='undefined'?savedPreference:orientationReadingMode(savedPreference,window.innerWidth,window.innerHeight));
  const [landscape,setLandscape]=useState(()=>typeof window!=='undefined'&&window.innerWidth>window.innerHeight&&window.innerHeight<=520);
  const [phoneBook,setPhoneBook]=useState(()=>typeof window!=='undefined'&&phoneLandscape(window.innerWidth,window.innerHeight)),previousOrientation=useRef(phoneBook);
  useEffect(()=>{const update=()=>{setLandscape(window.innerWidth>window.innerHeight&&window.innerHeight<=520);setPhoneBook(phoneLandscape(window.innerWidth,window.innerHeight));};window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
  const views=useMemo(()=>readingViews(spreads,preference),[spreads,preference]);
  const [index,setIndex]=useState(()=>{if(tourFromCover)return 0;try{const saved=JSON.parse(localStorage.getItem(`album:position:${user.id}:${album.id}`)||'null');if(saved)return savedViewIndex(views,saved);}catch{}return 0;});
  const [canvas,setCanvas]=useState<HTMLCanvasElement|null>(null),[turn,setTurn]=useState<Turn|null>(null),[loading,setLoading]=useState(false),[thumbnails,setThumbnails]=useState(false),[flat,setFlat]=useState(false),[reduced,setReduced]=useState(false),[error,setError]=useState(''),[immersive,setImmersive]=useState(false),[mobile,setMobile]=useState(()=>window.innerWidth<=900),idleTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [morph,setMorph]=useState<ViewMorph|null>(null),modeRequest=useRef(preference),modeGeneration=useRef(0),lastSide=useRef<'left'|'right'>('left');
  const renderer=useMemo(createReaderRenderer,[]);
  const current=views[Math.min(index,views.length-1)],motionRef=useRef<Turn|null>(null),pointer=useRef<{x:number;y:number;time:number;lastX:number;dragged:boolean;loading:boolean;up:boolean;modeChange:boolean;held:boolean;woke:boolean}|null>(null),holdTimer=useRef<ReturnType<typeof setTimeout>|null>(null),frame=useRef<HTMLDivElement>(null),[frameSize,setFrameSize]=useState({w:700,h:600});
  const mode=readingMode(current,preference),forcedBook=requiresOpenBook(current.spread.doc);
  const coverDoc=spreads.find(s=>s.doc.cover)?.doc||current.spread.doc;
  const clearIdle=()=>{if(idleTimer.current)clearTimeout(idleTimer.current);idleTimer.current=null;};
  function revealControls(){clearIdle();setImmersive(false);if(mobile&&!guideActive&&!thumbnails&&!current.spread.doc.cover)idleTimer.current=setTimeout(()=>{if(!document.activeElement?.matches(':focus-visible'))setImmersive(true);},4000);}
  useEffect(()=>{const media=matchMedia('(max-width:900px)'),change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  useEffect(()=>{revealControls();return clearIdle;},[mobile,guideActive,thumbnails,current.key]);

  useEffect(()=>{onTourRead?.({book:mode==='book',pages:current.spread.doc.cover?[]:current.region==='full'?[current.spread.id+':left',current.spread.id+':right']:[current.key]});},[current.key,mode,onTourRead]);
  const binding=useMemo(()=>boundBook(spreads,mode),[spreads,mode]),cursor=boundCursor(spreads,current,mode);
  function displaySize(value:ReadingMode){return readerPageSize(frameSize,value,landscape);}
  useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(m.matches);update();m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[]);
  const ensure=useCallback((v:ReadingView)=>{const targetMode=readingMode(v,preference),size=readerPageSize(frameSize,targetMode,landscape),width=readingResolution({w:size.w+40,h:size.h+40},targetMode,window.devicePixelRatio);return renderer.view(v,targetMode,width);},[preference,frameSize.w,frameSize.h,landscape]);
  useEffect(()=>{let alive=true;if(!canvas)setLoading(true);void ensure(current).then(c=>{if(alive){setCanvas(c);setLoading(false);}}).catch(()=>{if(alive){setError('Sayfa yüklenemedi.');setLoading(false);}});if(views[index+1])void ensure(views[index+1]);if(views[index-1])void ensure(views[index-1]);try{localStorage.setItem(`album:position:${user.id}:${album.id}`,JSON.stringify({key:current.key,id:current.spread.id}));}catch{}return()=>{alive=false;};},[index,views,ensure,current,user.id,album.id]);
  useEffect(()=>{const host=frame.current;if(!host)return;const r=new ResizeObserver(([e])=>setFrameSize({w:e.contentRect.width,h:e.contentRect.height}));r.observe(host);return()=>r.disconnect();},[]);
  useEffect(()=>()=>{clearHold();if(pointer.current)pointer.current.up=true;pointer.current=null;motionRef.current=null;modeGeneration.current++;renderer.clear();},[]);
  const finish=useCallback((cancelled:boolean)=>{const t=motionRef.current;if(!t)return;if(!cancelled){setCanvas(t.to);setIndex(t.id);};setTurn(null);motionRef.current=null;},[]);
  function modeMorph(from:HTMLCanvasElement,to:HTMLCanvasElement,oldMode:ReadingMode,newMode:ReadingMode,id:number,split=false):ViewMorph{const fromSize=displaySize(oldMode),toSize=displaySize(newMode);return {id,from,to,full:newMode==='book'?to:from,fromBook:oldMode==='book',toBook:newMode==='book',side:lastSide.current,split,fromW:fromSize.w,fromH:fromSize.h,toW:toSize.w,toH:toSize.h};}
  async function go(next:number,instant=false){
    if(next<0||next>=views.length||next===index||motionRef.current&&!instant)return;clearHold();if(pointer.current)pointer.current.up=true;pointer.current=null;setMorph(null);modeRequest.current=preference;const generation=++modeGeneration.current;
    try{const to=await ensure(views[next]);if(generation!==modeGeneration.current)return;const targetMode=readingMode(views[next],preference);
      if(instant||flat||reduced||!canvas||targetMode!==mode){motionRef.current=null;setTurn(null);if(!instant&&!flat&&!reduced&&canvas&&targetMode!==mode)setMorph(modeMorph(canvas,to,mode,targetMode,generation));setCanvas(to);setIndex(next);return;}
      const t:Turn={id:next,from:canvas,to,direction:next>index?1:-1,sourceCover:current.region==='cover',targetCover:views[next].region==='cover',fromCursor:cursor,toCursor:boundCursor(spreads,views[next],mode),start:performance.now(),duration:current.region==='cover'||views[next].region==='cover'?600:420,fromP:0,toP:1};motionRef.current=t;setTurn(t);
    }catch{if(generation===modeGeneration.current)setError('Sonraki sayfa yüklenemedi.');}
  }
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('dialog,input,textarea'))return;if(e.key==='ArrowRight'){e.preventDefault();void go(Math.min(views.length-1,index+1),true);}if(e.key==='ArrowLeft'){e.preventDefault();void go(Math.max(0,index-1),true);}if(e.key==='Escape')setThumbnails(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  async function changeMode(next:ReadingMode,persist=true,animate=true){
    clearHold();if(pointer.current)pointer.current.up=true;pointer.current=null;motionRef.current=null;setTurn(null);setMorph(null);
    modeRequest.current=next;const generation=++modeGeneration.current;
    if(next===preference){setLoading(false);return;}
    if(current.region==='left'||current.region==='right')lastSide.current=current.region;
    const list=readingViews(spreads,next),n=matchingViewIndex(list,current.spread.id,lastSide.current),view=list[n],targetMode=readingMode(view,next);setLoading(true);
    try{const size=displaySize(targetMode),ready=await renderer.view(view,targetMode,readingResolution({w:size.w+40,h:size.h+40},targetMode,window.devicePixelRatio));if(generation!==modeGeneration.current)return;
      const oldCanvas=canvas,oldMode=mode,fromSize=displaySize(oldMode),toSize=displaySize(targetMode);
      motionRef.current=null;setTurn(null);setCanvas(ready);setPreference(next);setIndex(n);
      if(animate&&oldCanvas&&!reduced&&!flat&&oldMode!==targetMode&&current.region!=='cover')setMorph({id:generation,from:oldCanvas,to:ready,full:targetMode==='book'?ready:oldCanvas,fromBook:oldMode==='book',toBook:targetMode==='book',side:lastSide.current,split:current.region!=='full'||oldMode==='book'&&!spansCenter(current.spread.doc),fromW:fromSize.w,fromH:fromSize.h,toW:toSize.w,toH:toSize.h});else setMorph(null);
      if(persist){setSavedPreference(next);try{localStorage.setItem(readingPreferenceKey(user.id),next);}catch{}}
    }catch{if(generation===modeGeneration.current){modeRequest.current=preference;setError('Görünüm değiştirilemedi.');}}finally{if(generation===modeGeneration.current)setLoading(false);}
  }
  function toggleMode(){if(!forcedBook)void changeMode(modeRequest.current==='single'?'book':'single');}
  useEffect(()=>{if(previousOrientation.current===phoneBook)return;previousOrientation.current=phoneBook;void changeMode(phoneBook?'book':savedPreference,false,false);},[phoneBook]);

  function photoAt(e:React.PointerEvent){
    if(current.region==='cover')return;const r=e.currentTarget.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width,ny=(e.clientY-r.top)/r.height;let x=nx*1000,y=ny*1250;
    if(mode==='book')x=nx*2000;else if(current.region==='right')x+=1000;else if(current.region==='full'){x=nx*2000;y=(y-312.5)*2;}
    return y<0||y>1250?undefined:hitPhoto(current.spread.doc,x,y)?.assetId;
  }
  function inspect(id:string){onPhoto(id,current.spread.doc.elements.find(e=>e.type==='photo'&&e.assetId===id));}
  function clearHold(){if(holdTimer.current!==null)clearTimeout(holdTimer.current);holdTimer.current=null;}
  function down(e:React.PointerEvent){if(!e.isPrimary){clearHold();return;}if(e.button!==0||motionRef.current||!canvas||loading)return;clearHold();const gesture={x:e.clientX,y:e.clientY,time:performance.now(),lastX:e.clientX,dragged:false,loading:false,up:false,modeChange:false,held:false,woke:immersive};revealControls();pointer.current=gesture;e.currentTarget.setPointerCapture(e.pointerId);
    const id=photoAt(e);if(id)holdTimer.current=setTimeout(()=>{holdTimer.current=null;if(pointer.current!==gesture||gesture.up||gesture.dragged)return;gesture.held=true;gesture.up=true;pointer.current=null;inspect(id);},500);
  }
  async function move(e:React.PointerEvent){const p=pointer.current;if(!p||p.up)return;const pageWidth=e.currentTarget.clientWidth;p.lastX=e.clientX;const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(dx,dy)>8)clearHold();if(!p.dragged&&(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.25))return;
    if(!p.dragged){p.dragged=true;if(flat||reduced)return;const next=index+(dx<0?1:-1);if(next<0||next>=views.length)return;if(readingMode(views[next],preference)!==mode){p.modeChange=true;return;}
      const generation=++modeGeneration.current;p.loading=true;let to:HTMLCanvasElement;
      try{to=await ensure(views[next]);}catch{p.loading=false;if(pointer.current===p){p.up=true;pointer.current=null;setError('Sayfa yüklenemedi.');}return;}
      p.loading=false;if(p.up||pointer.current!==p||generation!==modeGeneration.current)return;
      const t:Turn={id:next,from:canvas!,to,direction:dx<0?1:-1,sourceCover:current.region==='cover',targetCover:views[next].region==='cover',fromCursor:cursor,toCursor:boundCursor(spreads,views[next],mode),start:performance.now(),duration:420,fromP:0,toP:1,dragging:true,progress:0};motionRef.current=t;setTurn(t);}
    const t=motionRef.current;if(t?.dragging){const progress=Math.max(0,Math.min(.98,(p.x-p.lastX)*t.direction/Math.max(1,pageWidth*.75)));const updated={...t,progress};motionRef.current=updated;setTurn(updated);}
  }
  function up(e:React.PointerEvent){clearHold();const p=pointer.current;if(!p)return;p.up=true;pointer.current=null;if(!p.dragged){if(!p.held&&current.region==='cover')void go(index+1);else if(!p.held&&mobile&&!guideActive&&!p.woke){clearIdle();setImmersive(true);}return;}const t=motionRef.current;if(!t){const dx=e.clientX-p.x,speed=Math.abs(dx)/Math.max(1,performance.now()-p.time);if(p.modeChange||p.loading){if(Math.abs(dx)>Math.min(120,e.currentTarget.clientWidth*.22)||speed>.55)void go(index+(dx<0?1:-1));}else if(flat||reduced)void go(index+(dx<0?1:-1),true);return;}if(!t.dragging)return;
    const progress=t.progress||0,velocity=Math.abs(e.clientX-p.x)/Math.max(1,performance.now()-p.time),complete=progress>.28||velocity>.55;const updated={...t,dragging:false,start:performance.now(),fromP:progress,toP:complete?1:0,duration:complete?Math.max(140,420*(1-progress)):180};motionRef.current=updated;setTurn(updated);
  }
  function cancel(){clearHold();const t=motionRef.current;if(pointer.current)pointer.current.up=true;pointer.current=null;if(t?.dragging){const n={...t,dragging:false,start:performance.now(),fromP:t.progress||0,toP:0,duration:180};motionRef.current=n;setTurn(n);}}
  const {w,h}=displaySize(mode),editable=canEdit(user,album);
  const backdrop=<BookBinding model={binding} cursor={cursor} height={h} cover={current.region==='cover'}/>;
  const fallback=<>{backdrop}{canvas&&<Flat canvas={canvas}/>}</>;
  return <div className={'reader-screen'+(landscape?' is-landscape':'')+(immersive?' is-immersive':'')} onPointerDownCapture={e=>{if((e.target as Element).closest('button'))revealControls();}} onFocusCapture={revealControls} style={bookStyle(coverDoc)}>
    <header className="reader-header" inert={immersive} aria-hidden={immersive}><button data-tour="reader-back" className="icon-button" onClick={onBack} aria-label="Albümlere dön"><ArrowLeft/></button><div className="reader-heading"><h1>{album.title}</h1><span>{album.visibility==='shared'?'Ortak':'Özel'}</span></div>{navigation}<div className="header-actions"><button data-tour="reader-mode" className="icon-button view-toggle" onClick={toggleMode} disabled={forcedBook} title={forcedBook?'İki sayfaya yayılan fotoğraf':mode==='single'?'Açık deftere geç':'Tek sayfaya geç'} aria-label={forcedBook?'İki sayfaya yayılan fotoğraf':mode==='single'?'Açık deftere geç':'Tek sayfaya geç'}>{mode==='single'?<BookOpen/>:<RectangleVertical/>}</button>{editable&&<><button data-tour="reader-edit" className="button secondary compact" aria-label="Sayfayı düzenle" onClick={()=>onEdit(current.spread.id,current.region==='left'||current.region==='right'?current.region:'full')}><Pencil size={16}/><span>Düzenle</span></button></>}</div></header>
    {immersive&&<button className="immersive-wake-btn" onClick={revealControls} aria-label="Menüyü göster">Menü</button>}{error&&<div className="notice error">{error}<button onClick={()=>{setError('');void go(index,true);}}>Yeniden dene</button></div>}
    <div className="reader-layout" ref={frame}>
    <main className={'reader-stage '+mode} style={{width:w,height:h}}>
      {morph&&<ViewTransition key={morph.id} value={morph} onDone={()=>setMorph(null)}/>}
      <div data-tour="reader-book" className={'book-frame '+mode+' '+(current.region==='cover'?'is-cover':'')+' '+(loading?'is-loading':'')+' '+(morph?'is-morphing':'')} style={{width:w,height:h}} title="Fotoğrafı açmak için basılı tut" onContextMenu={e=>e.preventDefault()} onPointerDown={down} onPointerMove={e=>void move(e)} onPointerUp={up} onPointerCancel={cancel}>
        {canvas?(flat||reduced?fallback:<Suspense fallback={fallback}><BookCanvas canvas={canvas} book={mode==='book'} cover={current.region==='cover'} binding={binding} cursor={cursor} turn={turn} onDone={finish} onLost={()=>{setFlat(true);motionRef.current=null;setTurn(null);}} spanning={spansCenter(current.spread.doc)} fallback={fallback}/></Suspense>):<>{backdrop}<div className="page-loading"><LoaderCircle className="spin"/><span>Yükleniyor</span></div></>}
      </div>
      <nav className="reader-photo-access" aria-label="Sayfadaki fotoğraflar">{[...new Set(current.spread.doc.elements.filter(e=>e.type==='photo').map(e=>e.assetId!))].map(id=><button key={id} className="reader-photo-access-button" onClick={()=>inspect(id)}>Orijinal fotoğrafı aç: {assets.find(a=>a.id===id)?.filename||'Fotoğraf'}</button>)}</nav>
      {current.region==='cover'&&views.length>1&&<button className="open-book-hint" onClick={()=>void go(index+1)}>Albümü aç<ChevronRight size={16}/></button>}
      {!current.spread.doc.cover&&!current.spread.doc.elements.length&&editable&&<button className="empty-page-action" onClick={()=>onEdit(current.spread.id,current.region==='left'||current.region==='right'?current.region:'full')}><Pencil size={22}/><span>Düzenle</span></button>}
    </main>
    <footer className="reader-footer" inert={immersive} aria-hidden={immersive}><button className="text-button cover-link" onClick={()=>void go(0,true)}>Kapağa dön</button><div className="page-navigation"><button className="icon-button" disabled={index===0} onClick={()=>void go(index-1)} aria-label="Önceki sayfa"><ChevronLeft/></button><button className="page-counter" onClick={()=>setThumbnails(v=>!v)} aria-expanded={thumbnails}><Grid2X2 size={15}/><span>{current.label}</span><span className="muted">/ {Math.max(0,(spreads.length-1)*2)}</span></button><button data-tour="reader-next" className="icon-button" disabled={index===views.length-1} onClick={()=>void go(index+1)} aria-label="Sonraki sayfa"><ChevronRight/></button></div><span/></footer>
    {mode==='book'&&!current.spread.doc.cover&&<p className="orientation-hint" role="status"><Smartphone size={15}/>Daha büyük görmek için telefonu yan çevir.</p>}
    </div>
    {thumbnails&&<div className="page-filmstrip" style={{bottom:Math.max(12,(frameSize.h-h-76)/2+76)}}><div className="filmstrip-title"><span>Sayfalar</span><button className="icon-button small" aria-label="Önizlemeleri kapat" onClick={()=>setThumbnails(false)}><X size={17}/></button></div><div className="filmstrip-scroll">{views.map((v,i)=><button className={'filmstrip-item '+(i===index?'active':'')} key={v.key} onClick={()=>{void go(i,true);setThumbnails(false);}}><MiniPage view={v}/><span>{v.label}</span></button>)}</div></div>}
  </div>;
}
function MiniPage({view}:{view:ReadingView}){return <span style={paperStyle(view.spread.doc,view.region==='right'?'right':'left')}><PagePreview doc={view.spread.doc} view={view} width={80} lazy/></span>;}
