import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {api} from '../server/api';
import {hashToken} from '../server/auth';
import {blankDoc,newElement,papers,type PageDoc} from '../lib/model';
import {designs} from '../lib/design';
import {themeDocument} from '../lib/themes';
import {paperSurface} from '../lib/paper';
import {resolveSpreads} from '../lib/composition';

function fixture(user='umut',owner='umut',visibility='shared'){
  const sqlite=new DatabaseSync(':memory:'),token='a'.repeat(64);
  sqlite.exec(`CREATE TABLE sessions(token_hash TEXT,user_id TEXT,expires_at INTEGER);
    CREATE TABLE assets(id TEXT,album_id TEXT,kind TEXT,width INTEGER,height INTEGER,ready INTEGER,deleted_at INTEGER,created_at INTEGER);
    CREATE TABLE albums(id TEXT PRIMARY KEY,title TEXT,description TEXT,owner_id TEXT,visibility TEXT,paper TEXT,design_id TEXT,updated_at INTEGER,deleted_at INTEGER);
    CREATE TABLE spreads(id TEXT PRIMARY KEY,album_id TEXT,position INTEGER,doc TEXT,revision INTEGER,updated_at INTEGER,lock_owner TEXT,lock_token TEXT,lock_expires INTEGER);`);
  sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token),user,Date.now()+60000);
  sqlite.prepare('INSERT INTO albums VALUES(?,?,?,?,?,?,?,?,NULL)').run('a','Ekim','',owner,visibility,'ivory','linen',123);
  const docs:PageDoc[]=[{...blankDoc('charcoal',true),autoLayout:false,surfaces:{left:{color:'#31474b',pattern:'linen'}},elements:[newElement('text',{text:'Ekim',color:'#f6f0e4',font:'Literata',size:60})]},
    {...blankDoc('charcoal'),autoLayout:false,surfaces:{left:{color:'#292f33',pattern:'grain'},right:{color:'#e1ece7',pattern:'grain'}},elements:[newElement('photo',{assetId:'original',x:1132.5,y:135,w:735,h:980,rotation:.6,fit:'contain',frameStyle:'white',crop:{x:.2,y:.3,scale:1.2}}),newElement('text',{text:'Kadıköy',color:'#eee9df',font:'Literata',fontStyle:'italic'}),newElement('stroke',{points:[0,0,1,1],color:'#aabbcc'})]},blankDoc()];
  docs.forEach((d,i)=>sqlite.prepare('INSERT INTO spreads VALUES(?,?,?,?,?,?,NULL,NULL,0)').run('s'+i,'a',i-1,JSON.stringify(d),i+3,120));
  const db={prepare(sql:string){const statement=sqlite.prepare(sql);let values:any[]=[];const q={bind(...args:any[]){values=args;return q;},async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){return {success:true,meta:statement.run(...values)};},execute(){return {results:statement.all(...values)};}};return q;},async batch(items:any[]){sqlite.exec('BEGIN');try{const result=items.map(q=>q.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  const send=(data:any)=>api(new Request('https://album.test/api/albums/a',{method:'PATCH',headers:{Origin:'https://album.test',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({title:'Ekim',designId:'linen',applyDesignToExisting:true,updatedAt:123,...data})}),{DB:db,BUCKET:{}} as any);
  const rows=()=>sqlite.prepare('SELECT * FROM spreads ORDER BY position').all().map(r=>({...r,id:r.id as string,position:r.position as number,revision:r.revision as number,doc:JSON.parse(r.doc as string)}));
  return {sqlite,send,rows,docs};
}
test('applying any album theme updates all paper faces and cover without changing layouts or originals',async()=>{
  for(const theme of designs){const f=fixture();assert.equal((await f.send({designId:theme.id})).status,200);
    const rows=f.rows();rows.forEach((r,i)=>{const expected=themeDocument(theme.id,i===0);assert.equal(r.revision,i+4);assert.equal(r.doc.paper,expected.paper);assert.equal(r.doc.designId,theme.id);assert.deepEqual(r.doc.surfaces,expected.surfaces);
      const {paper:_,surfaces:__,designId:___,texture:____,...rest}=r.doc;
      const {paper:a,surfaces:b,...before}=f.docs[i];
      const withoutInk=(d:any)=>({...d,elements:d.elements.map((e:any)=>e.type==='text'?{...e,color:null}:e)});
      assert.deepEqual(withoutInk(rest),withoutInk(before),'Only material and text ink may change');
    });assert.equal(f.sqlite.prepare('SELECT design_id FROM albums').get()!.design_id,theme.id);f.sqlite.close();}
});
test('locked or stale albums change neither a page nor the album metadata',async()=>{
  for(const state of ['own-lock','other-lock','stale'] as const){const f=fixture(),before=f.rows();
    if(state!=='stale')f.sqlite.prepare('UPDATE spreads SET lock_owner=?,lock_expires=? WHERE id=?').run(state==='own-lock'?'umut':'sude',Date.now()+60000,'s1');
    assert.equal((await f.send({title:'Değişmiş',updatedAt:state==='stale'?122:123})).status,state==='stale'?409:423);
    assert.deepEqual(f.rows().map(r=>({doc:r.doc,revision:r.revision})),before.map(r=>({doc:r.doc,revision:r.revision})));assert.equal(f.sqlite.prepare('SELECT title FROM albums').get()!.title,'Ekim');f.sqlite.close();}
});
test('theme propagation follows shared editing and personal owner permissions',async()=>{
  for(const [user,owner,visibility,status]of [['sude','umut','shared',200],['umut','sude','personal',403],['sude','umut','personal',404],['sude','sude','personal',200]] as const){const f=fixture(user,owner,visibility);assert.equal((await f.send({})).status,status);if(status!==200)assert.deepEqual(f.rows().map(r=>r.doc),f.docs);f.sqlite.close();}
});
test('invalid theme requests cannot silently change the defaults or the pages',async()=>{
  for(const request of [{designId:'unknown'},{updatedAt:null},{applyDesignToExisting:'yes'}]){const f=fixture();assert.equal((await f.send(request)).status,400);assert.deepEqual(f.rows().map(r=>r.doc),f.docs);f.sqlite.close();}
});
test('a failed album write rolls back every material update',async()=>{
  const f=fixture();f.sqlite.exec("CREATE TRIGGER fail_album BEFORE UPDATE ON albums BEGIN SELECT RAISE(ABORT,'test transaction rollback'); END");
  assert.equal((await f.send({})).status,500);assert.deepEqual(f.rows().map(r=>r.doc),f.docs);assert.deepEqual(f.rows().map(r=>r.revision),[3,4,5]);f.sqlite.close();
});
test('page paper fallback is shared by legacy, custom left and custom right faces',()=>{
  const old={...blankDoc('sage'),texture:'plain' as const};assert.deepEqual(paperSurface(old,'right'),{color:papers.sage,pattern:'plain'});
  const custom={...old,surfaces:{left:{color:'#17372e',pattern:'linen' as const}}};assert.equal(paperSurface(custom,'right'),custom.surfaces.left);
  const two={...custom,surfaces:{...custom.surfaces,right:{color:'#333333',pattern:'grain' as const}}};assert.equal(paperSurface(two,'right'),two.surfaces.right);assert.equal(paperSurface(two),two.surfaces.left);
});
test('material changes preserve already visible automatic compositions; empty pages still accept future photos',async()=>{
  const f=fixture();for(let i=0;i<4;i++)f.sqlite.prepare("INSERT INTO assets VALUES(?,'a','photo',?,1000,1,NULL,?)").run('p'+i,800+i*400,i);
  for(const [id,cover]of [['s0',true],['s1',false],['s2',false]] as const)f.sqlite.prepare('UPDATE spreads SET doc=? WHERE id=?').run(JSON.stringify(themeDocument('collage',cover)),id);
  const assets=f.sqlite.prepare('SELECT * FROM assets ORDER BY created_at,id').all() as any[],spreads=()=>f.rows().map(r=>({...r,id:r.id as string,album_id:'a',position:r.position as number}));
  const before=resolveSpreads(spreads(),assets,'Ekim');assert.equal((await f.send({designId:'dark'})).status,200);
  const after=resolveSpreads(spreads(),assets,'Ekim'),withoutInk=(elements:any[])=>elements.map(e=>e.type==='text'?{...e,color:null}:e);
  after.forEach((s,i)=>assert.deepEqual(withoutInk(s.doc.elements),withoutInk(before[i].doc.elements)));
  assert.equal(after[0].doc.autoLayout,false);assert.equal(after[1].doc.autoLayout,false);assert.equal(after[2].doc.autoLayout,true);f.sqlite.close();
});
