import React, { useEffect, useRef, useState } from 'react';
import { Plus, ChevronDown, LogOut, ArrowUpRight } from 'lucide-react';
import type { Album, User } from '../lib/model';
import { assetUrl } from '../lib/model';
import { albumCover,resolveSpreads } from '../lib/composition';
import { readingViews,type ReadingView } from '../lib/render';
import {request} from '../lib/client';
import {bookStyle,paperStyle} from '../lib/book-style';
import PagePreview from './PagePreview';
import type {Spread,Asset} from '../lib/model';
import SiteHeader,{type Section} from './SiteHeader';

function Cover({ album }: { album: Album }) {
  const host=useRef<HTMLDivElement>(null),[leaves,setLeaves]=useState<ReadingView[]>([]);
  const doc=React.useMemo(()=>albumCover(album),[album]);
  useEffect(()=>{
    let active=true;setLeaves([]);
    const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();void request<{spreads:Spread[];assets:Asset[]}>(`albums/${album.id}`).then(data=>{if(active)setLeaves(readingViews(resolveSpreads(data.spreads,data.assets,album.title),'single').filter(v=>v.region!=='cover').slice(0,2));}).catch(()=>{});},{rootMargin:'100px'});
    if(host.current)observer.observe(host.current);return()=>{active=false;observer.disconnect();};
  },[album.id,album.updated_at,album.title]);
  return <div className="album-book" ref={host} style={{...bookStyle(doc),...(leaves[0]?paperStyle(leaves[0].spread.doc):{})}}>
    {leaves.map((view,i)=><span className={'photo-leaf leaf-'+i} key={view.key} style={paperStyle(view.spread.doc,view.region==='right'?'right':'left')}><PagePreview doc={view.spread.doc} view={view} width={200}/></span>)}
    <span className="book-pages-edge"/><PagePreview doc={doc} width={640}/><span className="book-spine"/><span className="cover-sheen"/>
  </div>;
}

export default function Library({ user, albums, filter, onFilter, onNew, onAlbum, onLogout,onSection, busy }: {
  user:User; albums:Album[]; filter:string; onFilter:(v:string)=>void; onNew:()=>void; onAlbum:(id:string)=>void; onLogout:()=>void;onSection:(s:Section)=>void; busy:boolean;
}) {
  const [menu,setMenu]=useState(false);
  const visible=albums.filter(a=>filter==='all'||filter==='shared'&&a.visibility==='shared'||filter==='personal'&&a.visibility==='personal'&&a.owner_id===user.id);
  return <div className="home-screen">
    <SiteHeader user={user} section="albums" onSection={onSection} onLogout={onLogout}/>
    <main className="library">
      <div className="library-heading"><h1>Albümler</h1><button className="button primary" onClick={onNew}><Plus size={19}/>Yeni albüm</button></div>
      <nav className="library-tabs" aria-label="Albüm türü">{[['shared','Ortak'],['personal','Özel'],...(user.admin?[['all','Tümü']]:[])].map(([id,label])=><button key={id} aria-pressed={filter===id} className={filter===id?'active':''} onClick={()=>onFilter(id)}>{label}</button>)}</nav>
      {visible.length?<div className={'album-shelf'+(visible.length===1?' single-album':'')}>{visible.map((album,i)=><button className="album-entry" key={album.id} disabled={busy} onClick={()=>onAlbum(album.id)} style={{'--entry-index':i} as React.CSSProperties}>
        <div className="album-object"><Cover album={album}/><span className="open-album-cue"><ArrowUpRight size={20}/></span></div>
        <div className="album-caption"><h2>{album.title}</h2><p>{album.photo_count||0} fotoğraf<span>·</span>{album.visibility==='shared'?'Ortak':'Özel'}</p></div>
      </button>)}</div>:<div className="library-empty" aria-label="Albüm yok"><div className="empty-stack" aria-hidden="true"><span/><span/><span><Plus size={32}/></span></div></div>}
    </main>
  </div>;
}
