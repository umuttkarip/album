import test from 'node:test';
import assert from 'node:assert/strict';
import {AssetCache} from '../lib/asset-cache';
import {fetchAsset,clearPrivateAssets} from '../lib/network';
import {clearImages,photoVariant} from '../lib/render';

test('compressed images share in-flight transfers and respect byte/count LRU bounds',async()=>{
  const cache=new AssetCache(5,2);let calls=0;
  const load=async()=>{calls++;return new Blob(['123']);};
  const [a,b]=await Promise.all([cache.get('a',load),cache.get('a',load)]);assert.equal(a,b);assert.equal(calls,1);
  await cache.get('b',async()=>new Blob(['12']));await cache.get('a',load);await cache.get('c',async()=>new Blob(['12']));assert.equal(cache.byteLength,5);assert.equal(cache.size,2);
  await cache.get('b',async()=>{calls++;return new Blob(['12']);});assert.equal(calls,2);assert.ok(cache.byteLength<=5);assert.ok(cache.size<=2);
  await cache.get('oversized',async()=>new Blob(['123456']));assert.ok(cache.byteLength<=5);cache.clear();assert.equal(cache.byteLength,0);assert.equal(cache.size,0);
});
test('aborting one image consumer does not cancel another consumer of the same transfer',async()=>{
  const cache=new AssetCache(),first=new AbortController();let deliver!:(blob:Blob)=>void,networkSignal:AbortSignal;
  const load=(signal:AbortSignal)=>{networkSignal=signal;return new Promise<Blob>(resolve=>{deliver=resolve;});};
  const a=cache.get('same',load,first.signal),b=cache.get('same',load);await Promise.resolve();const rejected=assert.rejects(a,{name:'AbortError'});first.abort();await rejected;assert.equal(networkSignal!.aborted,false);deliver(new Blob(['ok']));assert.equal(await(await b).text(),'ok');assert.equal(cache.size,1);
});
test('a fully abandoned transfer is cancelled, and a cleared cache cannot be repopulated by old work',async()=>{
  const cache=new AssetCache(),controller=new AbortController();let deliver!:(blob:Blob)=>void,networkSignal:AbortSignal;
  const a=cache.get('old',signal=>{networkSignal=signal;return new Promise(resolve=>{deliver=resolve;});},controller.signal);await Promise.resolve();const rejected=assert.rejects(a,{name:'AbortError'});controller.abort();await rejected;assert.equal(networkSignal!.aborted,true);deliver(new Blob(['old']));await Promise.resolve();assert.equal(cache.size,0);
  let late!:(blob:Blob)=>void;const b=cache.get('late',()=>new Promise(resolve=>{late=resolve;}));await Promise.resolve();const cleared=assert.rejects(b,{name:'AbortError'});cache.clear();late(new Blob(['private']));await cleared;assert.equal(cache.size,0);assert.equal(cache.byteLength,0);
});
test('failed requests can be retried and an already cancelled consumer makes no request',async()=>{
  const cache=new AssetCache();await assert.rejects(cache.get('error',async()=>{throw Error('offline');}));assert.equal(cache.size,0);assert.equal(await(await cache.get('error',async()=>new Blob(['ok']))).text(),'ok');
  const controller=new AbortController();controller.abort();let calls=0;await assert.rejects(cache.get('cancelled',async()=>{calls++;return new Blob();},controller.signal));assert.equal(calls,0);
});
test('network caching excludes originals/downloads and is cleared with the account image cache',async()=>{
  const native=globalThis.fetch;let calls=0;
  globalThis.fetch=(async(_url,options)=>{calls++;assert.equal(options?.cache,'no-store');return new Response(new Blob(['webp']));}) as typeof fetch;
  try{clearPrivateAssets();for(const variant of ['thumb','screen','display']){const src='/api/assets/one/'+variant;await fetchAsset(src);await fetchAsset(src);}assert.equal(calls,3);
    await fetchAsset('/api/assets/one/original');await fetchAsset('/api/assets/one/original');await fetchAsset('/api/assets/one/original?download=1');assert.equal(calls,6);
    clearImages();await fetchAsset('/api/assets/one/screen');assert.equal(calls,7);
  }finally{clearPrivateAssets();globalThis.fetch=native;}
});
test('reader chooses thumbnails, screen copies or full display copies with crop-aware pixel requirements',()=>{
  assert.equal(photoVariant(320),'thumb');assert.equal(photoVariant(321),'screen');assert.equal(photoVariant(1024),'screen');assert.equal(photoVariant(1025),'display');assert.equal(photoVariant(700*2),'display');
});
