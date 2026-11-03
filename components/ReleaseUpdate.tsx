import React,{useEffect,useState} from 'react';
declare const __ALBUM_BUILD_ID__:string;
export default function ReleaseUpdate(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(__ALBUM_BUILD_ID__==='development')return;
    let active=true;const controller=new AbortController();
    const check=async()=>{if(document.visibilityState==='hidden')return;try{const r=await fetch('/version.json',{cache:'no-store',signal:controller.signal});if(r.ok){const v=await r.json() as {id?:unknown};if(active&&typeof v.id==='string'&&v.id!==__ALBUM_BUILD_ID__)setReady(true);}}catch{}};
    const chunkError=(event:Event)=>{if(!document.querySelector('.editor-screen')){event.preventDefault();window.location.reload();}else setReady(true);};
    window.addEventListener('vite:preloadError',chunkError);
    void check();const timer=setInterval(check,60000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
    return()=>{active=false;window.removeEventListener('vite:preloadError',chunkError);controller.abort();clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
  },[]);
  return ready?<div className="release-update" role="status">Yeni sürüm hazır.<button className="button primary compact" onClick={()=>{if(document.querySelector('.editor-screen')){if(!window.confirm('Kaydedilmemiş değişiklikler olabilir. Sayfa yenilensin mi?'))return;}window.location.reload();}}>Yenile</button></div>:null;
}
