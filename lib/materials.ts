import { papers, photoBox, captionText, type PageDoc, type PageElement } from './model';
import type { PaperSurface } from './design';
export function drawSurface(ctx:CanvasRenderingContext2D,s:PaperSurface,x:number,w:number,h=1250){
  ctx.save();ctx.beginPath();ctx.rect(x,0,w,h);ctx.clip();ctx.fillStyle=s.color;ctx.fillRect(x,0,w,h);const dark=parseInt(s.color.slice(1,3),16)<100,ink=s.ink||(dark?'#ffffff':'#485267');ctx.fillStyle=ink;ctx.strokeStyle=ink;
  if(s.pattern==='grain'||s.pattern==='linen'){ctx.globalAlpha=dark?.035:.028;for(let n=0;n<2300;n++)ctx.fillRect(x+(n*641)%w,(n*347)%h,1.2,n%3?1.2:2.5);}
  if(s.pattern==='linen'){ctx.globalAlpha=.042;for(let i=0;i<w;i+=5)ctx.fillRect(x+i,0,i%15?.55:.85,h);for(let j=0;j<h;j+=5)ctx.fillRect(x,j,w,j%20?.5:.8);}
  if(s.pattern==='gingham'){const cell=44;ctx.globalAlpha=.07;for(let i=0;i<w;i+=cell*2)ctx.fillRect(x+i,0,cell,h);for(let j=0;j<h;j+=cell*2)ctx.fillRect(x,j,w,cell);}
  if(s.pattern==='grid'||s.pattern==='lines'){ctx.globalAlpha=.12;ctx.lineWidth=1;ctx.beginPath();for(let y=45;y<h;y+=45){ctx.moveTo(x,y);ctx.lineTo(x+w,y);}if(s.pattern==='grid')for(let i=45;i<w;i+=45){ctx.moveTo(x+i,0);ctx.lineTo(x+i,h);}ctx.stroke();}
  if(s.pattern==='dots'){ctx.globalAlpha=.18;for(let i=35;i<w;i+=40)for(let j=35;j<h;j+=40){ctx.beginPath();ctx.arc(x+i,j,1.6,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
}
export function drawPaper(ctx:CanvasRenderingContext2D,doc:PageDoc,width:number){
  const fallback:PaperSurface={color:papers[doc.paper],pattern:doc.texture==='dots'?'dots':doc.texture==='lines'?'lines':'grain'};
  if(doc.cover)drawSurface(ctx,doc.surfaces?.left||fallback,0,width);
  else {drawSurface(ctx,doc.surfaces?.left||fallback,0,1000);drawSurface(ctx,doc.surfaces?.right||doc.surfaces?.left||fallback,1000,1000);}
}
export function tornPath(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
  ctx.beginPath();const steps=48;
  for(let edge=0;edge<4;edge++)for(let i=0;i<=steps;i++){const t=i/steps,j=(Math.sin(i*13.73+edge*4.32)*.5+.5)*7;let px=x,py=y;if(edge===0){px+=t*w;py+=j;}if(edge===1){px+=w-j;py+=t*h;}if(edge===2){px+=(1-t)*w;py+=h-j;}if(edge===3){px+=j;py+=(1-t)*h;}if(!edge&&!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();
}
export function drawPhoto(ctx:CanvasRenderingContext2D,e:PageElement,img:HTMLImageElement,dark=false){
  const b=photoBox(e,img.naturalWidth,img.naturalHeight),bx=Math.max(0,b.x),by=Math.max(0,b.y),bw=Math.min(e.w,b.x+b.w)-bx,bh=Math.min(e.h,b.y+b.h)-by,style=e.frameStyle||(e.frame?'polaroid':'none'),border=style==='none'?0:style==='white'?13:18,bottom=style==='polaroid'?62:border;
  if(style!=='none'){ctx.save();ctx.fillStyle='#fffcf5';ctx.shadowColor=dark?'#090f1660':'#343a3024';ctx.shadowBlur=14;ctx.shadowOffsetY=5;if(style==='torn')tornPath(ctx,bx-border,by-border,bw+border*2,bh+border+bottom);else {ctx.beginPath();ctx.rect(bx-border,by-border,bw+border*2,bh+border+bottom);}ctx.fill();ctx.restore();}
  ctx.save();if(style==='torn')tornPath(ctx,bx,by,bw,bh);else {ctx.beginPath();ctx.rect(0,0,e.w,e.h);}ctx.clip();ctx.drawImage(img,b.x,b.y,b.w,b.h);ctx.restore();
  const caption=captionText(e);if(caption){const size=e.captionSize||32;ctx.fillStyle=e.captionColor||(dark?'#eee8dc':'#4c574b');ctx.font=`${size}px "${e.captionFont||'Caveat'}"`;ctx.textAlign='left';ctx.textBaseline='top';caption.split('\n').forEach((line,n)=>ctx.fillText(line,0,by+bh+24+n*size*1.35,e.w));}
}
