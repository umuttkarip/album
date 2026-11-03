import React from 'react';
import {ArrowLeft} from 'lucide-react';

export function ArchivePlaceholders(){
  return <div className="photo-archive-grid loading-placeholders" aria-hidden="true">{Array.from({length:6},(_,i)=><div key={i}><div className="archive-photo-image placeholder-surface"/><div className="placeholder-line"/><div className="placeholder-line short"/></div>)}</div>;
}

/** Keep navigation and content geometry present while a screen's code arrives. */
export default function ScreenLoading({kind,header,title,onBack}:{kind:'days'|'archive'|'reader'|'editor';header?:React.ReactNode;title?:string;onBack?:()=>void}){
  const reading=kind==='reader'||kind==='editor';
  return <div className={reading?'reader-screen screen-loading':'home-screen screen-loading'} aria-busy="true">
    {reading?<header className="reader-header"><button className="icon-button" onClick={onBack} aria-label="Geri dön"><ArrowLeft/></button><div className="reader-heading"><h1>{title}</h1></div>{header}</header>:header}
    <main className={reading?'reading-placeholder':kind==='days'?'days-content':'photo-library'}>
      <span className="visually-hidden" role="status">Yükleniyor</span>
      {reading?<div className="placeholder-page placeholder-surface" aria-hidden="true"/>:kind==='archive'?<><div className="photo-library-heading"><h1>Tüm fotoğraflar</h1></div><ArchivePlaceholders/></>:<><div className="days-toolbar"><h1 className="loading-calendar-title">Takvim</h1></div><div className="calendar-placeholder" aria-hidden="true">{Array.from({length:35},(_,i)=><div className="placeholder-surface" key={i}/>)}</div></>}
    </main>
  </div>;
}
