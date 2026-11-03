import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {scryptSync} from 'node:crypto';
import {api} from '../server/api';
import {hashToken,renewSession,SESSION_SECONDS} from '../server/auth';
import {encryptPassword,decryptPassword} from '../server/passwords';
import {verifyPassword} from '../server/auth';
import {blankDoc,newElement} from '../lib/model';

const password='only-a-test-password',salt='test-salt',passwordHash=salt+':'+scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  for(const name of ['0000_left_goblin_queen','0001_album_design','0002_photo_archive_and_days','0003_user_preferences','0004_user_credentials'])sqlite.exec(readFileSync(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8'));
  const db={prepare(sql:string){let values:any[]=[];const q={bind(...args:any[]){values=args;return q;},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return {results:sqlite.prepare(sql).all(...values)};},async run(){return {success:true,meta:sqlite.prepare(sql).run(...values)};},execute(){return {results:sqlite.prepare(sql).all(...values)};}};return q;},async batch(items:any[]){sqlite.exec('BEGIN');try{const result=items.map(q=>q.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  const env:any={DB:db,BUCKET:{},ALBUM_UMUT_HASH:passwordHash,ALBUM_SUDE_HASH:passwordHash};
  const send=(path:string,method='GET',data?:unknown,headers:Record<string,string>={})=>api(new Request('https://album.test/api/'+path,{method,headers:{Origin:'https://album.test',...(data?{'Content-Type':'application/json'}:{}),...headers},body:data?JSON.stringify(data):undefined}),env);
  const bearer=(user='umut')=>{const token=(user==='umut'?'a':'b').repeat(64);sqlite.prepare('INSERT OR IGNORE INTO sessions VALUES(?,?,?)').run(hashToken(token),user,Date.now()+60000);return {Authorization:'Bearer '+token};};
  return {sqlite,env,send,bearer};
}
test('same-origin login uses a host-only 30-day secure HttpOnly cookie, with no token in JSON',async()=>{
  const f=fixture();try{const response=await f.send('auth/login','POST',{username:'umut',password});assert.equal(response.status,200);assert.equal((await response.json() as any).token,undefined);
    const header=response.headers.get('Set-Cookie')!;assert.match(header,/^__Host-album_session=[a-f\d]{64};/);for(const flag of ['Path=/','HttpOnly','SameSite=Strict','Secure',`Max-Age=${SESSION_SECONDS}`])assert.ok(header.includes(flag));assert.ok(!header.includes('Domain='));
    const cookie=header.split(';')[0],me=await f.send('auth/me','GET',undefined,{Cookie:cookie});assert.equal(me.status,200);assert.equal((await me.json() as any).user.id,'umut');assert.ok(me.headers.get('Set-Cookie')?.startsWith(cookie));
    const row=f.sqlite.prepare('SELECT * FROM sessions').get()!;assert.notEqual(row.token_hash,cookie.split('=')[1]);assert.ok(Number(row.expires_at)>Date.now()+29*86400000);
    assert.equal((await f.send('auth/logout','POST',{}, {Cookie:cookie})).status,200);assert.equal((await f.send('auth/me','GET',undefined,{Cookie:cookie})).status,401);
    assert.equal(await renewSession(new Request('https://album.test',{headers:{Cookie:cookie}}),f.env),null);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM sessions').get()!.n,0);
  }finally{f.sqlite.close();}
});
test('an expired cookie cannot authenticate or renew; a legacy unprefixed HTTPS cookie is ignored',async()=>{
  const f=fixture();try{const token='c'.repeat(64);f.sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token),'umut',Date.now()-1);
    const req=new Request('https://album.test',{headers:{Cookie:'__Host-album_session='+token}});assert.equal(await renewSession(req,f.env),null);assert.equal((await f.send('auth/me','GET',undefined,{Cookie:'__Host-album_session='+token})).status,401);
    f.sqlite.prepare('UPDATE sessions SET expires_at=?').run(Date.now()+60000);assert.equal((await f.send('auth/me','GET',undefined,{Cookie:'album_session='+token})).status,401);
  }finally{f.sqlite.close();}
});
test('cookie writes retain origin checks; arbitrary origins cannot log in or claim the tour',async()=>{
  const f=fixture();try{assert.equal((await f.send('auth/login','POST',{username:'umut',password},{Origin:'https://untrusted.test'})).status,403);assert.equal((await f.send('auth/onboarding/claim','POST',{})).status,401);assert.equal((await f.send('auth/onboarding/claim','POST',{}, {...f.bearer(),Origin:'https://untrusted.test'})).status,403);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM user_preferences').get()!.n,0);}finally{f.sqlite.close();}
});
test('Umut claims the invitation once; Sude receives it on every refresh without resetting seen records',async()=>{
  const f=fixture();try{const headers=f.bearer();const responses=await Promise.all([f.send('auth/onboarding/claim','POST',{},headers),f.send('auth/onboarding/claim','POST',{},headers)]);assert.deepEqual((await Promise.all(responses.map(r=>r.json()))).map((v:any)=>v.show).sort(),[false,true]);
    assert.equal((await(await f.send('auth/onboarding/claim','POST',{},headers)).json() as any).show,false);assert.equal((await(await f.send('auth/onboarding/claim','POST',{},f.bearer('sude'))).json() as any).show,true);assert.equal((await(await f.send('auth/onboarding/claim','POST',{},f.bearer('sude'))).json() as any).show,true);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM user_preferences').get()!.n,1);
  }finally{f.sqlite.close();}
});

function albumFixture(owner='umut',visibility='shared'){
  const f=fixture();f.sqlite.prepare('INSERT INTO albums(id,title,owner_id,visibility,created_at,updated_at) VALUES(?,?,?,?,1,123)').run('a','Ekim',owner,visibility);
  const docs=Array.from({length:5},(_,i)=>({...blankDoc('ivory',i===0),autoLayout:false,elements:[newElement('text',{text:'Existing '+i,size:42})]}));
  docs.forEach((doc,i)=>f.sqlite.prepare('INSERT INTO spreads(id,album_id,position,doc,revision,updated_at) VALUES(?,?,?,?,?,1)').run('s'+i,'a',i-1,JSON.stringify(doc),i+2));
  f.sqlite.prepare("INSERT INTO assets(id,album_id,kind,filename,mime,width,height,created_by,created_at,ready) VALUES('new','a','photo','mc.png','image/png',100,100,'umut',1,1)").run();
  const newDocs=[{...blankDoc(),elements:[newElement('photo',{assetId:'new'})]},blankDoc()];
  const rows=()=>f.sqlite.prepare('SELECT * FROM spreads ORDER BY position').all();
  const insert=(data:Record<string,unknown>={},user='umut')=>f.send('albums/a/spreads/insert','POST',{beforeId:'s3',updatedAt:123,docs:newDocs,...data},f.bearer(user));
  return {...f,docs,newDocs,rows,insert};
}
test('insertion adds two spreads before the chosen spread and preserves every existing document',async()=>{
  const f=albumFixture();try{const before=f.rows();assert.equal((await f.insert()).status,201);const after=f.rows();assert.deepEqual(after.map(r=>r.position),[-1,0,1,2,3,4,5]);for(const old of before){const now=after.find(r=>r.id===old.id)!;assert.equal(now.doc,old.doc);assert.equal(now.position,Number(old.position)+(Number(old.position)>=2?2:0));assert.equal(now.revision,Number(old.revision)+(Number(old.position)>=2?1:0));}assert.equal(after.length,7);assert.ok(Number(f.sqlite.prepare("SELECT updated_at FROM albums WHERE id='a'").get()!.updated_at)>123);}finally{f.sqlite.close();}
});
test('stale versions, active editors and invalid documents cannot partially renumber an album',async()=>{
  for(const state of ['stale','locked','cover','foreign-asset','missing'] as const){const f=albumFixture();try{
    if(state==='locked')f.sqlite.prepare("UPDATE spreads SET lock_owner='sude',lock_expires=? WHERE id='s4'").run(Date.now()+60000);
    const before=f.rows();const data=state==='stale'?{updatedAt:122}:state==='cover'?{docs:[blankDoc('ivory',true)]}:state==='foreign-asset'?{docs:[{...blankDoc(),elements:[newElement('photo',{assetId:'elsewhere'})]}]}:state==='missing'?{beforeId:'missing'}:{};
    assert.equal((await f.insert(data)).status,({stale:409,locked:423,cover:400,'foreign-asset':400,missing:404})[state]);assert.deepEqual(f.rows(),before);assert.equal(f.sqlite.prepare("SELECT updated_at FROM albums WHERE id='a'").get()!.updated_at,123);
  }finally{f.sqlite.close();}}
});
test('insertion observes personal album permissions and rolls back a failed transaction',async()=>{
  for(const [owner,visibility,user,status]of [['umut','shared','sude',201],['sude','personal','umut',403],['umut','personal','sude',404]] as const){const f=albumFixture(owner,visibility);try{assert.equal((await f.insert({},user)).status,status);if(status!==201)assert.equal(f.rows().length,5);}finally{f.sqlite.close();}}
  const f=albumFixture();try{const before=f.rows();f.sqlite.exec("CREATE TRIGGER reject_insert BEFORE INSERT ON spreads BEGIN SELECT RAISE(ABORT,'test insert rollback'); END");assert.equal((await f.insert()).status,500);assert.deepEqual(f.rows(),before);}finally{f.sqlite.close();}
});


test('Sude replaces the temporary password once, recoverable encryption is stored, and the current cookie stays signed in',async()=>{
 const f=fixture(),secret=Buffer.alloc(32,7).toString('base64'),chosen='a-new-test-password';f.env.ALBUM_PASSWORD_KEY=secret;
 try{
  const login=await f.send('auth/login','POST',{username:'sude',password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await login.json() as any).user.passwordChangeRequired,true);
  const headers={Cookie:cookie},result=await f.send('auth/password','POST',{password:chosen,confirmPassword:chosen},headers);assert.equal(result.status,200);assert.equal(result.headers.get('set-cookie'),null);assert.equal(result.headers.get('cache-control'),'no-store');
  const response=await result.json() as any;assert.equal(response.user.passwordChangeRequired,false);assert.ok(!JSON.stringify(response).includes(chosen));
  const row=f.sqlite.prepare("SELECT * FROM user_credentials WHERE user_id='sude'").get()!;assert.notEqual(row.password_hash,chosen);assert.ok(!String(row.password_encrypted).includes(chosen));assert.equal(verifyPassword(chosen,String(row.password_hash)),true);assert.equal(await decryptPassword(String(row.password_encrypted),secret),chosen);
  const me=await f.send('auth/me','GET',undefined,headers);assert.equal(me.status,200);assert.equal((await me.json() as any).user.passwordChangeRequired,false);assert.ok(me.headers.get('set-cookie')!.startsWith(cookie));
  assert.equal((await f.send('auth/login','POST',{username:'sude',password})).status,401);
  const again=await f.send('auth/login','POST',{username:'sude',password:chosen});assert.equal(again.status,200);assert.equal((await again.json() as any).user.passwordChangeRequired,false);
  assert.equal((await f.send('auth/password','POST',{password:'another-test-password',confirmPassword:'another-test-password'},headers)).status,409);assert.equal(f.sqlite.prepare("SELECT password_encrypted FROM user_credentials WHERE user_id='sude'").get()!.password_encrypted,row.password_encrypted);
  assert.equal((await f.send('auth/login','POST',{username:'umut',password})).status,200);
 }finally{f.sqlite.close();}
});
test('password update rejects anonymous, other users, cross-origin, invalid and unchanged passwords without storing anything',async()=>{
 const f=fixture();f.env.ALBUM_PASSWORD_KEY=Buffer.alloc(32,8).toString('base64');const data={password:'new-test-password',confirmPassword:'new-test-password'};
 try{
  assert.equal((await f.send('auth/password','POST',data)).status,401);
  assert.equal((await f.send('auth/password','POST',data,f.bearer('umut'))).status,403);
  const sude=f.bearer('sude');assert.equal((await f.send('auth/password','POST',data,{...sude,Origin:'https://other.test'})).status,403);
  for(const bad of [{password:'short',confirmPassword:'short'},{password:'x'.repeat(257),confirmPassword:'x'.repeat(257)},{...data,confirmPassword:'different'}, {password,confirmPassword:password}])assert.equal((await f.send('auth/password','POST',bad,sude)).status,400);
  delete f.env.ALBUM_PASSWORD_KEY;assert.equal((await f.send('auth/password','POST',data,sude)).status,503);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM user_credentials').get()!.n,0);
 }finally{f.sqlite.close();}
});
test('encrypted password recovery needs the separate key and rejects tampered ciphertext',async()=>{
 const secret=Buffer.alloc(32,9).toString('base64'),a=await encryptPassword('test-only',secret),b=await encryptPassword('test-only',secret);assert.notEqual(a,b);assert.equal(await decryptPassword(a,secret),'test-only');
 await assert.rejects(decryptPassword(a,Buffer.alloc(32,10).toString('base64')));const parts=a.split(':');const bytes=Buffer.from(parts[2],'base64');bytes[0]^=1;parts[2]=bytes.toString('base64');await assert.rejects(decryptPassword(parts.join(':'),secret));
});
