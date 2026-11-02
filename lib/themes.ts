import { blankDoc, newElement, type PageDoc, type PageElement, type Asset } from './model';
import { designs, type DesignId } from './design';
type Photo=Pick<Asset,'id'|'width'|'height'>;
export function themeDocument(id:DesignId,cover=false):PageDoc {
  const d=designs.find(d=>d.id===id)!;
  const left={color:cover?d.color:id==='dark'?'#353d3c':id==='kraft'?'#dfc9a8':'#f7f2e8',pattern:cover?d.pattern:id==='gingham'?'grid':id==='linen'?'linen':'grain'} as NonNullable<PageDoc['surfaces']>['left'];
  return {...blankDoc(id==='dark'?'charcoal':id==='kraft'?'sand':'ivory',cover),autoLayout:true,designId:id,surfaces:{left,...(!cover?{right:{color:id==='collage'?'#dce4ee':id==='dark'?'#3d4441':'#faf7ef',pattern:id==='gingham'?'gingham':'grain' as const}}:{})}};
}
const decoration=(id:string,sid:string,x:number,y:number,w:number,h:number,rotation=0,opacity=1)=>newElement('sticker',{id:'theme-'+id,stickerId:sid,x,y,w,h,rotation,opacity});
function fitted(a:Photo,x:number,y:number,w:number,h:number,id:DesignId,r=0):PageElement {
  const k=Math.min(w/a.width,h/a.height),pw=a.width*k,ph=a.height*k;
  return newElement('photo',{id:'auto-photo-'+a.id,assetId:a.id,x:x+(w-pw)/2,y:y+(h-ph)/2,w:pw,h:ph,rotation:r,fit:'contain',frame:id!=='plain',frameStyle:id==='plain'?'none':id==='collage'?'polaroid':'white'});
}
function ornaments(doc:PageDoc,photos:PageElement[]){
  const id=doc.designId!;if(id==='plain')return;
  photos.slice(0,doc.cover?1:2).forEach((p,i)=>{
    const sticker=id==='linen'?'photo-corners':id==='gingham'?'tape-check':id==='kraft'?'tape-ripped':id==='dark'?'tape-blue':'tape-oat';
    if(id==='linen')doc.elements.push(decoration('corners-'+i,sticker,p.x-15,p.y-15,p.w+30,p.h+30,p.rotation));
    else doc.elements.push(decoration('tape-'+i,sticker,p.x+p.w*.32,p.y-22,Math.min(230,p.w*.46),52,p.rotation-6,.88));
  });
}
export function themedCover(assets:readonly Photo[],title:string,source:PageDoc):PageDoc {
  const id=source.designId!,doc={...themeDocument(id,true),...source,elements:[] as PageElement[],autoLayout:true};
  const list=source.coverLayout==='plain'?[]:assets.slice(0,source.coverLayout==='single'?1:3),r=id==='plain'?0:1;
  if(list.length===1)doc.elements.push(fitted(list[0],95,110,810,875,id,-r));
  else if(list.length===2)doc.elements.push(fitted(list[0],100,100,760,490,id,-r*4),fitted(list[1],180,620,720,395,id,r*3));
  else if(list.length>=3)doc.elements.push(fitted(list[0],85,95,790,475,id,-r*3),fitted(list[1],90,650,410,350,id,-r*5),fitted(list[2],520,610,385,405,id,r*4));
  if(id==='collage'&&list.length)doc.elements.unshift(decoration('cover-paper','paper-torn',65,65,860,980,-2));
  if(id==='kraft'&&!list.length)doc.elements.push(decoration('cover-label','label-index',180,430,640,300,-3));
  ornaments(doc,doc.elements.filter(e=>e.type==='photo'));
  doc.elements.push(newElement('text',{id:'auto-cover-title',text:title,x:90,y:list.length?1080:520,w:820,h:list.length?130:220,font:id==='plain'||id==='linen'?'Literata':'Caveat',size:list.length?64:72,align:'center',color:designs.find(d=>d.id===id)!.ink}));
  return doc;
}
export function themedSpread(assets:readonly Photo[],source:PageDoc,position=0):PageDoc {
  const id=source.designId!,doc={...themeDocument(id),...source,elements:[] as PageElement[],autoLayout:true};
  const slant=id==='plain'||id==='linen'?0:1;
  if(assets.length===1)doc.elements.push(fitted(assets[0],100,120,800,990,id,-slant*2));
  else if(assets.length===2)doc.elements.push(fitted(assets[0],110,155,780,900,id,-slant*3),fitted(assets[1],1110,185,780,880,id,slant*2));
  else if(assets.length===3){
    const portrait=assets.find(a=>a.height>a.width)||assets[0],rest=assets.filter(a=>a!==portrait);
    doc.elements.push(fitted(portrait,120,135,760,950,id,-slant*2),fitted(rest[0],1140,120,720,460,id,slant*3),fitted(rest[1],1110,725,755,390,id,-slant*3));
  }else assets.slice(0,4).forEach((a,i)=>{const page=i<2?0:1000,row=i%2;doc.elements.push(fitted(a,page+(row?145:110),row?730:125,row?720:760,405,id,(row?3:-3)*slant));});
  if(id==='collage'&&assets.length)doc.elements.unshift(decoration('underlay','paper-torn',1050,85,855,1050,position%2?2:-2));
  if(id==='kraft'&&assets.length)doc.elements.unshift(decoration('underlay','paper-grid',1030,85,920,1060,2,.5));
  ornaments(doc,doc.elements.filter(e=>e.type==='photo'));
  return doc;
}
export function styleTemplate(doc:PageDoc,source:PageDoc):PageDoc {
  const result={...doc,designId:source.designId,surfaces:source.surfaces,texture:source.texture,autoLayout:false};
  if(source.designId)result.elements=result.elements.map(e=>e.type==='photo'?{...e,frameStyle:e.frameStyle||(source.designId==='plain'?'none' as const:source.designId==='collage'?'polaroid' as const:'white' as const)}:e);
  return result;
}
