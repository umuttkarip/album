import test from 'node:test';
import assert from 'node:assert/strict';
import {designs} from '../lib/design';
import {themeDocument,themedCover,themedSpread,styleTemplate} from '../lib/themes';
import {validDoc,applyTemplate,photoBox,spansCenter,newElement,blankDoc,type Asset} from '../lib/model';
import {resolveSpreads} from '../lib/composition';
import {readingViews} from '../lib/render';
import {stickers} from '../lib/stickers';
const photos:Asset[]=[{id:'portrait',width:900,height:1400},{id:'wide',width:1800,height:900},{id:'standard',width:1600,height:1100}].map(a=>({...a,album_id:'album',kind:'photo',filename:'a.jpg',mime:'image/jpeg',created_by:'umut',ready:1}));
test('six themes preserve image proportions and user titles for zero, one and three photos',()=>{
  const looks=new Set();for(const design of designs){const source=themeDocument(design.id);looks.add(JSON.stringify(source.surfaces));for(const n of [0,1,3]){const cover=themedCover(photos.slice(0,n),'Kendi başlığım',themeDocument(design.id,true)),spread=themedSpread(photos.slice(0,n),source);assert.ok(validDoc(cover),design.id+' cover');assert.ok(validDoc(spread),design.id+' spread');assert.deepEqual(cover.elements.filter(e=>e.type==='text').map(e=>e.text),['Kendi başlığım']);assert.equal(spread.elements.filter(e=>e.type==='text').length,0);for(const e of spread.elements.filter(e=>e.type==='photo')){const a=photos.find(a=>a.id===e.assetId)!;assert.ok(Math.abs(e.w/e.h-a.width/a.height)<.00001);}}}assert.equal(looks.size,6);
});
test('two-page fit and fill use one source and one crop, and single view preserves the composition',()=>{
  for(const id of ['panorama','panorama-fill'])for(const [width,height]of [[1600,900],[1500,1000],[1200,900]]){const d=styleTemplate(applyTemplate(id,[{id:'p',width,height}]),themeDocument('collage')),e=d.elements[0],b=photoBox(e,width,height);assert.equal(d.elements.filter(e=>e.type==='photo').length,1);assert.ok(spansCenter(d));if(id==='panorama')assert.ok(b.w<=e.w+.01&&b.h<=e.h+.01);else assert.ok(b.w>=e.w-.01&&b.h>=e.h-.01);assert.equal(readingViews([{id:'p',album_id:'a',position:0,revision:0,doc:d}],'single').length,1);}
});
test('independent page materials and photo edges round-trip; malformed documents are rejected',()=>{
  const d={...themeDocument('linen'),autoLayout:false,surfaces:{left:{color:'#353d3c',pattern:'gingham' as const},right:{color:'#faf9f5',pattern:'grid' as const}},elements:[newElement('photo',{assetId:'p',frameStyle:'torn',crop:{scale:1.5,x:.3,y:-.2}})]};assert.ok(validDoc(JSON.parse(JSON.stringify(d))));for(const bad of [{...d,surfaces:null},{...d,surfaces:{left:{color:'red',pattern:'plain'}}},{...d,designId:'fake'},{...d,elements:[{...d.elements[0],frameStyle:'fake'}]}])assert.equal(validDoc(bad),false);
});
test('legacy custom pages are preserved by reference and do not inherit a theme implicitly',()=>{const doc={...blankDoc(),elements:[newElement('text',{text:'Benim notum',font:'Caveat',size:32})]},spread={id:'manual',album_id:'a',position:0,revision:4,doc};assert.equal(resolveSpreads([spread],photos,'Başlık')[0],spread);assert.equal(doc.surfaces,undefined);});
test('sticker packs retain 48 materials and isolate the five supplied cutouts',()=>{assert.equal(stickers.filter(s=>s.packId!=='supplied').length,48);assert.equal(stickers.filter(s=>s.packId==='supplied').length,5);assert.equal(new Set(stickers.map(s=>s.id)).size,53);for(const s of stickers.filter(s=>s.packId==='supplied'))assert.ok(s.src.includes('/supplied/'));});
