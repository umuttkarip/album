import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDoc,type Spread} from '../lib/model';
import {readingViews} from '../lib/render';
import {boundBook,boundCursor,paperRect,bindingRects,paperPitch,coverOpenness,BOOK_HEIGHT,BOOK_BLEED} from '../lib/book-stack';
const spread=(id:string,position:number,cover=false):Spread=>({id,album_id:'a',position,revision:0,doc:{...blankDoc('ivory',cover),surfaces:{left:{color:cover?'#aebca7':'#e0e5d7',pattern:'grain'},right:{color:'#343e39',pattern:'grain'}}}});
const pages=[spread('cover',-1,true),...Array.from({length:6},(_,i)=>spread('page'+i,i))];

test('physical sheets keep their front/back face and identity across every reading position',()=>{
  const book=boundBook(pages,'book');assert.equal(book.leaves.length,7);
  assert.deepEqual(book.leaves[1],{id:'page0',index:0,front:'#343e39',back:'#e0e5d7'});
  assert.equal(book.leaves[0].front,'#aebca7');assert.equal(book.leaves[0].back,'#e0e5d7');
  for(const view of readingViews(pages,'book'))assert.equal(boundCursor(pages,view,'book'),view.region==='cover'?-1:view.spread.position);
  const single=boundBook(pages,'single');assert.equal(single.leaves.length,13);
  for(const view of readingViews(pages,'single'))assert.equal(boundCursor(pages,view,'single'),view.region==='cover'?-1:view.spread.position*2+(view.region==='right'?1:0));
});
test('a turning sheet leaves the fixed pile while every other sheet stays anchored at the spine',()=>{
  const book=boundBook(pages,'book'),unit=BOOK_HEIGHT/400;
  for(let n=0;n<=100;n++){
    const cursor=2+n/100;
    for(const leaf of book.leaves){const r=paperRect(book,leaf,cursor,unit);if(!r)continue;assert.ok(Math.abs(r.side==='left'?r.x+r.w:r.x)<1e-12);assert.equal(r.h,BOOK_HEIGHT);assert.ok(r.y>=-BOOK_HEIGHT/2);}
    if(n>0&&n<100)assert.equal(paperRect(book,book.leaves.find(l=>l.index===2)!,cursor,unit),null);
  }
});
test('forward, backward and cancelled drags give continuous identical stack geometry at either endpoint',()=>{
  for(const mode of ['book','single'] as const){const book=boundBook(pages,mode),unit=BOOK_HEIGHT/430;
    const snapshot=(cursor:number)=>book.leaves.map(l=>paperRect(book,l,cursor,unit));
    for(const [from,to]of [[1,2],[2,1],[-1,0],[0,-1]]){
      const start=snapshot(from),end=snapshot(to);
      const travel=Array.from({length:101},(_,i)=>snapshot(from+(to-from)*i/100));assert.deepEqual(travel[0],start);assert.deepEqual(travel.at(-1),end);
      assert.deepEqual(travel.concat([...travel].reverse()).at(-1),start);
      for(let i=1;i<travel.length;i++)for(let j=0;j<book.leaves.length;j++){const a=travel[i-1][j],b=travel[i][j];if(!a||!b||a.side!==b.side)continue;assert.ok(Math.abs(a.x-b.x)/unit<.02);assert.ok(Math.abs(a.y-b.y)/unit<.02);}
    }
  }
});
test('a large book transfers thickness between sides without expanding outside the scene bleed',()=>{
  const many=[spread('cover',-1,true),...Array.from({length:100},(_,i)=>spread('s'+i,i))];
  for(const mode of ['book','single'] as const){const book=boundBook(many,mode);assert.ok(paperPitch(book)>0);
    for(const height of [180,342,438,700])for(const cursor of [-1,0,5.5,49,book.leaves.at(-1)!.index]){
      const unit=BOOK_HEIGHT/height;
      for(const r of [...book.leaves.flatMap(l=>{const r=paperRect(book,l,cursor,unit);return r?[r]:[];}),...bindingRects(book,cursor,unit)]){
        assert.ok((r.y+r.h-BOOK_HEIGHT/2)/unit<BOOK_BLEED);assert.ok((Math.max(Math.abs(r.x),Math.abs(r.x+r.w))-(book.book?1:.5))/unit<BOOK_BLEED);
      }
    }
  }
});
test('cover and single-view binding geometry stay centered and retain the saved cover material',()=>{
  for(const mode of ['book','single']as const){const book=boundBook(pages,mode),unit=BOOK_HEIGHT/400;
    const closed=bindingRects(book,-1,unit,0);assert.equal(closed.length,1);assert.equal(closed[0].side,'right');
    for(const r of bindingRects(book,2,unit,mode==='book'?1:0))assert.match(r.color,/^#[a-f\d]{6}$/i);
    const r=closed[0];assert.ok(Math.abs(r.x+r.w/2-(mode==='book'?.5:0))<1e-12);
  }
});
test('a rigid cover exposes the left board after crossing the spine and closes along the same path',()=>{
  assert.equal(coverOpenness(true,false,0),0);assert.equal(coverOpenness(true,false,.25),0);assert.equal(coverOpenness(true,false,1),1);
  let previous=0;
  for(let i=0;i<=100;i++){const p=i/100,opened=coverOpenness(true,false,p);assert.ok(opened>=previous);assert.ok(opened>=0&&opened<=1);assert.ok(Math.abs(opened-coverOpenness(false,true,1-p))<1e-12);previous=opened;}
  assert.equal(coverOpenness(false,false,.35),1);
});
