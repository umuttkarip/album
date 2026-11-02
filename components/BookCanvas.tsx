'use client';
import React, { useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type Turn = { id:number; from:HTMLCanvasElement; to:HTMLCanvasElement; direction:1|-1; sourceCover:boolean; targetCover:boolean; start:number; duration:number; fromP:number; toP:number; dragging?:boolean; progress?:number };
const H=1.25;
function texture(source:HTMLCanvasElement,part:'left'|'right'|'full'='full') {
  const c=document.createElement('canvas');const half=part!=='full'&&source.width/source.height>1;c.width=half?source.width/2:source.width;c.height=source.height;
  const ctx=c.getContext('2d')!,r=Math.min(c.width,c.height)*.024;ctx.beginPath();ctx.roundRect(0,0,c.width,c.height,half?(part==='left'?[r,0,0,r]:[0,r,r,0]):r);ctx.clip();ctx.drawImage(source,half&&part==='right'?c.width:0,0,c.width,c.height,0,0,c.width,c.height);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=2;t.generateMipmaps=true;return t;
}
const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment=`uniform sampler2D frontMap; uniform sampler2D backMap; uniform float progress; varying vec2 vUv;
 void main(){vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.0-uv.x;vec4 ink=gl_FrontFacing?texture2D(frontMap,uv):texture2D(backMap,uv);if(ink.a<.01)discard;float shade=1.0-sin(progress*3.14159265)*(.055+.12*pow(1.0-vUv.x,2.0));gl_FragColor=vec4(ink.rgb*shade,ink.a);
 #include <colorspace_fragment>
 }`;
function Sheet({map,x,z=0,width=1,opacity=1}:{map:THREE.Texture;x:number;z?:number;width?:number;opacity?:number}) {return <mesh position={[x,0,z]}><planeGeometry args={[width,H]}/><meshBasicMaterial map={map} toneMapped={false} transparent alphaTest={.01} opacity={opacity}/></mesh>;}
function Fold({spanning}:{spanning:boolean}){return <mesh position={[0,0,.003]}><planeGeometry args={[.075,H]}/><shaderMaterial transparent depthWrite={false} vertexShader={vertex} uniforms={{strength:{value:spanning?.065:.14}}} fragmentShader={`uniform float strength; varying vec2 vUv; void main(){float edge=1.0-abs(vUv.x-.5)*2.0;gl_FragColor=vec4(.29,.28,.23,pow(edge,2.0)*strength);}`}/></mesh>;}
function Scene({canvas,book,cover,turn,onDone,onLost,spanning}:{canvas:HTMLCanvasElement;book:boolean;cover:boolean;turn:Turn|null;onDone:(cancelled:boolean)=>void;onLost:()=>void;spanning:boolean}) {
  const {camera,size,invalidate,gl}=useThree();
  const turning=useRef<THREE.Mesh>(null),shadow=useRef<THREE.Mesh>(null),leftUnder=useRef<THREE.Mesh>(null),done=useRef(-1);
  const maps=useMemo(()=>{
    const source=turn?.from||canvas,target=turn?.to||canvas;
    return {cl:texture(source,book&&!cover?'left':'full'),cr:texture(source,book&&!cover?'right':'full'),nl:texture(target,book&&!turn?.targetCover?'left':'full'),nr:texture(target,book&&!turn?.targetCover?'right':'full')};
  },[canvas,turn?.from,turn?.to,book,cover,turn?.targetCover]);
  useEffect(()=>()=>{Object.values(maps).forEach(t=>{t.dispose();const c=t.image as HTMLCanvasElement;c.width=c.height=1;});},[maps]);
  const geom=useMemo(()=>{
    const g=new THREE.PlaneGeometry(1,H,40,10);g.translate(.5,0,0);const a=g.attributes.position.array as Float32Array;const uv=g.attributes.uv.array as Float32Array;
    if(turn?.direction===-1){for(let i=0;i<a.length;i+=3)a[i]*=-1;for(let i=0;i<uv.length;i+=2)uv[i]=1-uv[i];const indices=g.index!.array;for(let i=0;i<indices.length;i+=3){const b=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=b;}}
    return g;
  },[turn?.direction]);
  const original=useMemo(()=>new Float32Array(geom.attributes.position.array),[geom]);
  useEffect(()=>()=>geom.dispose(),[geom]);
  const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{frontMap:{value:turn?.direction===-1?maps.cl:maps.cr},backMap:{value:turn?.direction===-1?maps.nr:maps.nl},progress:{value:0}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,transparent:true,toneMapped:false}),[maps,turn?.direction]);
  useEffect(()=>()=>material.dispose(),[material]);
  useEffect(()=>{const lost=(e:Event)=>{e.preventDefault();onLost();};gl.domElement.addEventListener('webglcontextlost',lost);return()=>gl.domElement.removeEventListener('webglcontextlost',lost);},[gl,onLost]);
  useEffect(()=>{invalidate();},[turn,size,invalidate]);
  useEffect(()=>{done.current=-1;},[turn?.start]);
  useFrame(()=>{
    gl.domElement.dataset.albumTextures=String(gl.info.memory.textures); gl.domElement.dataset.albumGeometries=String(gl.info.memory.geometries); let p=0;
    if(turn){if(turn.dragging)p=turn.progress||0;else{const t=Math.min(1,Math.max(0,(performance.now()-turn.start)/turn.duration));p=turn.fromP+(turn.toP-turn.fromP)*(1-Math.pow(1-t,3));if(t>=1&&done.current!==turn.id){done.current=turn.id;queueMicrotask(()=>onDone(turn.toP===0));}else if(t<1)invalidate();}}
    const cam=camera as THREE.OrthographicCamera,w=book?2:1;cam.left=-w/2;cam.right=w/2;cam.top=H/2;cam.bottom=-H/2;cam.position.x=book?(turn?(turn.sourceCover?.5*(1-p):turn.targetCover?.5*p:0):cover?.5:0):0;cam.updateProjectionMatrix();
    if(turning.current&&turn){
      const dir=turn.direction,curvature=(turn.sourceCover||turn.targetCover)?0:Math.sin(p*Math.PI)*1.1,a=geom.attributes.position.array as Float32Array;
      for(let i=0;i<a.length;i+=3){const x=Math.abs(original[i]),arc=curvature*x;a[i]=dir*(curvature>.0001?Math.sin(arc)/curvature:x);a[i+1]=original[i+1];a[i+2]=curvature>.0001?(1-Math.cos(arc))/curvature:0;}
      geom.attributes.position.needsUpdate=true;geom.computeVertexNormals();turning.current.rotation.y=-dir*Math.PI*p;material.uniforms.progress.value=p;
      if(shadow.current)(shadow.current.material as THREE.MeshBasicMaterial).opacity=Math.sin(Math.PI*p)*.18;
    }
  });
  const backingColor='#e9e4d7',baseX=book?(cover?.5:0):0,baseW=book&&!cover?2:1;
  if(!turn)return <>
    {book&&!cover?<><Sheet map={maps.cl} x={-.5}/><Sheet map={maps.cr} x={.5}/><Fold spanning={spanning}/></>:<Sheet map={maps.cr} x={baseX}/>}
  </>;
  return <>
    {book?<>
      <Sheet map={turn.direction===1?maps.cl:maps.nl} x={-.5} opacity={turn.sourceCover||turn.targetCover?0:1}/>
      <Sheet map={turn.direction===1?maps.nr:maps.cr} x={.5}/>
    </>:<Sheet map={maps.nr} x={0}/>}
    <mesh ref={shadow} position={[book?turn.direction*.5:0,0,.006]}><planeGeometry args={[1,H]}/><meshBasicMaterial color="#18251d" transparent opacity={0}/></mesh>
    <mesh ref={turning} geometry={geom} material={material} position={[book?0:turn.direction===1?-.5:.5,0,.012]}/>
  </>;
}
class Boundary extends React.Component<{children:React.ReactNode;fallback:React.ReactNode;onError:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onError();}render(){return this.state.failed?this.props.fallback:this.props.children;}}
export default function BookCanvas(props:{canvas:HTMLCanvasElement;book:boolean;cover:boolean;turn:Turn|null;onDone:(cancelled:boolean)=>void;onLost:()=>void;spanning:boolean}) {
  return <Boundary fallback={<img className="flat-page" src={props.canvas.toDataURL('image/webp',.92)} alt="Albüm sayfası"/>} onError={props.onLost}><Canvas orthographic camera={{position:[0,0,8],near:.01,far:30,manual:true,left:-1,right:1,top:H/2,bottom:-H/2}} frameloop="demand" dpr={[1,1.5]} gl={{alpha:true,antialias:true,powerPreference:'low-power'}}><Scene {...props}/></Canvas></Boundary>;
}
