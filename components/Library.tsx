import React, { useEffect, useRef, useState } from 'react';
import { Plus, ChevronDown, LogOut, ArrowUpRight } from 'lucide-react';
import type { Album, User } from '../lib/model';
import { assetUrl } from '../lib/model';
import { albumCover } from '../lib/composition';
import { paintDoc } from '../lib/render';
import { PrivateImage } from './PrivateImage';
import SiteHeader,{type Section} from './SiteHeader';

function Cover({ album }: { album: Album }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    void paintDoc(albumCover(album), 640).then(canvas => {
      if (active && ref.current) { ref.current.width = canvas.width; ref.current.height = canvas.height; ref.current.getContext('2d')!.drawImage(canvas, 0, 0); }
      canvas.width = canvas.height = 1;
    });
    return () => { active = false; };
  }, [album]);
  return <div className="album-book">
    {album.cover_assets?.slice(1,3).map((a,i)=><span className={'photo-leaf leaf-'+i} key={a.id}><PrivateImage src={assetUrl(a.id,'thumb')} alt="" loading="lazy"/></span>)}
    <span className="book-pages-edge"/><canvas ref={ref}/><span className="book-spine"/><span className="cover-sheen"/>
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
