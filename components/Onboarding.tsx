import React,{useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,X} from 'lucide-react';
import {describeTour,type TourState} from '../lib/onboarding';

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
  const [anchor,setAnchor]=useState<{box:Box|null;host:HTMLElement;w:number;h:number}>(()=>({box:null,host:document.body,w:window.innerWidth,h:window.innerHeight})),[panelH,setPanelH]=useState(210);
  const mask=useId().replaceAll(':','');
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}};document.addEventListener('keydown',listener,true);return()=>document.removeEventListener('keydown',listener,true);},[]);
  useLayoutEffect(()=>{
    let scrolled:Element|null=null,focused=false;
    const update=()=>{
      const target=description.target?[...document.querySelectorAll<HTMLElement>(description.target)].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}):null;
      const w=window.visualViewport?.width||window.innerWidth,h=window.visualViewport?.height||window.innerHeight;
      if(target&&scrolled!==target){scrolled=target;target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
      const r=target?.getBoundingClientRect(),box=r?{x:clamp(r.left-6,4,w-4),y:clamp(r.top-6,4,h-4),w:Math.min(r.width+12,w-8),h:Math.min(r.height+12,h-8)}:null;
      const host=(target?.closest('dialog[open]')||document.querySelector('dialog[open]')||document.body) as HTMLElement;
      setAnchor(old=>old.host===host&&old.w===w&&old.h===h&&JSON.stringify(old.box)===JSON.stringify(box)?old:{box,host,w,h});
      if(target&&!focused){focused=true;if(!description.next||state.step==='create')target.focus({preventScroll:true});}
    };
    update();const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','data-tour-ready']});
    window.addEventListener('resize',update);window.addEventListener('scroll',update,true);window.visualViewport?.addEventListener('resize',update);
    return()=>{observer.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);window.visualViewport?.removeEventListener('resize',update);};
  },[description.target,state.step]);
  useLayoutEffect(()=>{const el=panel.current;if(!el)return;const resize=new ResizeObserver(()=>setPanelH(el.getBoundingClientRect().height));resize.observe(el);setPanelH(el.getBoundingClientRect().height);return()=>resize.disconnect();},[anchor.host,state.step]);
  const invite=state.step==='invite',ready=invite||!!anchor.box,position=placement(anchor.box,anchor.w,anchor.h,panelH);
  return createPortal(<>
    {!invite&&anchor.box&&<svg className="tour-spotlight" width={anchor.w} height={anchor.h} aria-hidden="true"><defs><mask id={mask}><rect width="100%" height="100%" fill="white"/><rect x={anchor.box.x} y={anchor.box.y} width={anchor.box.w} height={anchor.box.h} rx="10" fill="black"/></mask></defs><rect width="100%" height="100%" fill="#080d19a8" mask={`url(#${mask})`}/><rect className="tour-target-ring" x={anchor.box.x} y={anchor.box.y} width={anchor.box.w} height={anchor.box.h} rx="10"/></svg>}
    <aside ref={panel} className="usage-tour guided-tour" style={position} role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby={description.text?'tour-description':undefined} data-tour-step={state.step}>
      <div className="tour-top"><span>{description.chapter}</span><button className="icon-button" onClick={onClose} aria-label="Tanıtımı kapat"><X size={18}/></button></div>
      <div className="tour-copy" aria-live="polite"><h2 id="tour-title">{description.title}</h2>{description.text&&<p id="tour-description">{description.text}</p>}</div>
      {description.next?<div className="tour-actions"><button className="text-button" onClick={onClose}>{invite?'Geç':'Turu bitir'}</button><button className="button primary" disabled={!ready} onClick={onNext}>{description.next}<ArrowRight size={16}/></button></div>:!ready&&<p className="tour-required" role="status">Açılıyor…</p>}
    </aside>
  </>,anchor.host);
}
