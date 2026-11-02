import test from 'node:test';
import assert from 'node:assert/strict';
import { automaticCover, resolveSpreads, isAutomatic, photoPlacement } from '../lib/composition';
import { blankDoc, newElement, validDoc, type Asset, type Spread } from '../lib/model';
const assets=(n:number):Asset[]=>Array.from({length:n},(_,i)=>({id:'p'+i,album_id:'a',kind:'photo',filename:'photo.jpg',mime:'image/jpeg',width:1200,height:900,created_by:'umut',ready:1}));
const spread=(id:string,position:number,doc=blankDoc()):Spread=>({id,album_id:'a',position,doc,revision:0});
test('automatic cover uses 0/1/3 photographs without inventing copy',()=>{
  for(const n of [0,1,3]){const d=automaticCover(assets(n),'Ada');assert.equal(d.elements.filter(e=>e.type==='photo').length,n);assert.deepEqual(d.elements.filter(e=>e.type==='text').map(e=>e.text),['Ada']);assert.ok(validDoc(d));}
});
test('legacy empty pages show the uploaded photos; manual pages and covers are preserved',()=>{
  const custom={...blankDoc(),autoLayout:false,elements:[newElement('text',{text:'Kendi yazım',font:'Caveat',size:42})]};
  const customCover={...custom,cover:true};const source=[spread('c',-1,customCover),spread('one',0),spread('two',1,custom)];
  const result=resolveSpreads(source,assets(3),'Ada');assert.equal(result[0],source[0]);assert.equal(result[2],source[2]);assert.equal(result[1].doc.elements.filter(e=>e.type==='photo').length,3);assert.deepEqual(source[1].doc.elements,[]);assert.ok(validDoc(result[1].doc));
});
test('automatic spreads place eight photos once and leave a deliberately cleared page empty',()=>{
  const empty={...blankDoc(),autoLayout:false};const source=[spread('c',-1,{...blankDoc('sage',true),autoLayout:true}),spread('one',0),spread('two',1),spread('three',2,empty)];
  const result=resolveSpreads(source,assets(8),'Ada'),ids=result.filter(s=>s.position>=0).flatMap(s=>s.doc.elements.filter(e=>e.type==='photo').map(e=>e.assetId));assert.equal(new Set(ids).size,8);assert.equal(ids.length,8);assert.equal(result[3],source[3]);
});
test('custom font and paper metadata round-trips and rejects invalid values',()=>{
  const doc={...blankDoc('lilac'),texture:'dots' as const,autoLayout:false,elements:[newElement('text',{text:'şğİı',font:'DM Serif Display',fontStyle:'italic',fontWeight:400,size:64}),newElement('photo',{assetId:'p',caption:'Tarih',captionFont:'Caveat',captionColor:'#58604e',captionSize:40})]};assert.ok(validDoc(JSON.parse(JSON.stringify(doc))));assert.equal(validDoc({...doc,texture:'wrong'}),false);assert.equal(validDoc({...doc,elements:[{...doc.elements[0],font:'unknown'}]}),false);assert.equal(isAutomatic({...blankDoc(),autoLayout:false}),false);
});
test('adding another photo chooses the free side without moving existing elements',()=>{const doc={...blankDoc(),autoLayout:false,elements:[newElement('photo',{assetId:'one',x:110,y:150,w:780,h:930})]};const pos=photoPlacement(doc,assets(1)[0]);assert.ok(pos.x>=1000);assert.equal(doc.elements[0].x,110);});
