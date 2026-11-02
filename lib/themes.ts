import { blankDoc, newElement, type PageDoc, type PageElement, type Asset } from './model';
import { designs, type DesignId } from './design';
type Photo=Pick<Asset,'id'|'width'|'height'>;
function legacyDocument(id:DesignId,cover=false):PageDoc {
  const d=designs.find(d=>d.id===id)!;
  const left={color:cover?d.color:id==='dark'?'#353d3c':id==='kraft'?'#dfc9a8':'#f7f2e8',pattern:cover?d.pattern:id==='gingham'?'grid':id==='linen'?'linen':'grain'} as NonNullable<PageDoc['surfaces']>['left'];
  return {...blankDoc(id==='dark'?'charcoal':id==='kraft'?'sand':'ivory',cover),autoLayout:true,designId:id,surfaces:{left,...(!cover?{right:{color:id==='collage'?'#dce4ee':id==='dark'?'#3d4441':'#faf7ef',pattern:id==='gingham'?'gingham':'grain' as const}}:{})}};
}
export function themeDocument(id:DesignId,cover=false):PageDoc {
  const doc=legacyDocument(id,cover);
  if(!cover){
    const colors:Record<DesignId,[string,string]>={plain:['#faf9f5','#faf9f5'],linen:['#f3eee3','#f3eee3'],kraft:['#e2ceb0','#f4ecdc'],gingham:['#f5f2e9','#eef0e9'],collage:['#f3eee4','#e4e8e1'],dark:['#303735','#303735']};
    doc.surfaces={left:{color:colors[id][0],pattern:id==='gingham'?'grid':id==='plain'?'plain':'grain'},right:{color:colors[id][1],pattern:id==='gingham'?'gingham':id==='plain'?'plain':'grain'}};
  }
  return {...doc,layoutVersion:2};
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
function legacyCover(assets:readonly Photo[],title:string,source:PageDoc):PageDoc {
  const id=source.designId!,doc={...legacyDocument(id,true),...source,elements:[] as PageElement[],autoLayout:true};
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
function legacySpread(assets:readonly Photo[],source:PageDoc,position=0):PageDoc {
  const id=source.designId!,doc={...legacyDocument(id),...source,elements:[] as PageElement[],autoLayout:true};
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

type Box=[number,number,number,number,number?];
const coverBoxes:Record<DesignId,Box[]>={
  plain:[[110,115,780,520],[110,690,365,320],[525,690,365,320]],
  linen:[[155,130,690,530],[155,730,320,280],[525,730,320,280]],
  kraft:[[120,135,470,800,-2],[620,170,260,360,3],[590,680,285,290,-3]],
  gingham:[[110,130,365,400],[525,130,365,400],[160,640,680,365]],
  collage:[[110,110,510,830,-4],[600,155,280,375,5],[490,690,370,315,-3]],
  dark:[[85,95,830,580],[85,725,395,290],[520,725,395,290]],
};
const spreadBoxes:Record<DesignId,Box[]>={
  plain:[[85,105,830,500],[85,685,830,460],[1085,105,830,500],[1085,685,830,460]],
  linen:[[145,160,710,420],[170,730,660,355],[1145,210,710,420],[1170,785,660,305]],
  kraft:[[125,170,745,440,-1.5],[180,755,680,330,2],[1160,115,690,420,2],[1125,720,750,405,-1.5]],
  gingham:[[150,170,700,395],[150,690,700,395],[1150,170,700,395],[1150,690,700,395]],
  collage:[[115,120,760,520,-3],[180,740,650,350,3],[1180,180,640,390,3],[1110,700,780,420,-2]],
  dark:[[75,100,850,510],[170,735,660,365],[1075,220,850,510],[1170,850,660,270]],
};
function accents(doc:PageDoc,photos:PageElement[]){
  const id=doc.designId!;
  if(id==='plain'||id==='dark'||id==='gingham')return;
  photos.slice(0,id==='collage'?2:1).forEach((p,i)=>{
    if(id==='linen')doc.elements.push(decoration('corners-'+i,'photo-corners',p.x-14,p.y-14,p.w+28,p.h+28,p.rotation,.82));
    else {const angle=p.rotation*Math.PI/180,dx=p.w*.32,dy=-20;doc.elements.push(decoration('tape-'+i,id==='kraft'?'tape-ripped':'tape-oat',p.x+dx*Math.cos(angle)-dy*Math.sin(angle),p.y+dx*Math.sin(angle)+dy*Math.cos(angle),Math.min(205,p.w*.42),44,p.rotation-4,.78));}
  });
}
export function themedCover(assets:readonly Photo[],title:string,source:PageDoc):PageDoc {
  if(source.layoutVersion!==2)return legacyCover(assets,title,source);
  const id=source.designId!,doc={...themeDocument(id,true),...source,elements:[] as PageElement[],autoLayout:true};
  const list=source.coverLayout==='plain'?[]:assets.slice(0,source.coverLayout==='single'?1:3);
  let boxes=coverBoxes[id];
  if(list.length===1)boxes=[[id==='linen'?160:110,130,id==='linen'?680:780,850,id==='collage'?-3:0]];
  if(list.length===2)boxes=id==='collage'||id==='kraft'?[[125,135,530,800,-3],[520,430,350,510,4]]:[[120,140,760,400],[190,650,620,360]];
  if(id==='collage'&&list.length)doc.elements.push(decoration('cover-paper','paper-torn',75,95,820,925,-2));
  if(id==='kraft'&&!list.length)doc.elements.push(decoration('cover-label','label-index',165,455,670,265,-1));
  list.forEach((a,i)=>doc.elements.push(fitted(a,...boxes[i].slice(0,4) as [number,number,number,number],id,boxes[i][4]||0)));
  accents(doc,doc.elements.filter(e=>e.type==='photo'));
  const literary=id==='linen'||id==='plain'||id==='kraft';
  doc.elements.push(newElement('text',{id:'auto-cover-title',text:title,x:105,y:list.length?1080:520,w:790,h:list.length?135:230,font:literary?'Literata':'Commissioner',fontStyle:id==='linen'?'italic':'normal',size:title.length>35?42:list.length?64:74,align:'center',color:designs.find(d=>d.id===id)!.ink}));
  return doc;
}
export function themedSpread(assets:readonly Photo[],source:PageDoc,position=0):PageDoc {
  if(source.layoutVersion!==2)return legacySpread(assets,source,position);
  const id=source.designId!,doc={...themeDocument(id),...source,elements:[] as PageElement[],autoLayout:true};
  const list=assets.slice(0,4);
  let boxes=spreadBoxes[id];
  if(list.length===1)boxes=[[id==='linen'?150:100,id==='gingham'?210:125,id==='linen'?700:800,id==='gingham'?830:1000,id==='collage'?-2:0]];
  if(list.length===2){
    const margin=id==='linen'?155:id==='gingham'?165:95,slant=id==='collage'?2.5:id==='kraft'?1.5:0;
    boxes=[[margin,id==='dark'?100:160,1000-margin*2,id==='dark'?1050:930,-slant],[1000+margin,id==='kraft'?245:id==='dark'?245:160,1000-margin*2,id==='kraft'?795:id==='dark'?780:930,slant]];
  }
  if(list.length===3){
    const inset=id==='linen'?160:id==='gingham'?150:100;
    boxes=[[inset,id==='dark'?80:150,1000-inset*2,id==='dark'?1090:950,id==='collage'?-2.5:0],[1000+inset,id==='kraft'?185:120,1000-inset*2,id==='collage'?520:450,id==='collage'?3:id==='kraft'?1.5:0],[1000+inset+(id==='collage'?80:0),id==='collage'?775:710,1000-inset*2-(id==='collage'?100:0),id==='collage'?320:420,id==='collage'?-3:0]];
  }
  if(id==='collage'&&list.length)doc.elements.push(decoration('underlay','paper-torn',1070,95,820,1040,position%2?1.5:-1.5));
  if(id==='kraft'&&list.length)doc.elements.push(decoration('underlay','paper-grid',1080,85,810,1060,1,.32));
  list.forEach((a,i)=>doc.elements.push(fitted(a,...boxes[i].slice(0,4) as [number,number,number,number],id,boxes[i][4]||0)));
  accents(doc,doc.elements.filter(e=>e.type==='photo'));
  return doc;
}
export function styleTemplate(doc:PageDoc,source:PageDoc):PageDoc {
  const result={...doc,designId:source.designId,surfaces:source.surfaces,texture:source.texture,autoLayout:false};
  if(source.designId)result.elements=result.elements.map(e=>e.type==='photo'?{...e,frameStyle:e.frameStyle||(source.designId==='plain'?'none' as const:source.designId==='collage'?'polaroid' as const:'white' as const)}:e);
  return result;
}
