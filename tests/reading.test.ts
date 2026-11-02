import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDoc,newElement,applyTemplate,type Spread} from '../lib/model';
import {readingViews} from '../lib/render';
import {readingMode,requiresOpenBook,savedViewIndex,initialReadingMode,readingPreferenceKey,readerPageSize,orientationReadingMode,matchingViewIndex} from '../lib/reading';
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
test('landscape phone defaults to a spread while portrait and desktop keep the saved preference',()=>{
  assert.equal(orientationReadingMode('single',844,390),'book');assert.equal(orientationReadingMode('single',667,375),'book');assert.equal(orientationReadingMode('single',390,844),'single');assert.equal(orientationReadingMode('book',390,844),'book');assert.equal(orientationReadingMode('single',1528,651),'single');assert.equal(orientationReadingMode('single',1440,500),'single');
});
test('orientation remapping retains the same composition and returns to its original right page',()=>{
  const spreads=[spread('cover',-1,blankDoc('ivory',true)),spread('one',0,ordinary),spread('wide',1,panorama),spread('last',2,ordinary)],single=readingViews(spreads,'single'),book=readingViews(spreads,'book');
  const right=single.find(v=>v.key==='last:right')!,open=book[matchingViewIndex(book,right.spread.id,'right')],restored=single[matchingViewIndex(single,open.spread.id,'right')];assert.equal(open.spread.id,right.spread.id);assert.equal(restored.key,right.key);assert.equal(single[matchingViewIndex(single,'wide','right')].region,'full');
});
