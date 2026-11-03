'use client';
import Library from './Library';
import Brand from './Brand';
import ScreenLoading from './ScreenLoading';
import Login from './Login';
import ThemePicker from './ThemePicker';
import Onboarding from './Onboarding';
import {startTour,advanceTour,tourContext,tourFilter,TOUR_DAY,type TourState,type TourEvent,type TourRead} from '../lib/onboarding';
import SiteHeader,{SectionNavigation,type Section} from './SiteHeader';
import {type DesignId} from '../lib/design';
import { PrivateImage } from './PrivateImage';
import { downloadAsset, backendConfigured } from '../lib/network';
import React,{useEffect,useState,useRef,lazy,Suspense} from 'react';
import { Plus,ArrowUpRight,ArrowRight,LogOut,ChevronDown,X,Eye,LockKeyhole,Users,LoaderCircle,Download,ZoomIn,ZoomOut,BookOpen,Trash2,RotateCcw } from 'lucide-react';
import type { Album,Spread,Asset,User,PageDoc,PageElement } from '../lib/model';
import { assetUrl,newElement,canEdit } from '../lib/model';
import { request,post } from '../lib/client';
import { paintDoc,clearImages } from '../lib/render';
const Reader=lazy(()=>import('./Reader')),Editor=lazy(()=>import('./Editor')),Days=lazy(()=>import('./Days')),AllPhotos=lazy(()=>import('./AllPhotos'));
type AlbumData={album:Album;spreads:Spread[];assets:Asset[]};
function Modal({children,onClose,className=''}:{children:React.ReactNode;onClose:()=>void;className?:string}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{if(!ref.current?.open)ref.current?.showModal();},[]);return <dialog ref={ref} className={'modal '+className} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>{children}</dialog>;}
function Lightbox({asset,onClose,onRemove,original=false,caption,date,uploader}:{asset:Asset;onClose:()=>void;onRemove?:()=>void;original?:boolean;caption?:string;date?:string;uploader?:string}){
  const [downloadError,setDownloadError]=useState(''),[flipped,setFlipped]=useState(false);
  const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),pointers=useRef(new Map<number,{x:number;y:number}>()),gesture=useRef<{x:number;y:number;d:number}|null>(null);
  const reset=()=>{setZoom(1);setPan({x:0,y:0});setFlipped(false);};
  function move(e:React.PointerEvent){if(flipped)return;const old=pointers.current.get(e.pointerId);if(!old)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.current.values()];if(ps.length===2){const d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),x=(ps[0].x+ps[1].x)/2,y=(ps[0].y+ps[1].y)/2;if(gesture.current){const g=gesture.current;setZoom(z=>Math.max(1,Math.min(6,z*d/g.d)));setPan(p=>({x:p.x+x-g.x,y:p.y+y-g.y}));}gesture.current={x,y,d};}else if(zoom>1)setPan(p=>({x:p.x+e.clientX-old.x,y:p.y+e.clientY-old.y}));}
  const formattedDate = date ? (() => { try { const d = new Date(date+'T12:00:00'); return new Intl.DateTimeFormat('tr',{day:'numeric',month:'long',year:'numeric'}).format(d); } catch { return date; } })() : null;
  return <Modal className="lightbox" onClose={onClose}>
    <header className="lightbox-header">
      <div className="lightbox-title-wrap">
        <span className="lightbox-title">{formattedDate || asset.filename}</span>
        {uploader && <span className="lightbox-uploader">{uploader === 'umut' ? 'Umut' : 'Sude'}</span>}
      </div>
      <div className="lightbox-controls">
        <button className={'button secondary compact flip-action-btn '+(flipped?'active':'')} onClick={()=>{setFlipped(f=>!f);setZoom(1);setPan({x:0,y:0});}} aria-pressed={flipped} aria-label={flipped?'Fotoğrafı göster':'Fotoğrafın arkasına bak'}>
          <RotateCcw size={16}/><span>{flipped?'Fotoğrafı gör':'Arkasına bak'}</span>
        </button>
        <button className="icon-button" onClick={()=>setZoom(z=>Math.max(1,z-.5))} aria-label="Uzaklaştır" disabled={flipped}><ZoomOut/></button>
        <button className="zoom-reset" onClick={reset} disabled={flipped}>{Math.round(zoom*100)}%</button>
        <button className="icon-button" onClick={()=>setZoom(z=>Math.min(6,z+.5))} aria-label="Yakınlaştır" disabled={flipped}><ZoomIn/></button>
        <button className="icon-button" onClick={()=>void downloadAsset(asset.id,asset.filename).catch(e=>setDownloadError(e.message))} aria-label="Orijinali indir"><Download/></button>
        {onRemove&&<button className="icon-button" aria-label="Fotoğrafı sil" onClick={onRemove}><Trash2/></button>}
        <button className="icon-button" onClick={onClose} aria-label="Fotoğrafı kapat"><X/></button>
      </div>
    </header>
    <div className="lightbox-stage" onPointerDown={e=>{if((e.target as Element).closest('button'))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={move} onPointerUp={e=>{pointers.current.delete(e.pointerId);gesture.current=null;}} onPointerCancel={e=>{pointers.current.delete(e.pointerId);gesture.current=null;}} onDoubleClick={()=>{if(!flipped){zoom>1?reset():setZoom(2);}}} onWheel={e=>{if(!flipped)setZoom(z=>Math.max(1,Math.min(6,z-e.deltaY*.002)));}}>
      <div className={'polaroid-flip-card '+(flipped?'is-flipped':'')} style={{'--photo-ratio':asset.width/asset.height,transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`} as React.CSSProperties}>
        <div className="polaroid-flipper">
          <div className="card-face card-front" inert={flipped} aria-hidden={flipped}>
            <PrivateImage src={assetUrl(asset.id,original||zoom>1.5?'original':'display')} alt={asset.filename} draggable={false}/>
            <button className="card-corner-flip" onClick={()=>setFlipped(true)} title="Arkasına bak"><span>Arkası</span><RotateCcw size={13}/></button>
          </div>
          <div className="card-face card-back" inert={!flipped} aria-hidden={!flipped} onClick={()=>setFlipped(false)}>
            <div className="card-back-header">
              <span className="card-back-stamp">{formattedDate || ''}</span>

            </div>
            <div className="card-back-body">
              {caption ? (
                <p className="card-back-note">{caption}</p>
              ) : (
                <p className="card-back-placeholder">Not yok.</p>
              )}
            </div>
            <div className="card-back-footer">
              <span>{uploader === 'umut' ? 'Umut tarafından eklendi' : uploader === 'sude' ? 'Sude tarafından eklendi' : ''}</span>
              <button className="card-back-return" onClick={(e)=>{e.stopPropagation();setFlipped(false);}}>Fotoğrafa dön</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p className="lightbox-help" role="alert">{downloadError}</p>
  </Modal>;
}
export class ScreenBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<main className="boot-screen screen-error"><span role="alert">Ekran yüklenemedi.</span><button className="button primary" onClick={()=>window.location.reload()}>Yeniden yükle</button></main>:this.props.children;}
}
export default function AlbumApp(){return <ScreenBoundary><AlbumContent/></ScreenBoundary>;}
function AlbumContent(){
  const [user,setUser]=useState<User|null>(null),[boot,setBoot]=useState(true),[albums,setAlbums]=useState<Album[]>([]),[filter,setFilter]=useState('shared'),[data,setData]=useState<AlbumData|null>(null),[screen,setScreen]=useState<'home'|'reader'|'editor'>('home'),[editId,setEditId]=useState(''),[photoId,setPhotoId]=useState<string|null>(null),[photoContext,setPhotoContext]=useState<PageElement|null>(null),[newOpen,setNewOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false),[detailsError,setDetailsError]=useState(''),[accountMenu,setAccountMenu]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[title,setTitle]=useState(''),[visibility,setVisibility]=useState<'shared'|'personal'>('shared'),[description,setDescription]=useState('');
  const [editFocus,setEditFocus]=useState<'left'|'right'|'full'>('full');
  const [designId,setDesignId]=useState<DesignId>('collage');
  const [applyDesign,setApplyDesign]=useState(false);
  const [tour,setTour]=useState<TourState|null>(null),tourAccount=useRef('');
  const [section,setSection]=useState<Section>('albums'),[inspectPhoto,setInspectPhoto]=useState<Asset|null>(null),[refreshKey,setRefreshKey]=useState(0),[removal,setRemoval]=useState<{asset:Asset}|{album:Album}|null>(null),[removing,setRemoving]=useState(false),[removalError,setRemovalError]=useState('');
  const previewPhotos=React.useMemo(()=>albums.flatMap(a=>a.cover_assets||[]).slice(0,3),[albums]);
  const refreshAlbums=async()=>setAlbums((await request('albums')).albums);
  const tourEvent=React.useCallback((event:TourEvent)=>setTour(state=>advanceTour(state,event)),[]);
  const reportRead=React.useCallback((read:TourRead)=>tourEvent({type:'read',...read}),[tourEvent]);
  const tourAlbum=()=>albums.find(a=>a.visibility==='shared')?.id||albums.find(a=>canEdit(user!,a))?.id||null;
  function beginTour(){setTour(startTour(tourAlbum()));}
  function nextTour(){if(tour?.step==='invite')tourEvent({type:'start',albumId:tourAlbum()});else tourEvent({type:'next'});}
  function closeNewAlbum(){setNewOpen(false);tourEvent({type:'create-closed'});}
  useEffect(()=>{
    if(!tour||tour.step==='invite')return;
    setPhotoId(null);setInspectPhoto(null);setDetailsOpen(false);setRemoval(null);
    if(tour.step!=='create')setNewOpen(false);
    const context=tourContext(tour.step),wantedFilter=tour.step==='open-album'&&albums.some(a=>a.id===tour.albumId&&a.visibility==='personal')?'personal':tourFilter(tour.step);
    if(context==='library'){setSection('albums');setScreen('home');if(wantedFilter)setFilter(wantedFilter);}
    if(context==='reader'){setSection('albums');if(data)setScreen('reader');}
    if(context==='editor'){setSection('albums');if(data)setScreen('editor');}
    if(context==='days'){setSection('days');setScreen('home');}
  },[tour?.step,section,screen,data?.album.id,filter,newOpen,detailsOpen,photoId,inspectPhoto,removal]);
  useEffect(()=>{window.scrollTo(0,0);},[screen,section,user?.id]);
  useEffect(()=>{
    if(!user){tourAccount.current='';setTour(null);return;}
    if(user.id==='sude'){tourAccount.current=user.id;return;}
    if(tourAccount.current===user.id)return;
    const id=user.id;tourAccount.current=id;
    void post('auth/onboarding/claim').then(r=>{if(r.show&&tourAccount.current===id)setTour(startTour(null,true));}).catch(()=>{});
  },[user?.id]);
  function openNewAlbum(){setTitle('');setDesignId('collage');setVisibility(filter==='personal'?'personal':'shared');setNewOpen(true);tourEvent({type:'new-album'});}
  useEffect(()=>{void request('auth/me').then(async r=>{setUser(r.user);await refreshAlbums();}).catch(e=>{if(e.status!==401)setError(e.message);}).finally(()=>setBoot(false));},[]);
  useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(t);},[message]);
  async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await post('auth/login',{username,password});setUser(r.user);setPassword('');await refreshAlbums();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function logout(){try{await post('auth/logout');clearImages();setUser(null);setData(null);setScreen('home');setSection('albums');setInspectPhoto(null);setPhotoId(null);setRemoval(null);setAccountMenu(false);setAlbums([]);}catch(e){setMessage((e as Error).message);}}
  async function openAlbum(id:string){setBusy(true);try{setData(await request(`albums/${id}`));setScreen('reader');tourEvent({type:'album-opened',id});}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function refreshData(){if(data)setData(await request(`albums/${data.album.id}`));}
  async function backHome(){setScreen('home');if(!tour)setData(null);tourEvent({type:'library-back'});await refreshAlbums();}
  async function create(e:React.FormEvent){e.preventDefault();setBusy(true);try{const r=await post('albums',{title,visibility,designId});tourEvent({type:'created'});setNewOpen(false);setTitle('');setFilter(visibility);await refreshAlbums();await openAlbum(r.id);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function openDetails(){if(!data)return;const fresh:AlbumData=await request(`albums/${data.album.id}`);setData(fresh);setTitle(fresh.album.title);setDescription(fresh.album.description);setDesignId(fresh.album.design_id||'plain');setApplyDesign(false);setDetailsError('');setDetailsOpen(true);}
  async function updateDetails(e:React.FormEvent){e.preventDefault();if(!data)return;setBusy(true);try{await request(`albums/${data.album.id}`,{method:'PATCH',body:JSON.stringify({title,description,designId,applyDesignToExisting:applyDesign,updatedAt:data.album.updated_at})});await refreshData();setApplyDesign(false);setDetailsOpen(false);}catch(e){setDetailsError((e as Error).message);}finally{setBusy(false);}}
  function changeSection(s:Section){if(s==='archive'&&!user?.admin)return;setSection(s);if(s==='days')tourEvent({type:'days'});setNewOpen(false);setDetailsOpen(false);}
  function askRemove(target:{asset:Asset}|{album:Album}){setRemovalError('');setRemoval(target);}
  async function remove(){if(!removal||removing)return;setRemoving(true);setRemovalError('');try{if('asset'in removal){await request('assets/'+removal.asset.id,{method:'DELETE',body:JSON.stringify({confirmFilename:removal.asset.filename})});setPhotoId(null);setInspectPhoto(null);if(data)await refreshData();}else{if(!data||data.album.id!==removal.album.id)return;await request('albums/'+removal.album.id,{method:'DELETE',body:JSON.stringify({confirmTitle:removal.album.title,updatedAt:removal.album.updated_at,assetIds:data.assets.map(a=>a.id)})});setDetailsOpen(false);setData(null);setScreen('home');}clearImages();await refreshAlbums();setRefreshKey(n=>n+1);setRemoval(null);}catch(e){setRemovalError((e as Error).message);}finally{setRemoving(false);}}
  const tourOverlay=tour&&<Onboarding state={tour} onNext={nextTour} onClose={()=>setTour(null)}/>;
  if(boot)return <div className="boot-screen"><Brand/><LoaderCircle className="spin" size={22}/></div>;
  if(!user)return <Login username={username} password={password} showPassword={showPassword} onUsername={setUsername} onPassword={setPassword} onShow={()=>setShowPassword(v=>!v)} onSubmit={e=>void login(e)} busy={busy} error={error}/>;
  const visible=albums.filter(a=>filter==='all'||filter==='shared'&&a.visibility==='shared'||filter==='personal'&&a.visibility==='personal'&&a.owner_id===user.id);
  const lightboxAsset=inspectPhoto||data?.assets.find(a=>a.id===photoId),activeDocElement=photoId?photoContext:null,header=<SiteHeader user={user} section={section} onSection={changeSection} onLogout={()=>void logout()} onHelp={beginTour}/>;
  return <>
    {data&&screen==='editor'?<Suspense fallback={<ScreenLoading kind="editor" title={data.album.title} onBack={()=>setScreen('reader')}/>}><Editor key={data.album.id} album={data.album} spreads={data.spreads} assets={data.assets} user={user} initialId={editId} initialFocus={editFocus} onBack={()=>{setScreen('reader');tourEvent({type:'editor-back'});}} onRefresh={refreshData} settingsOpen={detailsOpen} onDetails={openDetails} onRemove={asset=>askRemove({asset})}/></Suspense>:section==='days'?<Suspense fallback={<ScreenLoading kind="days" header={header}/>}><Days header={header} onPhoto={setInspectPhoto} onRemove={asset=>askRemove({asset})} refreshKey={refreshKey} onTourEvent={tourEvent} guideMonth={tour&&['calendar','open-day','upload','close-day'].includes(tour.step)?'2026-10':undefined} guideDay={tour&&['upload','close-day'].includes(tour.step)?TOUR_DAY:undefined}/></Suspense>:section==='archive'&&user.admin?<div className="home-screen">{header}<Suspense fallback={<ScreenLoading kind="archive"/>}><AllPhotos key={refreshKey} onPhoto={setInspectPhoto}/></Suspense></div>:data&&screen==='reader'?<Suspense fallback={<ScreenLoading kind="reader" title={data.album.title} header={<SectionNavigation section="albums" onSection={changeSection}/>} onBack={()=>void backHome()}/>}><Reader onTourRead={reportRead} tourFromCover={!!tour&&['open-album','browse'].includes(tour.step)} album={data.album} spreads={data.spreads} assets={data.assets} user={user} navigation={<SectionNavigation section="albums" onSection={changeSection}/>} onBack={()=>void backHome()} onEdit={(id,side)=>{setEditFocus(side||'full');setEditId(id);setScreen('editor');tourEvent({type:'edit'});}} onPhoto={(id,element)=>{setPhotoId(id);setPhotoContext(element||null);}} guideActive={!!tour}/></Suspense>:<Library user={user} albums={albums} filter={filter} onFilter={value=>{setFilter(value);tourEvent({type:'filter',value});}} onNew={openNewAlbum} onAlbum={id=>void openAlbum(id)} onLogout={()=>void logout()} onSection={changeSection} onHelp={beginTour} busy={busy}/>}
    {newOpen&&<Modal className="album-create" onClose={closeNewAlbum}><div className="modal-heading"><h2>Yeni albüm</h2><button className="icon-button" onClick={closeNewAlbum} aria-label="Kapat"><X/></button></div><form onSubmit={e=>void create(e)}><div className="creation-layout"><div className="creation-fields"><label htmlFor="album-title">Albüm adı</label><input id="album-title" maxLength={100} autoFocus required value={title} onChange={e=>setTitle(e.target.value)}/><fieldset><legend>Albüm türü</legend><div className="visibility-options"><label className={visibility==='shared'?'selected':''}><input type="radio" name="visibility" checked={visibility==='shared'} onChange={()=>setVisibility('shared')}/><Users size={18}/><strong>Ortak</strong><span>Birlikte fotoğraf ekleyip düzenleyebilirsiniz.</span></label><label className={visibility==='personal'?'selected':''}><input type="radio" name="visibility" checked={visibility==='personal'} onChange={()=>setVisibility('personal')}/><LockKeyhole size={18}/><strong>Özel</strong><span>Yalnızca sen fotoğraf ekleyebilirsin.</span></label></div></fieldset></div><div className="creation-designs"><span className="field-label">Tasarım</span><ThemePicker expanded value={designId} onChange={setDesignId} photos={previewPhotos} title={title}/></div></div><div className="creation-submit"><button className="button primary" disabled={busy||!title.trim()}>{busy?<LoaderCircle className="spin" size={18}/>:<>Albümü oluştur<ArrowRight size={18}/></>}</button></div></form></Modal>}
    {detailsOpen&&data&&<Modal onClose={()=>{setApplyDesign(false);setDetailsOpen(false);}}><div className="modal-heading"><h2>Albüm ayarları</h2><button className="icon-button" onClick={()=>{setApplyDesign(false);setDetailsOpen(false);}} aria-label="Kapat"><X/></button></div><form onSubmit={e=>void updateDetails(e)}>{detailsError&&<p className="settings-error" role="alert">{detailsError}</p>}<label htmlFor="detail-title">Albüm adı</label><input id="detail-title" maxLength={100} required value={title} onChange={e=>setTitle(e.target.value)}/><label htmlFor="detail-description">Kısa açıklama</label><textarea id="detail-description" rows={3} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)}/><label>Albüm tasarımı</label><ThemePicker value={designId} onChange={id=>{setDesignId(id);setApplyDesign(true);}} photos={data.assets.filter(a=>a.kind==='photo').slice(0,3)} title={title}/><label className="apply-design-option"><input type="checkbox" checked={applyDesign} onChange={e=>setApplyDesign(e.target.checked)}/>Mevcut sayfalara da uygula</label>{applyDesign&&<p className="field-hint">Kâğıt ve yazı renkleri değişir. Fotoğraf yerleşimleri korunur.</p>}<button className="button primary full" disabled={busy||!title.trim()}>Kaydet</button></form>{data.album.owner_id===user.id&&<button className="text-button remove-album" onClick={()=>askRemove({album:data.album})}><Trash2 size={16}/>Albümü sil</button>}</Modal>}
    {lightboxAsset&&<Lightbox key={lightboxAsset.id} asset={lightboxAsset} original={!!photoId} caption={activeDocElement?.caption} date={activeDocElement?.date||lightboxAsset.captured_on||undefined} uploader={lightboxAsset.created_by} onClose={()=>{setPhotoId(null);setPhotoContext(null);setInspectPhoto(null);}} onRemove={photoId&&data&&canEdit(user,data.album)?()=>askRemove({asset:lightboxAsset}):undefined}/>}
    {removal&&<Modal className="confirm-removal" onClose={()=>{if(!removing)setRemoval(null);}}><div className="modal-heading"><h2>{'asset'in removal?'Fotoğraf silinsin mi?':'Albüm silinsin mi?'}</h2><button className="icon-button" disabled={removing} aria-label="Silmekten vazgeç" onClick={()=>setRemoval(null)}><X/></button></div><p>{'asset'in removal?'Fotoğraf sitede gizlenir. Arşivde korunur.':'Albüm listeden kaldırılır. Fotoğraflar arşivde korunur.'}</p>{removalError&&<p role="alert">{removalError}</p>}<div className="dialog-actions"><button className="button secondary" disabled={removing} onClick={()=>setRemoval(null)}>Vazgeç</button><button className="button danger" disabled={removing} onClick={()=>void remove()}>{removing?<LoaderCircle className="spin" size={17}/>:'Sil'}</button></div></Modal>}
    {tourOverlay}
    {message&&<div className="toast" role="status">{message}</div>}
  </>;
}
