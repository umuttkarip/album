import test from 'node:test';
import assert from 'node:assert/strict';
import { blankDoc,newElement,applyTemplate,spansCenter,validDoc,photoBox,canRead,canEdit,type User } from '../lib/model';
import { readingViews } from '../lib/render';
const umut:User={id:'umut',name:'Umut',admin:true},sude:User={id:'sude',name:'Sude',admin:false};
test('personal albums grant admin read, never implicit edit',()=>{const personal={owner_id:'sude',visibility:'personal' as const};assert.equal(canRead(umut,personal),true);assert.equal(canEdit(umut,personal),false);assert.equal(canEdit(sude,personal),true);assert.equal(canRead(sude,{...personal,owner_id:'umut'}),false);});
test('both accounts can edit shared albums',()=>{for(const u of [umut,sude]){assert.ok(canRead(u,{owner_id:'umut',visibility:'shared'}));assert.ok(canEdit(u,{owner_id:'umut',visibility:'shared'}));}});
test('panorama references the asset exactly once and remains whole in single mode',()=>{const doc=applyTemplate('panorama',[{id:'photo',width:2000,height:1200}]);assert.equal(doc.elements.length,1);assert.ok(spansCenter(doc));const spread={id:'s',album_id:'a',position:0,doc,revision:0};assert.equal(readingViews([spread],'single').length,1);assert.equal(readingViews([spread],'single')[0].region,'full');assert.equal(readingViews([spread],'book').length,1);});
test('regular spread gives two single pages, one book view, without changing layout',()=>{const doc=applyTemplate('single',[{id:'a',width:100,height:150},{id:'b',width:100,height:150}]);const original=JSON.stringify(doc),s={id:'s',album_id:'a',position:0,doc,revision:0};assert.equal(readingViews([s],'single').length,2);assert.equal(readingViews([s],'book').length,1);assert.equal(JSON.stringify(doc),original);});
test('rotation across the spine preserves the whole composition',()=>{const doc=blankDoc();doc.elements=[newElement('photo',{assetId:'a',x:940,y:100,w:100,h:300,rotation:-30})];assert.ok(spansCenter(doc));});
test('schema rejects invalid dimensions, duplicate identifiers and nonfinite stroke values',()=>{const d=blankDoc();d.elements=[newElement('text',{text:'Not',size:35,font:'Literata'})];assert.ok(validDoc(d));assert.equal(validDoc({...d,elements:[{...d.elements[0],w:-1}]}),false);assert.equal(validDoc({...d,elements:[d.elements[0],d.elements[0]]}),false);assert.equal(validDoc({...d,elements:[newElement('stroke',{points:[0,0,1,NaN],size:8})]}),false);});
test('cover templates never invent a second page',()=>{const d=applyTemplate('grid',Array.from({length:8},(_,n)=>({id:String(n),width:100,height:100})),'charcoal',true);assert.equal(d.elements.length,4);assert.ok(d.elements.every(e=>e.x<1000));assert.equal(spansCenter(d),false);});
test('contain keeps the full photo; cover and crop offsets remain bounded',()=>{const e=newElement('photo',{w:500,h:500});const a=photoBox(e,1000,500);assert.equal(a.w,500);assert.equal(a.h,250);assert.equal(a.y,125);const b=photoBox({...e,fit:'cover',crop:{scale:2,x:1,y:-1}},1000,500);assert.ok(b.x<=0&&b.x+b.w>=500);assert.ok(b.y<=0&&b.y+b.h>=500);});

test('editorial and story templates preserve sources, fit the page and leave notes to the user',()=>{
 const photos=Array.from({length:3},(_,i)=>({id:'editorial-'+i,width:i%2?1200:800,height:i%2?800:1200}));
 for(const [id,count]of [['editorial',2],['story',3]] as const){
  const doc=applyTemplate(id,photos),images=doc.elements.filter(e=>e.type==='photo');
  assert.equal(images.length,count);assert.deepEqual(images.map(e=>e.assetId),photos.slice(0,count).map(p=>p.id));
  assert.ok(doc.elements.filter(e=>e.type==='text').every(e=>e.text===''));
  assert.ok(doc.elements.every(e=>e.x>=0&&e.y>=0&&e.x+e.w<=2000&&e.y+e.h<=1250));
  const cover=applyTemplate(id,photos,'ivory',true);assert.ok(cover.elements.every(e=>e.x+e.w<=1000));
 }
});
