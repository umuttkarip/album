import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDoc,newElement,applyTemplate,type Spread} from '../lib/model';
import {readingViews} from '../lib/render';
import {readingMode,requiresOpenBook,savedViewIndex,initialReadingMode,readingPreferenceKey,readerPageSize,physicalPageStacks} from '../lib/reading';
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
test('new reading preferences default to a single page and do not reuse the old desktop book key',()=>{
  for(const value of [null,undefined,'','invalid','single'])assert.equal(initialReadingMode(value),'single');
  assert.equal(initialReadingMode('book'),'book');assert.notEqual(readingPreferenceKey('sude'),'album:view:sude');
});
test('landscape fits both page modes into short phones without changing the document or preference',()=>{
  for(const frame of [{w:844,h:390},{w:667,h:267},{w:740,h:360}])for(const mode of ['single','book']as const){const size=readerPageSize(frame,mode,true),rails=frame.w>=720;assert.ok(size.w<=frame.w-(rails?248:28)+.01);assert.ok(size.h+(rails?48:66)<=frame.h+.01);assert.ok(Math.abs(size.w/size.h-(mode==='book'?1.6:.8))<.0001);}
  assert.ok(readerPageSize({w:844,h:336},'book',true).h>readerPageSize({w:844,h:336},'book').h);
});
test('paper stacks contain distinct physical faces on the correct sides of an open spread',()=>{
  const spreads=[spread('cover',-1,blankDoc('ivory',true)),spread('one',0,ordinary),spread('wide',1,panorama),spread('last',2,ordinary)];
  const current=readingViews(spreads,'book')[2],stacks=physicalPageStacks(spreads,current);
  assert.deepEqual(stacks.left.map(v=>v.label),['2','1']);assert.deepEqual(stacks.right.map(v=>v.label),['5','6']);
  assert.equal(stacks.left.concat(stacks.right).some(v=>v.spread.id==='wide'),false);
  const cover=physicalPageStacks(spreads,readingViews(spreads,'single')[0]);assert.equal(cover.left.length,0);assert.deepEqual(cover.right.map(v=>v.label),['1','2']);
  const last=physicalPageStacks(spreads,readingViews(spreads,'book').at(-1)!);assert.equal(last.right.length,0);assert.ok(last.leftDepth>cover.leftDepth);
});
