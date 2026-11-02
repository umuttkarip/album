import { PAGE_H, PAGE_W, SPREAD_W, papers, photoBox, assetUrl, spansCenter, captionText, type PageDoc, type PageElement, type Spread } from './model';
import { stickers } from './stickers';
import { fetchAsset, isPrivateAsset } from './network';
const cache = new Map<string,Promise<HTMLImageElement>>();
export function imageFor(src: string): Promise<HTMLImageElement> {
  const existing=cache.get(src);if(existing){cache.delete(src);cache.set(src,existing);return existing;}
  const promise=(async()=>{const privateImage=isPrivateAsset(src),url=privateImage?URL.createObjectURL(await fetchAsset(src)):src;try{return await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Görüntü yüklenemedi.'));img.src=url;});}finally{if(privateImage)URL.revokeObjectURL(url);}})().catch(e=>{cache.delete(src);throw e;});
  cache.set(src,promise);while(cache.size>10)cache.delete(cache.keys().next().value!);return promise;
}
export function clearImages(){cache.clear();}
export function elementSrc(e: PageElement) {return e.assetId?assetUrl(e.assetId):stickers.find(s=>s.id===e.stickerId)?.src||'';}
export function paintPaper(ctx:CanvasRenderingContext2D,doc:PageDoc,width=doc.cover?PAGE_W:SPREAD_W){
  const dark=doc.paper==='charcoal';ctx.fillStyle=papers[doc.paper];ctx.fillRect(0,0,width,PAGE_H);
  ctx.fillStyle=dark?'rgba(255,255,255,.035)':'rgba(85,72,50,.035)';
  for(let n=0;n<1100;n++)ctx.fillRect((n*641)%width,(n*347)%PAGE_H,1.3,1.3);
  if(doc.texture==='dots'){ctx.fillStyle=dark?'#ffffff15':'#7d827229';for(let x=40;x<width;x+=42)for(let y=40;y<PAGE_H;y+=42){ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();}}
  if(doc.texture==='lines'){ctx.strokeStyle=dark?'#ffffff12':'#8a927c28';ctx.lineWidth=1;for(let y=78;y<PAGE_H;y+=44){ctx.beginPath();ctx.moveTo(38,y);ctx.lineTo(width-38,y);ctx.stroke();}}
  if(doc.cover){ctx.fillStyle=dark?'#00000005':'#ffffff10';for(let x=0;x<width;x+=5)ctx.fillRect(x,0,.6,PAGE_H);}
}
export async function paintDoc(doc: PageDoc, pixelWidth = 1600): Promise<HTMLCanvasElement> {
  const usedFonts=[...new Set(doc.elements.filter(e=>e.type==='text'||captionText(e)).map(e=>e.type==='text'?`${e.fontStyle==='italic'?'italic ':''}${e.fontWeight||400} 32px "${e.font||'Commissioner'}"`:`400 32px "${e.captionFont||'Caveat'}"`))];
  await Promise.all(usedFonts.map(font=>document.fonts.load(font)));
  const width=doc.cover?PAGE_W:SPREAD_W, canvas=document.createElement('canvas');canvas.width=pixelWidth;canvas.height=Math.round(pixelWidth*PAGE_H/width);
  const ctx=canvas.getContext('2d')!;ctx.scale(pixelWidth/width,pixelWidth/width);paintPaper(ctx,doc,width);
  for(const e of doc.elements.filter(e=>e.type!=='stroke')) {
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.rotation*Math.PI/180);ctx.globalAlpha=e.opacity;
    if(e.type==='text') {
      ctx.fillStyle=e.color||'#333b36';ctx.font=`${e.fontStyle==='italic'?'italic ':''}${e.fontWeight||400} ${e.size||36}px "${e.font||'Commissioner'}"`;ctx.textBaseline='top';ctx.textAlign=e.align||'left';
      ctx.beginPath();ctx.rect(0,0,e.w,e.h);ctx.clip();let y=0;
      for(const paragraph of (e.text||'').split('\n')) {let line='';for(const word of paragraph.split(' ')){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>e.w&&line){ctx.fillText(line,e.align==='center'?e.w/2:e.align==='right'?e.w:0,y);y+=(e.size||36)*1.35;line=word;}else line=candidate;}ctx.fillText(line,e.align==='center'?e.w/2:e.align==='right'?e.w:0,y);y+=(e.size||36)*1.35;}
    } else {
      try {
        const img=await imageFor(elementSrc(e)),b=photoBox(e,img.naturalWidth,img.naturalHeight),bx=Math.max(0,b.x),by=Math.max(0,b.y),bw=Math.min(e.w,b.x+b.w)-bx,bh=Math.min(e.h,b.y+b.h)-by;
        if(e.frame){ctx.fillStyle='#fffcf6';ctx.shadowColor='#29221a1a';ctx.shadowBlur=22;ctx.shadowOffsetY=9;ctx.fillRect(bx-16,by-16,bw+32,bh+58);ctx.shadowColor='transparent';}
        ctx.save();ctx.beginPath();ctx.rect(0,0,e.w,e.h);ctx.clip();ctx.drawImage(img,b.x,b.y,b.w,b.h);ctx.restore();
        if(captionText(e)){const size=e.captionSize||32;ctx.fillStyle=e.captionColor||(doc.paper==='charcoal'?'#e6e8dc':'#56614e');ctx.font=`${size}px "${e.captionFont||'Caveat'}"`;ctx.textAlign='left';ctx.textBaseline='top';captionText(e).split('\n').forEach((line,n)=>ctx.fillText(line,0,by+bh+24+n*size*1.35,e.w));}
      } catch {ctx.fillStyle=doc.paper==='charcoal'?'#4b5350':'#dedfd6';ctx.fillRect(0,0,e.w,e.h);ctx.fillStyle='#8b9389';ctx.font='28px Commissioner';ctx.fillText('Görüntü yüklenemedi',24,40);}
    }
    ctx.restore();
  }
  if(doc.elements.some(e=>e.type==='stroke')){
    const ink=document.createElement('canvas');ink.width=canvas.width;ink.height=canvas.height;const c=ink.getContext('2d')!;c.scale(pixelWidth/width,pixelWidth/width);
    for(const e of doc.elements.filter(e=>e.type==='stroke')){c.save();c.translate(e.x,e.y);c.rotate(e.rotation*Math.PI/180);c.globalAlpha=e.opacity;c.globalCompositeOperation=e.eraser?'destination-out':'source-over';c.lineCap=c.lineJoin='round';c.lineWidth=e.size||8;c.strokeStyle=e.color||'#434a40';c.beginPath();const pts=e.points||[];for(let n=0;n<pts.length;n+=2){const x=pts[n]*e.w,y=pts[n+1]*e.h;if(n===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();c.restore();}
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(ink,0,0);ctx.restore();ink.width=ink.height=1;
  }
  return canvas;
}
export type ReadingView = { key:string; spread:Spread; region:'cover'|'full'|'left'|'right'; label:string };
export function readingViews(spreads:Spread[], mode:'single'|'book'): ReadingView[] {
  return spreads.flatMap<ReadingView>(s=>s.doc.cover?[{key:s.id,spread:s,region:'cover' as const,label:'Kapak'}]:mode==='book'||spansCenter(s.doc)?[{key:s.id,spread:s,region:'full' as const,label:`${s.position*2+1}–${s.position*2+2}`}]:[
    {key:s.id+':left',spread:s,region:'left' as const,label:String(s.position*2+1)},
    {key:s.id+':right',spread:s,region:'right' as const,label:String(s.position*2+2)},
  ]);
}
export async function paintView(view:ReadingView,mode:'single'|'book') {
  const doc=await paintDoc(view.spread.doc,view.spread.doc.cover?1000:1600);
  if(view.region==='cover'||(view.region==='full'&&mode==='book'))return doc;
  const c=document.createElement('canvas');c.width=1000;c.height=1250;const ctx=c.getContext('2d')!;ctx.fillStyle=papers[view.spread.doc.paper];ctx.fillRect(0,0,1000,1250);
  if(view.region==='full')ctx.drawImage(doc,0,(1250-625)/2,1000,625);
  else ctx.drawImage(doc,view.region==='right'?doc.width/2:0,0,doc.width/2,doc.height,0,0,1000,1250);
  doc.width=doc.height=1;return c;
}
export function hitPhoto(doc:PageDoc,x:number,y:number) {
  return [...doc.elements].reverse().find(e=>{if(e.type!=='photo')return false;const r=-e.rotation*Math.PI/180,dx=x-e.x,dy=y-e.y,px=dx*Math.cos(r)-dy*Math.sin(r),py=dx*Math.sin(r)+dy*Math.cos(r);return px>=0&&px<=e.w&&py>=0&&py<=e.h;});
}
