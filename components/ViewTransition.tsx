import React,{useLayoutEffect,useRef,useState,useEffect} from 'react';
export type ViewMorph={id:number;from:HTMLCanvasElement;to:HTMLCanvasElement;full:HTMLCanvasElement;fromBook:boolean;toBook:boolean;side:'left'|'right';split:boolean;fromW:number;fromH:number;toW:number;toH:number};
function Tile({source,half,style}:{source:HTMLCanvasElement;half?:number;style:React.CSSProperties}){
  const ref=useRef<HTMLCanvasElement>(null);useLayoutEffect(()=>{const c=ref.current!;c.width=half===undefined?source.width:source.width/2;c.height=source.height;c.getContext('2d')!.drawImage(source,half===undefined?0:half*source.width/2,0,c.width,c.height,0,0,c.width,c.height);return()=>{c.width=c.height=1;};},[source,half]);
  return <canvas ref={ref} style={style}/>;
}
export default function ViewTransition({value:v,onDone}:{value:ViewMorph;onDone:()=>void}){
  const [active,setActive]=useState(false);useLayoutEffect(()=>{const a=requestAnimationFrame(()=>setActive(true));return()=>cancelAnimationFrame(a);},[]);useEffect(()=>{const t=setTimeout(onDone,340);return()=>clearTimeout(t);},[onDone]);
  if(!v.split)return <div className="view-morph"><Tile source={v.from} style={{width:v.fromW,height:v.fromH,transform:`translate(-50%,-50%) scale(${active?.96:1})`,opacity:active?0:1}}/><Tile source={v.to} style={{width:v.toW,height:v.toH,transform:`translate(-50%,-50%) scale(${active?1:.96})`,opacity:active?1:0}}/></div>;
  const fw=v.fromBook?v.fromW/2:v.fromW,tw=v.toBook?v.toW/2:v.toW;
  return <div className="view-morph">{[0,1].map(side=>{const focus=side===(v.side==='left'?0:1),x=(book:boolean,w:number)=>book?(side===0?-w:0):focus?-w/2:side===0?-w*1.5:w/2;const startX=x(v.fromBook,fw),endX=x(v.toBook,tw),startAngle=!v.fromBook&&!focus?(side===0?78:-78):0,endAngle=!v.toBook&&!focus?(side===0?78:-78):0;return <Tile key={side} source={v.full} half={side} style={{width:tw,height:v.toH,transformOrigin:side===0?'right center':'left center',transform:active?`translate(${endX}px,${-v.toH/2}px) rotateY(${endAngle}deg)`:`translate(${startX}px,${-v.fromH/2}px) scale(${fw/tw},${v.fromH/v.toH}) rotateY(${startAngle}deg)`,opacity:active?(v.toBook||focus?1:0):(v.fromBook||focus?1:0)}}/>;})}</div>;
}
