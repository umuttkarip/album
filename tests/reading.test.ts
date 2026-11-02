import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDoc,newElement,applyTemplate,type Spread} from '../lib/model';
import {readingViews} from '../lib/render';
import {readingMode,requiresOpenBook,savedViewIndex} from '../lib/reading';
const spread=(id:string,position:number,doc=blankDoc()):Spread=>({id,album_id:'a',position,revision:0,doc});
const ordinary={...blankDoc(),elements:[newElement('photo',{assetId:'a',x:110,y:120,w:780,h:1000})]};
const panorama=applyTemplate('panorama',[{id:'wide',width:1800,height:1000}]);
test('a spanning landscape opens the book and restores the preferred mode before and after it',()=>{
  const pages=[spread('one',0,ordinary),spread('wide',1,panorama),spread('last',2,ordinary)];
  for(const preference of ['single','book'] as const){const views=readingViews(pages,preference),modes=views.map(v=>readingMode(v,preference));assert.ok(views.filter(v=>v.spread.id==='wide').every(v=>readingMode(v,preference)==='book'));assert.equal(modes[0],preference);assert.equal(modes.at(-1),preference);assert.equal(views.filter(v=>v.spread.id==='wide').length,1);}
});
test('navigating backwards, jumping to a panorama and reopening it use the same automatic policy',()=>{
  const views=readingViews([spread('first',0,ordinary),spread('wide',1,panorama),spread('last',2,ordinary)],'single');
  assert.deepEqual([...views].reverse().map(v=>readingMode(v,'single')),['single','single','book','single','single']);const n=savedViewIndex(views,{id:'wide',key:'wide'});assert.equal(readingMode(views[n],'single'),'book');
});
test('a saved right page wins over the spread fallback; cover and ordinary photos do not force the book',()=>{
  const views=readingViews([spread('cover',-1,blankDoc('ivory',true)),spread('one',0,ordinary)],'single');assert.equal(views[savedViewIndex(views,{id:'one',key:'one:right'})].region,'right');assert.equal(requiresOpenBook(ordinary),false);assert.equal(requiresOpenBook(blankDoc('ivory',true)),false);assert.equal(requiresOpenBook({...blankDoc(),elements:[newElement('text',{text:'Başlık',size:50,x:900,w:300,h:100})]}),false);
});
