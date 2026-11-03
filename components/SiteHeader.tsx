import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,CalendarDays,ChevronDown,Images,LogOut,CircleHelp,Minimize2} from 'lucide-react';
import type {User} from '../lib/model';
export type Section='albums'|'days'|'archive';
export function SectionNavigation({section,onSection}:{section:Section;onSection:(s:Section)=>void}){return <nav data-tour="sections" className="section-navigation" aria-label="Görünüm"><button data-tour="nav-albums" aria-current={section==='albums'?'page':undefined} onClick={()=>onSection('albums')}><BookOpen size={16}/><span>Albümler</span></button><button data-tour="nav-days" aria-current={section==='days'?'page':undefined} onClick={()=>onSection('days')}><CalendarDays size={16}/><span>Takvim</span></button></nav>;}
export default function SiteHeader({user,section,onSection,onLogout,onHelp}:{user:User;section:Section;onSection:(s:Section)=>void;onLogout:()=>void;onHelp?:()=>void}){
  const [menu,setMenu]=useState(false),host=useRef<HTMLDivElement>(null),[fullscreen,setFullscreen]=useState(false);
  useEffect(()=>{
    const updateFs=()=>setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange',updateFs);
    updateFs();
    return()=>document.removeEventListener('fullscreenchange',updateFs);
  },[]);
  useEffect(()=>{if(!menu)return;const close=(e:PointerEvent)=>{if(!host.current?.contains(e.target as Node))setMenu(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenu(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);};},[menu]);
  return <header className="site-header"><button className="wordmark brand-home" aria-label="Albümlere dön" onClick={()=>onSection('albums')}><BookOpen className="brand-symbol" size={22}/><span className="brand-title">Album</span></button><SectionNavigation section={section} onSection={onSection}/><div className="header-controls" style={{display:'flex',alignItems:'center',gap:'8px'}}>{fullscreen&&<button className="icon-button exit-fullscreen-header-btn" onClick={()=>void document.exitFullscreen?.().catch(()=>{})} aria-label="Tam ekrandan çık" title="Tam ekrandan çık"><Minimize2 size={18}/></button>}<div className="account-wrap" ref={host}><button className="account-button" aria-label={user.name+' hesabı'} onClick={()=>setMenu(v=>!v)} aria-expanded={menu} aria-controls="account-actions"><span className="avatar-letter">{user.name[0]}</span><span>{user.name}</span><ChevronDown size={15}/></button>{menu&&<div className="account-menu" id="account-actions">{user.admin&&<button onClick={()=>{setMenu(false);onSection('archive');}}><Images size={17}/>Tüm fotoğraflar</button>}{onHelp&&<button onClick={()=>{setMenu(false);onHelp();}}><CircleHelp size={17}/>Kısa kullanım</button>}<button onClick={onLogout}><LogOut size={17}/>Çıkış yap</button></div>}</div></div></header>;
}
