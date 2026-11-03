import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,X} from 'lucide-react';
import {describeTour,tourInteractionTargets,type TourState} from '../lib/onboarding';

type Box={x:number;y:number;w:number;h:number};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(Math.max(min,max),n));
function placement(box:Box|null,w:number,h:number,panelH:number){
  const width=Math.min(350,w-24),height=Math.min(panelH||210,h-24),margin=12;
  if(!box)return {left:w-width-margin,top:h-height-margin,width};
  const x=clamp(box.x+box.w/2-width/2,margin,w-width-margin),y=clamp(box.y+box.h/2-height/2,margin,h-height-margin);
  const choices=[{left:x,top:box.y+box.h+margin},{left:x,top:box.y-height-margin},{left:box.x+box.w+margin,top:y},{left:box.x-width-margin,top:y}];
  const fits=choices.find(p=>p.left>=margin&&p.top>=margin&&p.left+width<=w-margin&&p.top+height<=h-margin);
  return {...(fits||{left:w-width-margin,top:h-height-margin}),width};
}
export default function Onboarding({state,onNext,onClose}:{state:TourState;onNext:()=>void;onClose:()=>void}) {
  const description=describeTour(state),panel=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
  const [anchor,setAnchor]=useState<{box:Box|null;host:HTMLElement;w:number;h:number;boxes:Box[]}>(()=>({box:null,host:document.body,w:window.innerWidth,h:window.innerHeight,boxes:[]})),[panelH,setPanelH]=useState(210);
  const [compact,setCompact]=useState(false);
  const mask=useId().replaceAll(':','');
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}};document.addEventListener('keydown',listener,true);return()=>document.removeEventListener('keydown',listener,true);},[]);
  useLayoutEffect(()=>{
    let scrolled:Element|null=null,focused=false;
    const update=()=>{
      const target=description.target?[...document.querySelectorAll<HTMLElement>(description.target)].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}):null;
      const w=window.visualViewport?.width||window.innerWidth,h=window.visualViewport?.height||window.innerHeight;
      if(target&&scrolled!==target){scrolled=target;target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
      const selectors=tourInteractionTargets(state);
      const regions=[...new Set([...(target?[target]:[]),...selectors.flatMap(s=>s==='body'?[]:[...document.querySelectorAll<HTMLElement>(s)])])];
      const boxes=regions.map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>({x:Math.max(0,r.left-3),y:Math.max(0,r.top-3),w:Math.min(r.right+3,w)-Math.max(0,r.left-3),h:Math.min(r.bottom+3,h)-Math.max(0,r.top-3)})).filter(r=>r.w>0&&r.h>0);
      const r=target?.getBoundingClientRect(),box=r?{x:clamp(r.left-6,4,w-4),y:clamp(r.top-6,4,h-4),w:Math.min(r.width+12,w-8),h:Math.min(r.height+12,h-8)}:null;
      const host=(target?.closest('dialog[open]')||document.querySelector('dialog[open]')||document.body) as HTMLElement;
      setAnchor(old=>old.host===host&&old.w===w&&old.h===h&&JSON.stringify(old.box)===JSON.stringify(box)&&JSON.stringify(old.boxes)===JSON.stringify(boxes)?old:{box,host,w,h,boxes});
      if(target&&!focused){focused=true;if(!description.next||state.step==='create')target.focus({preventScroll:true});}
    };
    update();const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','data-tour-ready']});
    window.addEventListener('resize',update);window.addEventListener('scroll',update,true);window.visualViewport?.addEventListener('resize',update);
    return()=>{observer.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);window.visualViewport?.removeEventListener('resize',update);};
  },[description.target,state.step]);
  useLayoutEffect(()=>{const el=panel.current;if(!el)return;const resize=new ResizeObserver(()=>setPanelH(el.getBoundingClientRect().height));resize.observe(el);setPanelH(el.getBoundingClientRect().height);return()=>resize.disconnect();},[anchor.host,state.step]);
  useLayoutEffect(()=>{
    setCompact(false);
    const selectors=tourInteractionTargets(state),isAllowed=(node:EventTarget|null)=>node instanceof Element&&(!!node.closest('[data-tour-step],.release-update')||selectors.some(s=>!!node.closest(s)));
    const guard=(event:Event)=>{
      if(state.step==='invite'||isAllowed(event.target)){if(state.step==='tools'&&event.type==='pointerdown'&&!(event.target as Element)?.closest('[data-tour-step]'))setCompact(true);return;}
      if(event instanceof KeyboardEvent&&(event.key==='Escape'||(state.step==='tools'&&(event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase()))))return;
      event.preventDefault();event.stopImmediatePropagation();
      if(event.type==='focusin')panel.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    };
    const events=['pointerdown','mousedown','touchstart','click','dblclick','contextmenu','dragstart','drop','keydown','focusin'];
    for(const name of events)document.addEventListener(name,guard,{capture:true,passive:false});
    return()=>{for(const name of events)document.removeEventListener(name,guard,true);};
  },[state.step,state.albumId]);
  const invite=state.step==='invite' ,ready=invite||!!anchor.box,position=state.step==='tools'?{left:Math.max(12,anchor.w-(compact?185:350)-12),top:10,width:Math.min(compact?185:350,anchor.w-24)}:placement(anchor.box,anchor.w,anchor.h,panelH);
  return createPortal(<>
    {!invite&&anchor.box&&<svg className="tour-spotlight" width={anchor.w} height={anchor.h} aria-hidden="true"><defs><mask id={mask}><rect width="100%" height="100%" fill="white"/>{anchor.boxes.map((b,i)=><rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="10" fill="black"/>)}</mask></defs><rect width="100%" height="100%" fill="#080d19a8" mask={`url(#${mask})`}/><rect className="tour-target-ring" x={anchor.box.x} y={anchor.box.y} width={anchor.box.w} height={anchor.box.h} rx="10"/></svg>}
    <aside ref={panel} className="usage-tour guided-tour" style={position} role="dialog" aria-modal="false" aria-labelledby={compact?undefined:"tour-title"} aria-label={compact?"Düzenleme araçları":undefined} aria-describedby={description.text&&!compact?'tour-description':undefined} data-tour-step={state.step}>
      <div className="tour-top"><span>{compact?'Araçları deneyebilirsin':description.chapter}</span><button className="icon-button" onClick={onClose} aria-label="Tanıtımı kapat"><X size={18}/></button></div>
      {!compact&&<div className="tour-copy" aria-live="polite"><h2 id="tour-title">{description.title}</h2>{description.text&&<p id="tour-description">{description.text}</p>}</div>}
      {description.next?<div className="tour-actions"><button className="text-button" onClick={onClose}>{invite?'Geç':'Bitir'}</button><button className="button primary" disabled={!ready} onClick={onNext}>{description.next}<ArrowRight size={16}/></button></div>:!ready&&<p className="tour-required" role="status">Açılıyor…</p>}
    </aside>
  </>,anchor.host);
}
