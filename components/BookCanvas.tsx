'use client';
import React, { useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {turnMetrics} from '../lib/turn-metrics';
import {BOOK_HEIGHT,BOOK_BLEED,paperRect,bindingRects,edgeInk,coverOpenness,type BoundBook,type PaperRect} from '../lib/book-stack';

export type Turn = { id:number; from:HTMLCanvasElement; to:HTMLCanvasElement; direction:1|-1; sourceCover:boolean; targetCover:boolean; fromCursor:number; toCursor:number; start:number; duration:number; fromP:number; toP:number; dragging?:boolean; progress?:number };
type BookProps={canvas:HTMLCanvasElement;book:boolean;cover:boolean;binding:BoundBook;cursor:number;turn:Turn|null;onDone:(cancelled:boolean)=>void;onLost:()=>void;spanning:boolean;fallback:React.ReactNode};
const H=BOOK_HEIGHT;
function texture(source:HTMLCanvasElement,part:'left'|'right'|'full'='full') {
  const c=document.createElement('canvas');const half=part!=='full'&&source.width/source.height>1;c.width=half?source.width/2:source.width;c.height=source.height;
  const ctx=c.getContext('2d')!,r=Math.min(c.width,c.height)*.012;ctx.beginPath();ctx.roundRect(0,0,c.width,c.height,half?(part==='left'?[r,0,0,r]:[0,r,r,0]):r);ctx.clip();ctx.drawImage(source,half&&part==='right'?c.width:0,0,c.width,c.height,0,0,c.width,c.height);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;return t;
}
class TexturePool{
  private pages=new Map<HTMLCanvasElement,Map<string,THREE.CanvasTexture>>();builds=0;
  get(source:HTMLCanvasElement,part:'left'|'right'|'full'){
    if(source.width<=source.height)part='full';let page=this.pages.get(source);if(page)this.pages.delete(source);else page=new Map();this.pages.set(source,page);
    let map=page.get(part);if(!map){map=texture(source,part);page.set(part,map);this.builds++;}
    while(this.pages.size>4){const oldest=this.pages.keys().next().value!;this.release(this.pages.get(oldest)!);this.pages.delete(oldest);}return map;
  }
  private release(page:Map<string,THREE.CanvasTexture>){for(const map of page.values()){map.dispose();const canvas=map.image as HTMLCanvasElement;canvas.width=canvas.height=1;}}
  clear(){for(const page of this.pages.values())this.release(page);this.pages.clear();}
}
const vertex=`varying vec2 vUv; varying float worldX; void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);worldX=world.x;gl_Position=projectionMatrix*viewMatrix*world;}`;
const fragment=`uniform sampler2D frontMap; uniform sampler2D backMap; uniform float progress; uniform float singleView; varying vec2 vUv; varying float worldX;
 void main(){if(singleView>.5&&abs(worldX)>.5)discard;vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.0-uv.x;vec4 ink=gl_FrontFacing?texture2D(frontMap,uv):texture2D(backMap,uv);if(ink.a<.01)discard;float shade=1.0-sin(progress*3.14159265)*(.055+.12*pow(1.0-vUv.x,2.0));gl_FragColor=vec4(ink.rgb*shade,ink.a);
 #include <colorspace_fragment>
 }`;
function Sheet({map,x,z=0,width=1,opacity=1}:{map:THREE.Texture;x:number;z?:number;width?:number;opacity?:number}) {return <mesh position={[x,0,z]}><planeGeometry args={[width,H]}/><meshBasicMaterial map={map} toneMapped={false} transparent alphaTest={.01} opacity={opacity}/></mesh>;}
function paperGeometry(){
  const s=new THREE.Shape(),r=.012;
  s.moveTo(-.5+r,-.5);s.lineTo(.5-r,-.5);s.quadraticCurveTo(.5,-.5,.5,-.5+r);s.lineTo(.5,.5-r);s.quadraticCurveTo(.5,.5,.5-r,.5);s.lineTo(-.5+r,.5);s.quadraticCurveTo(-.5,.5,-.5,.5-r);s.lineTo(-.5,-.5+r);s.quadraticCurveTo(-.5,-.5,-.5+r,-.5);
  return new THREE.ShapeGeometry(s,4);
}
function deskShadow(){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;
  ctx.filter='blur(3px)';ctx.fillStyle='rgba(2,6,15,.42)';ctx.beginPath();ctx.roundRect(4,4,120,120,5);ctx.fill();
  const map=new THREE.CanvasTexture(c);map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;return map;
}
function turnShadow(){
  const c=document.createElement('canvas');c.width=64;c.height=4;const ctx=c.getContext('2d')!,g=ctx.createLinearGradient(0,0,64,0);
  g.addColorStop(0,'rgba(10,15,18,0)');g.addColorStop(.5,'rgba(10,15,18,.75)');g.addColorStop(1,'rgba(10,15,18,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,4);
  const map=new THREE.CanvasTexture(c);map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;return map;
}
type BindingFrame={cursor:number;unit:number;openness:number};
function BindingLayers({model,pose}:{model:BoundBook;pose:React.RefObject<BindingFrame>}){
  const sheets=useRef<THREE.InstancedMesh>(null),left=useRef<THREE.Mesh>(null),right=useRef<THREE.Mesh>(null),shadow=useRef<THREE.Mesh>(null);
  const geometry=useMemo(paperGeometry,[]),shade=useMemo(deskShadow,[]),matrix=useMemo(()=>new THREE.Matrix4(),[]),position=useMemo(()=>new THREE.Vector3(),[]),scale=useMemo(()=>new THREE.Vector3(),[]),rotation=useMemo(()=>new THREE.Quaternion(),[]);
  const paperMaterial=useMemo(()=>new THREE.MeshBasicMaterial({toneMapped:false}),[]),shadowMaterial=useMemo(()=>new THREE.MeshBasicMaterial({map:shade,transparent:true,depthWrite:false,toneMapped:false}),[shade]);
  const boardMaterial=useMemo(()=>new THREE.MeshBasicMaterial({color:edgeInk(model.cloth,1),toneMapped:false}),[model.cloth]);
  const colors=useMemo(()=>model.leaves.map(l=>({front:new THREE.Color(edgeInk(l.front,l.index)),back:new THREE.Color(edgeInk(l.back,l.index))})),[model]);
  useEffect(()=>()=>{geometry.dispose();shade.dispose();(shade.image as HTMLCanvasElement).width=1;},[geometry,shade]);
  useEffect(()=>()=>{paperMaterial.dispose();shadowMaterial.dispose();},[paperMaterial,shadowMaterial]);
  useEffect(()=>()=>boardMaterial.dispose(),[boardMaterial]);
  useLayoutEffect(()=>{const mesh=sheets.current!;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);return()=>{mesh.dispose();};},[model.book,model.leaves.length]);
  function setRect(mesh:THREE.Mesh,r:PaperRect){mesh.position.set(r.x+r.w/2,-r.y-r.h/2,r.z);mesh.scale.set(r.w,r.h,1);}
  useFrame(()=>{
    const {cursor,unit,openness}=pose.current,mesh=sheets.current!;
    for(let i=0;i<model.leaves.length;i++){
      const r=paperRect(model,model.leaves[i],cursor,unit);
      if(r){position.set(r.x+r.w/2,-r.y-r.h/2,r.z);scale.set(r.w,r.h,1);matrix.compose(position,rotation,scale);mesh.setColorAt(i,r.side==='left'?colors[i].back:colors[i].front);}
      else matrix.makeScale(0,0,0);
      mesh.setMatrixAt(i,matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    left.current!.visible=false;
    for(const r of bindingRects(model,cursor,unit,openness)){const board=r.side==='left'?left.current!:right.current!;board.visible=true;setRect(board,r);}
    const span=model.book?1+openness:1;
    shadow.current!.position.set(model.book?(1-openness)/2:0,-unit*7,-.2);shadow.current!.scale.set(span+unit*28,H+unit*36,1);
  },-1);
  return <>
    <mesh ref={shadow} material={shadowMaterial}><planeGeometry args={[1,1]}/></mesh>
    <mesh ref={left} geometry={geometry} material={boardMaterial} dispose={null}/>
    <mesh ref={right} geometry={geometry} material={boardMaterial} dispose={null}/>
    <instancedMesh key={(model.book?'book':'single')+model.leaves.length} ref={sheets} args={[geometry,paperMaterial,model.leaves.length]} frustumCulled={false} dispose={null}/>
  </>;
}
function Scene({canvas,book,cover,binding,cursor,turn,onDone,onLost,spanning}:BookProps) {
  const {camera,size,invalidate,gl}=useThree();
  const turning=useRef<THREE.Mesh>(null),shadow=useRef<THREE.Mesh>(null),done=useRef(-1),frames=useRef(0);
  const bindingPose=useRef<BindingFrame>({cursor,unit:H/Math.max(1,size.height-BOOK_BLEED*2),openness:cover?0:1});
  const contactMap=useMemo(turnShadow,[]);
  useEffect(()=>()=>{contactMap.dispose();(contactMap.image as HTMLCanvasElement).width=1;},[contactMap]);
  const measure=useMemo(turnMetrics,[]);
  const pool=useMemo(()=>new TexturePool(),[]);
  const clock=useRef({start:-1,at:0});
  const maps=useMemo(()=>{
    const source=turn?.from||canvas,target=turn?.to||canvas;
    return {cl:pool.get(source,book&&!cover?'left':'full'),cr:pool.get(source,book&&!cover?'right':'full'),nl:pool.get(target,book&&!turn?.targetCover?'left':'full'),nr:pool.get(target,book&&!turn?.targetCover?'right':'full')};
  },[canvas,turn?.from,turn?.to,book,cover,turn?.targetCover]);
  useEffect(()=>()=>pool.clear(),[pool]);
  const pageGeometries=useMemo(()=>([1,-1] as const).map(direction=>{
    const g=new THREE.PlaneGeometry(1,H,40,1);g.translate(.5,0,0);const a=g.attributes.position.array as Float32Array;const uv=g.attributes.uv.array as Float32Array;
    if(direction===-1){for(let i=0;i<a.length;i+=3)a[i]*=-1;for(let i=0;i<uv.length;i+=2)uv[i]=1-uv[i];const indices=g.index!.array;for(let i=0;i<indices.length;i+=3){const b=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=b;}}
    return {geometry:g,original:new Float32Array(g.attributes.position.array)};
  }),[]);
  const {geometry:geom,original}=pageGeometries[turn?.direction===-1?1:0];
  useEffect(()=>()=>pageGeometries.forEach(p=>p.geometry.dispose()),[pageGeometries]);
  const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{frontMap:{value:maps.cr},backMap:{value:maps.nl},progress:{value:0},singleView:{value:book?0:1}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,transparent:true,toneMapped:false}),[]);
  useLayoutEffect(()=>{material.uniforms.frontMap.value=turn?.direction===-1?maps.cl:maps.cr;material.uniforms.backMap.value=turn?.direction===-1?maps.nr:maps.nl;material.uniforms.singleView.value=book?0:1;},[maps,turn?.direction,book,material]);
  useEffect(()=>()=>material.dispose(),[material]);
  useEffect(()=>{const lost=(e:Event)=>{e.preventDefault();onLost();};gl.domElement.addEventListener('webglcontextlost',lost);return()=>gl.domElement.removeEventListener('webglcontextlost',lost);},[gl,onLost]);
  useEffect(()=>{invalidate();},[canvas,book,cover,binding,cursor,spanning,turn,size,invalidate]);
  useEffect(()=>{done.current=-1;},[turn?.start]);
  useFrame(()=>{
    measure(gl.domElement,turn,geom.attributes.position.count,gl.info.memory.textures);
    gl.domElement.dataset.albumTextureBuilds=String(pool.builds);
    if(location.hostname==='127.0.0.1'){gl.domElement.dataset.albumPrograms=String(gl.info.programs?.length||0);gl.domElement.dataset.albumDrawCalls=String(gl.info.render.calls);}
    gl.domElement.dataset.albumTextures=String(gl.info.memory.textures); gl.domElement.dataset.albumGeometries=String(gl.info.memory.geometries); let p=0;
    if(turn){if(turn.dragging)p=turn.progress||0;else{const now=performance.now();if(clock.current.start!==turn.start)clock.current={start:turn.start,at:now};const t=Math.min(1,Math.max(0,(now-clock.current.at)/turn.duration)),ease=turn.fromP===0&&turn.toP===1?t*t*(3-2*t):1-Math.pow(1-t,3);p=turn.fromP+(turn.toP-turn.fromP)*ease;if(t>=1&&done.current!==turn.id){done.current=turn.id;queueMicrotask(()=>onDone(turn.toP===0));}else if(t<1)invalidate();}}
    const unit=H/Math.max(1,size.height-BOOK_BLEED*2),bleed=BOOK_BLEED*unit;
    const openness=turn?coverOpenness(turn.sourceCover,turn.targetCover,p):cover?0:1;
    bindingPose.current.cursor=turn?turn.fromCursor+(turn.toCursor-turn.fromCursor)*p:cursor;
    bindingPose.current.unit=unit;bindingPose.current.openness=openness;
    gl.domElement.dataset.albumStackCursor=bindingPose.current.cursor.toFixed(5);gl.domElement.dataset.albumSceneFrames=String(++frames.current);gl.domElement.dataset.albumStackSheets=String(binding.leaves.length);gl.domElement.dataset.albumTurnProgress=p.toFixed(5);
    const cam=camera as THREE.OrthographicCamera,w=book?2:1;cam.left=-w/2-bleed;cam.right=w/2+bleed;cam.top=H/2+bleed;cam.bottom=-H/2-bleed;cam.position.x=book?(1-openness)/2:0;cam.updateProjectionMatrix();
    if(turning.current&&turn){
      const dir=turn.direction,curvature=(turn.sourceCover||turn.targetCover)?0:Math.sin(p*Math.PI)*1.1,a=geom.attributes.position.array as Float32Array;
      for(let i=0;i<a.length;i+=3){const x=Math.abs(original[i]),arc=curvature*x;a[i]=dir*(curvature>.0001?Math.sin(arc)/curvature:x);a[i+1]=original[i+1];a[i+2]=curvature>.0001?(1-Math.cos(arc))/curvature:0;}
      geom.attributes.position.needsUpdate=true;turning.current.rotation.y=-dir*Math.PI*p;material.uniforms.progress.value=p;
      if(shadow.current){const x=curvature>.0001?Math.sin(curvature)/curvature:1,z=curvature>.0001?(1-Math.cos(curvature))/curvature:0,pivot=book?0:dir===1?-.5:.5,edge=pivot+dir*(x*Math.cos(Math.PI*p)-z*Math.sin(Math.PI*p));shadow.current.position.x=book?edge:Math.max(-.45,Math.min(.45,edge));shadow.current.scale.x=.10+Math.sin(Math.PI*p)*.08;(shadow.current.material as THREE.MeshBasicMaterial).opacity=Math.sin(Math.PI*p)*.19;}
    }
  },-2);
  const baseX=book?(cover?.5:0):0;
  if(!turn)return <>
    <BindingLayers model={binding} pose={bindingPose}/>
    {book&&!cover?<><Sheet map={maps.cl} x={-.5}/><Sheet map={maps.cr} x={.5}/></>:<Sheet map={maps.cr} x={baseX}/>}
  </>;
  return <>
    <BindingLayers model={binding} pose={bindingPose}/>
    {book?<>
      <Sheet map={turn.direction===1?maps.cl:maps.nl} x={-.5} opacity={turn.sourceCover||turn.targetCover?0:1}/>
      <Sheet map={turn.direction===1?maps.nr:maps.cr} x={.5}/>
    </>:<Sheet map={maps.nr} x={0}/>}
    <mesh ref={shadow} position={[0,0,.006]}><planeGeometry args={[1,H]}/><meshBasicMaterial map={contactMap} transparent depthWrite={false} toneMapped={false} opacity={0}/></mesh>
    <mesh ref={turning} geometry={geom} material={material} dispose={null} frustumCulled={false} position={[book?0:turn.direction===1?-.5:.5,0,.012]}/>
  </>;
}
class Boundary extends React.Component<{children:React.ReactNode;fallback:React.ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function BookCanvas(props:BookProps) {
  return <Boundary fallback={props.fallback} onError={props.onLost}><Canvas className="book-scene" style={{position:'absolute',inset:-BOOK_BLEED,width:`calc(100% + ${BOOK_BLEED*2}px)`,height:`calc(100% + ${BOOK_BLEED*2}px)`,pointerEvents:'none'}} orthographic camera={{position:[0,0,8],near:.01,far:30,manual:true,left:-1,right:1,top:H/2,bottom:-H/2}} frameloop="demand" dpr={[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'low-power'}}><Scene {...props}/></Canvas></Boundary>;
}
