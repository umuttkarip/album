import { blankDoc, newElement, applyTemplate, type Asset, type Album, type PageDoc, type PageElement, type Spread, type Paper } from './model';
type Photo = Pick<Asset,'id'|'width'|'height'>;

export function isAutomatic(doc: PageDoc) {
  if(doc.autoLayout!==undefined)return doc.autoLayout;
  if(!doc.elements.length)return true;
  const e=doc.elements[0];
  return doc.cover&&doc.elements.length===1&&e.type==='text'&&e.x===90&&e.y===870&&e.w===820&&e.h===280&&e.font==='Commissioner'&&e.color==='#eef0e8';
}
function photo(asset:Photo,x:number,y:number,w:number,h:number,rotation=0,frame=true):PageElement {
  return newElement('photo',{id:`auto-photo-${asset.id}`,assetId:asset.id,x,y,w,h,rotation,frame,fit:'cover'});
}
function tape(id:string,x:number,y:number,rotation=0):PageElement {
  return newElement('sticker',{id:`auto-tape-${id}`,stickerId:'tape-oat',x,y,w:205,h:44,rotation,opacity:.8});
}
function fittedPhoto(asset:Photo,x:number,y:number,w:number,h:number,rotation=0){const scale=Math.min(w/asset.width,h/asset.height),pw=asset.width*scale,ph=asset.height*scale;return photo(asset,x+(w-pw)/2,y+(h-ph)/2,pw,ph,rotation);}
function photoTape(e:PageElement,id:string){const dx=e.w*.35,dy=-24,r=e.rotation*Math.PI/180;return tape(id,e.x+dx*Math.cos(r)-dy*Math.sin(r),e.y+dx*Math.sin(r)+dy*Math.cos(r),e.rotation-7);}
export function automaticCover(assets:readonly Photo[],title:string,source?:PageDoc):PageDoc {
  const layout=source?.coverLayout||'auto',paper=source?.paper==='charcoal'&&source.autoLayout===undefined?'sage':source?.paper||'sage';
  const doc:PageDoc={...blankDoc(paper,true),autoLayout:true,coverLayout:layout,texture:source?.texture||'plain'};
  const photos=layout==='plain'?[]:assets.slice(0,layout==='single'?1:3);
  if(photos.length===1)doc.elements.push(photo(photos[0],64,70,872,940,0,false));
  else if(photos.length===2){doc.elements.push(photo(photos[0],86,110,730,565,-5),photo(photos[1],200,595,700,435,4),tape('cover-1',300,94,-12));}
  else if(photos.length>=3){doc.elements.push(photo(photos[0],96,95,745,470,-5),photo(photos[1],90,637,430,370,-7),photo(photos[2],500,612,420,405,5),tape('cover-1',325,72,-9),tape('cover-2',565,592,13));}
  doc.elements.push(newElement('text',{id:'auto-cover-title',text:title,x:photos.length?80:100,y:photos.length?1085:540,w:photos.length?840:800,h:photos.length?135:270,font:photos.length?'Caveat':'Literata',size:Math.min(photos.length?72:64,title.length>35?42:100),color:paper==='charcoal'?'#f5f0e4':'#414b40',align:'center'}));
  return doc;
}
export function automaticSpread(assets:readonly Photo[],source:PageDoc,position=0):PageDoc {
  const doc:PageDoc={...blankDoc(source.paper),autoLayout:true,texture:source.texture||'plain'};
  if(assets.length<3){
    doc.elements=assets.map((a,i)=>fittedPhoto(a,110+i*1000,140,780,960,i?2:-3));
    const photos=[...doc.elements];for(const [i,e]of photos.entries())doc.elements.push(photoTape(e,i?'right':'left'));
  }else if(assets.length===3){
    const first=fittedPhoto(assets[0],115,155,770,930,-3),second=photo(assets[1],1160,125,690,455,4);
    doc.elements=[first,second,photo(assets[2],1140,710,735,420,-4),photoTape(first,'left'),photoTape(second,'right')];
  }else{
    const cells=[[110,125,750,450,-4],[160,720,720,420,3],[1160,180,710,420,4],[1120,720,750,420,-3]];
    doc.elements=assets.slice(0,4).map((a,i)=>photo(a,...cells[i] as [number,number,number,number,number]));
    doc.elements.push(tape('left',355,105,-8),tape('right',1380,160,7));
  }
  if(position%3===2&&assets.length===2)doc.texture=source.texture||'dots';
  return doc;
}
export function resolveSpreads(spreads:Spread[],assets:Asset[],title:string):Spread[] {
  const photos=assets.filter(a=>a.kind==='photo'&&a.ready);
  const used=new Set(spreads.filter(s=>!s.doc.cover&&!isAutomatic(s.doc)).flatMap(s=>s.doc.elements.flatMap(e=>e.type==='photo'&&e.assetId?[e.assetId]:[])));
  const available=photos.filter(a=>!used.has(a.id));let offset=0;
  return spreads.map(s=>{
    if(!isAutomatic(s.doc))return s;
    const doc=s.doc.cover?automaticCover(photos,title,s.doc):automaticSpread(available.slice(offset,offset+=4),s.doc,s.position);
    return {...s,doc};
  });
}
export function albumCover(album:Album):PageDoc {
  if(album.cover_doc&&!isAutomatic(album.cover_doc))return album.cover_doc;
  return automaticCover(album.cover_assets||[],album.title,album.cover_doc);
}
export function photoPlacement(doc:PageDoc,asset:Photo){
  if(doc.cover)return {x:100,y:140,w:800,h:Math.min(900,800*asset.height/asset.width)};
  const cells=[[110,150,780,930],[1110,150,780,930],[110,710,780,410],[1110,710,780,410]];
  const occupied=doc.elements.filter(e=>e.type==='photo'||e.type==='text').map(e=>{const r=e.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r),corners=[[0,0],[e.w,0],[0,e.h],[e.w,e.h]].map(([x,y])=>({x:e.x+x*c-y*s,y:e.y+x*s+y*c}));return {l:Math.min(...corners.map(p=>p.x)),r:Math.max(...corners.map(p=>p.x)),t:Math.min(...corners.map(p=>p.y)),b:Math.max(...corners.map(p=>p.y))};});
  const candidates=cells.map(([x,y,w,h],index)=>({x,y,w,h,index,score:occupied.reduce((sum,b)=>sum+Math.max(0,Math.min(x+w,b.r)-Math.max(x,b.l))*Math.max(0,Math.min(y+h,b.b)-Math.max(y,b.t))/(w*h),0)}));
  candidates.sort((a,b)=>a.score-b.score||a.index-b.index);const {x,y,w,h}=candidates[0],scale=Math.min(w/asset.width,h/asset.height),pw=asset.width*scale,ph=asset.height*scale;
  return {x:x+(w-pw)/2,y:y+(h-ph)/2,w:pw,h:ph};
}
