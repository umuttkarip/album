import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../server/api';
function fixture(user='umut',visibility='shared'){
  const removed:string[][]=[],batches:any[]=[],writes:any[]=[];
  const album={id:'album',title:'Eski',owner_id:'umut',visibility,paper:'ivory',design_id:null,updated_at:123};
  const env:any={DB:{prepare(sql:string){const q:any={sql,values:[],bind(...v:any[]){q.values=v;return q;},async first(){if(sql.startsWith('UPDATE albums SET deleted_at')){writes.push(q);return {id:'album'};}return sql.includes('FROM sessions')?{user_id:user}:sql.includes('FROM albums')?album:null;},async all(){return {results:[{id:'one'},{id:'two'}]};},async run(){writes.push(q);return {success:true};}};return q;},async batch(items:any[]){batches.push(items);return [];}},BUCKET:{async delete(keys:string[]){removed.push(keys);}}};
  const send=(data:any,method='DELETE',auth=true)=>api(new Request('https://album.test/api/albums/album',{method,headers:{Origin:'https://album.test','Content-Type':'application/json',...(auth?{Authorization:'Bearer '+'a'.repeat(64)}:{})},body:JSON.stringify(data)}),env);
  return {send,removed,batches,writes};
}
const approval={confirmTitle:'Eski',updatedAt:123,assetIds:['one','two']};
test('album removal rejects anonymous, non-owner and changed snapshots before touching storage',async()=>{
  for(const [user,body,status,auth]of [['umut',approval,401,false],['sude',approval,403,true],['umut',{...approval,confirmTitle:'Yanlış'},400,true],['umut',{...approval,updatedAt:122},409,true],['umut',{...approval,assetIds:['one']},409,true]] as const){const f=fixture(user);assert.equal((await f.send(body,'DELETE',auth)).status,status);assert.equal(f.removed.length,0);assert.equal(f.batches.length,0);}
});
test('approved owner removal only marks the album and never deletes storage or documents',async()=>{const f=fixture();assert.equal((await f.send(approval)).status,200);assert.deepEqual(f.removed,[]);assert.deepEqual(f.batches,[]);assert.equal(f.writes.length,1);assert.ok(f.writes[0].sql.startsWith('UPDATE albums SET deleted_at'));assert.equal(f.writes[0].values[1],'umut');assert.equal(f.writes[0].values[3],'album');assert.equal(f.writes[0].values[4],123);});
test('only the owner may publish a personal album or change the visibility of a shared one',async()=>{
  const owner=fixture('umut','personal');assert.equal((await owner.send({title:'Ekim',visibility:'shared'},'PATCH')).status,200);assert.equal(owner.writes[0].values[3],'shared');const guest=fixture('sude');assert.equal((await guest.send({title:'Ekim',visibility:'personal'},'PATCH')).status,403);assert.equal(guest.writes.length,0);
});
