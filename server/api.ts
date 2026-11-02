import { currentUser, createSession, verifyPassword, sessionToken, hashToken, expiredCookie, type AlbumEnv } from './auth';
import { blankDoc, canRead, canEdit, validDoc, papers, type Album, type User, type PageDoc } from '../lib/model';
import { isAutomatic } from '../lib/composition';
import { themeDocument } from '../lib/themes';
import { validDesign, type DesignId } from '../lib/design';

class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new ApiError(status,message); }
const json = (value: unknown, status = 200, headers: Record<string,string> = {}) => Response.json(value, {status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function body(req: Request) { if (Number(req.headers.get('content-length')) > 2_000_000) fail(413,'İstek çok büyük.'); try { const t = await req.text(); if (t.length > 2_000_000) fail(413,'İstek çok büyük.'); return JSON.parse(t); } catch(e) { if (e instanceof ApiError) throw e; fail(400,'Geçersiz istek.'); } }
async function album(env: AlbumEnv,id: string,u: User,write = false): Promise<Album> {
  const a = await env.DB.prepare('SELECT * FROM albums WHERE id=?').bind(id).first<Album>();
  if (!a || !canRead(u,a)) return fail(404,'Albüm bulunamadı.');
  if (write && !canEdit(u,a)) fail(403,'Düzenleme iznin yok.');
  return a;
}
type Row = {id:string; album_id:string; position:number; doc:string; revision:number; lock_owner:string|null; lock_token:string|null; lock_expires:number};
const publicSpread = (r: Row) => ({id:r.id,album_id:r.album_id,position:r.position,doc:JSON.parse(r.doc),revision:r.revision,lock_owner:r.lock_expires > Date.now() ? r.lock_owner : null,lock_expires:r.lock_expires});
async function checkDocAssets(env: AlbumEnv,d: PageDoc,aid: string) {
  const ids = [...new Set(d.elements.flatMap(e => e.assetId ? [e.assetId] : []))];
  if (!ids.length) return;
  for(let start=0;start<ids.length;start+=80){const group=ids.slice(start,start+80);const result = await env.DB.prepare(`SELECT id FROM assets WHERE album_id=? AND ready=1 AND id IN (${group.map(()=>'?').join(',')})`).bind(aid,...group).all();
  if (result.results.length !== group.length) fail(400,'Sayfadaki fotoğraflardan biri bu albüme ait değil veya henüz yüklenmedi.');}
}
async function ensureAutomaticPages(env:AlbumEnv,aid:string,paper:PageDoc['paper'],designId?:DesignId|null){
  const rows=await env.DB.prepare('SELECT doc FROM spreads WHERE album_id=? AND position>=0').bind(aid).all<{doc:string}>();
  if(!rows.results.length||rows.results.some(r=>!isAutomatic(JSON.parse(r.doc))))return;
  const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM assets WHERE album_id=? AND ready=1 AND kind='photo'").bind(aid).first<{n:number}>();
  const missing=Math.max(0,Math.ceil((count?.n||0)/4)-rows.results.length);if(!missing)return;
  const statements=Array.from({length:missing},()=>env.DB.prepare(`INSERT INTO spreads(id,album_id,position,doc,updated_at) SELECT ?,?,COALESCE(MAX(position),-1)+1,?,? FROM spreads WHERE album_id=? HAVING ?>(SELECT COUNT(*)*4 FROM spreads WHERE album_id=? AND position>=0)`).bind(crypto.randomUUID(),aid,JSON.stringify(designId?themeDocument(designId):{...blankDoc(paper),autoLayout:true}),Date.now(),aid,count!.n,aid));
  await env.DB.batch(statements);
}
export async function api(req: Request, env: AlbumEnv): Promise<Response> {
  try {
    if (!env.DB || !env.BUCKET) return json({error:'Depolama henüz hazır değil.'},503);
    const url = new URL(req.url), path = url.pathname.split('/').filter(Boolean).slice(1), method = req.method;
    const origin=req.headers.get('origin'), crossOrigin=!!origin&&origin!==url.origin;
    const allowedOrigins=(env.ALBUM_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
    if (!['GET','HEAD'].includes(method) && origin !== url.origin && (!origin || !allowedOrigins.includes(origin))) fail(403,'Bu kaynaktan işlem yapılamaz.');
    if (crossOrigin && !allowedOrigins.includes(origin!)) fail(403,'Bu kaynaktan işlem yapılamaz.');
    if (path[0] === 'auth' && path[1] === 'login' && method === 'POST') {
      const b = await body(req), name = String(b.username || '').trim().toLowerCase(), password = String(b.password || '');
      const key = hashToken((req.headers.get('cf-connecting-ip') || 'local') + '|' + name), now = Date.now();
      const attempt = await env.DB.prepare('SELECT count,window FROM attempts WHERE key=?').bind(key).first<{count:number;window:number}>();
      if (attempt && attempt.window > now-900000 && attempt.count >= 8) fail(429,'Çok fazla deneme yapıldı. 15 dakika sonra yeniden dene.');
      await env.DB.prepare('INSERT INTO attempts(key,count,window) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window<? THEN 1 ELSE count+1 END, window=CASE WHEN window<? THEN ? ELSE window END').bind(key,now,now-900000,now-900000,now).run();
      const hash = name === 'umut' ? env.ALBUM_UMUT_HASH : name === 'sude' ? env.ALBUM_SUDE_HASH : undefined;
      if (!hash && ['umut','sude'].includes(name)) fail(503,'Hesap kurulumu henüz tamamlanmadı.');
      if (!hash || !verifyPassword(password,hash)) fail(401,'Kullanıcı adı veya şifre yanlış.');
      await env.DB.prepare('UPDATE attempts SET count=0 WHERE key=?').bind(key).run();
      const session=await createSession(req,env,name);
      return json({user:{id:name,name:name==='umut'?'Umut':'Sude',admin:name==='umut'},...(crossOrigin?{token:session.token}:{})},200,crossOrigin?{}:{'Set-Cookie':session.cookie});
    }
    const u = await currentUser(req,env); if (!u) fail(401,'Devam etmek için giriş yap.');
    if (path[0] === 'auth') {
      if (path[1] === 'me') return json({user:u});
      if (path[1] === 'logout' && method === 'POST') { await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(hashToken(sessionToken(req))).run(); return json({ok:true},200,{'Set-Cookie':expiredCookie(req)}); }
    }
    if (path[0] === 'albums' && path.length === 1) {
      if (method === 'GET') {
        const r = await env.DB.prepare(`SELECT a.*, (SELECT COUNT(*) FROM assets t WHERE t.album_id=a.id AND t.ready=1 AND t.kind='photo') photo_count, (SELECT doc FROM spreads s WHERE s.album_id=a.id AND s.position=-1 LIMIT 1) cover_json, (SELECT json_group_array(json_object('id',p.id,'width',p.width,'height',p.height)) FROM (SELECT id,width,height FROM assets WHERE album_id=a.id AND ready=1 AND kind='photo' ORDER BY created_at,id LIMIT 3) p) cover_assets_json FROM albums a WHERE (?=1 OR a.visibility='shared' OR a.owner_id=?) ORDER BY a.updated_at DESC`).bind(u.admin?1:0,u.id).all<Album & {cover_json:string;cover_assets_json:string}>();
        return json({albums:r.results.map(({cover_json,cover_assets_json,...a}) => ({...a,cover_assets:JSON.parse(cover_assets_json||'[]'),cover_doc:cover_json?JSON.parse(cover_json):blankDoc(a.paper,true)}))});
      }
      if (method === 'POST') {
        const b = await body(req), title = String(b.title || '').trim(); if (!title || title.length > 100 || !['shared','personal'].includes(b.visibility)) fail(400,'Albüm adı ve türünü kontrol et.');
        const id=crypto.randomUUID(), now=Date.now(), paper=b.paper in papers?b.paper:'ivory';
        if(b.designId!==undefined&&!validDesign(b.designId))fail(400,'Tasarımı kontrol et.');
        const designId:DesignId=b.designId||'collage',cover=themeDocument(designId,true);
        await env.DB.batch([
          env.DB.prepare('INSERT INTO albums(id,title,visibility,owner_id,paper,design_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,title,b.visibility,u.id,paper,designId,now,now),
          env.DB.prepare('INSERT INTO spreads(id,album_id,position,doc,updated_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,-1,JSON.stringify(cover),now),
          env.DB.prepare('INSERT INTO spreads(id,album_id,position,doc,updated_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,0,JSON.stringify(themeDocument(designId)),now),
        ]); return json({id},201);
      }
    }
    if (path[0] === 'albums' && path[1]) {
      const a = await album(env,path[1],u,method!=='GET');
      if (path.length === 2 && method === 'GET') {
        const [s,assets] = await Promise.all([env.DB.prepare('SELECT * FROM spreads WHERE album_id=? ORDER BY position').bind(a.id).all<Row>(),env.DB.prepare('SELECT id,album_id,kind,filename,mime,width,height,created_by,ready FROM assets WHERE album_id=? AND ready=1 ORDER BY created_at,id').bind(a.id).all()]);
        return json({album:a,spreads:s.results.map(publicSpread),assets:assets.results,user:u});
      }
      if (path.length === 2 && method === 'PATCH') {
        const b = await body(req), title=String(b.title||'').trim(), description=String(b.description||''); if(!title || title.length>100 || description.length>2000) fail(400,'Albüm bilgilerini kontrol et.');
        if(b.designId!==undefined&&!validDesign(b.designId))fail(400,'Tasarımı kontrol et.');
        if(b.visibility!==undefined&&!['shared','personal'].includes(b.visibility))fail(400,'Albüm türünü kontrol et.');
        if(b.visibility!==undefined&&b.visibility!==a.visibility&&a.owner_id!==u.id)fail(403,'Albüm türünü yalnız sahibi değiştirebilir.');
        await env.DB.prepare('UPDATE albums SET title=?,description=?,design_id=?,visibility=?,updated_at=? WHERE id=?').bind(title,description,b.designId||a.design_id||null,b.visibility||a.visibility,Date.now(),a.id).run(); return json({ok:true});
      }
      if(path.length===2&&method==='DELETE'){
        if(a.owner_id!==u.id)fail(403,'Albümü yalnız sahibi kaldırabilir.');
        const b=await body(req);if(b.confirmTitle!==a.title)fail(400,'Albüm adını doğrula.');
        if(b.updatedAt!==a.updated_at)fail(409,'Albüm değişti. Kaldırmadan önce yeniden kontrol et.');
        const assets=await env.DB.prepare('SELECT id FROM assets WHERE album_id=?').bind(a.id).all<{id:string}>();
        if(!Array.isArray(b.assetIds)||b.assetIds.length!==assets.results.length||assets.results.some(p=>!b.assetIds.includes(p.id)))fail(409,'Albümdeki fotoğraflar değişti. Yeniden kontrol et.');
        const keys=assets.results.flatMap(p=>['original','display','thumb'].map(v=>p.id+'/'+v));
        for(let start=0;start<keys.length;start+=100)await env.BUCKET.delete(keys.slice(start,start+100));
        await env.DB.batch([env.DB.prepare('DELETE FROM assets WHERE album_id=?').bind(a.id),env.DB.prepare('DELETE FROM spreads WHERE album_id=?').bind(a.id),env.DB.prepare('DELETE FROM albums WHERE id=?').bind(a.id)]);
        return json({ok:true});
      }
      if (path[2] === 'spreads' && method === 'POST') {
        const b=await body(req), d=b.doc || {...(a.design_id?themeDocument(a.design_id):blankDoc(a.paper)),autoLayout:false}; if(!validDoc(d) || d.cover) fail(400,'Geçersiz sayfa.'); await checkDocAssets(env,d,a.id);
        const id=crypto.randomUUID();
        await env.DB.prepare('INSERT INTO spreads(id,album_id,position,doc,updated_at) SELECT ?,?,COALESCE(MAX(position),-1)+1,?,? FROM spreads WHERE album_id=?').bind(id,a.id,JSON.stringify(d),Date.now(),a.id).run();
        const r=await env.DB.prepare('SELECT * FROM spreads WHERE id=?').bind(id).first<Row>(); return json({spread:publicSpread(r!)},201);
      }
      if (path[2] === 'assets' && method === 'POST') {
        const b=await body(req); if(!['image/jpeg','image/png','image/webp'].includes(b.mime) || !['photo','sticker'].includes(b.kind) || !Number.isInteger(b.width) || !Number.isInteger(b.height) || b.width<1 || b.height<1 || b.width>40000 || b.height>40000) fail(400,'Desteklenmeyen fotoğraf. JPEG, PNG veya WebP seç.');
        if (b.kind==='sticker' && !['image/png','image/webp'].includes(b.mime)) fail(400,'Çıkartma için PNG veya WebP seç.');
        const id=crypto.randomUUID(), filename=String(b.filename||'fotoğraf').slice(0,200);
        await env.DB.prepare('INSERT INTO assets(id,album_id,kind,filename,mime,width,height,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,a.id,b.kind,filename,b.mime,b.width,b.height,u.id,Date.now()).run();return json({id},201);
      }
    }
    if (path[0] === 'spreads' && path[1]) {
      const s=await env.DB.prepare('SELECT * FROM spreads WHERE id=?').bind(path[1]).first<Row>(); if(!s) fail(404,'Sayfa bulunamadı.'); await album(env,s.album_id,u,method!=='GET');
      if (method === 'GET') return json({spread:publicSpread(s)});
      const b=await body(req), now=Date.now();
      if (path[2] === 'lock' && method === 'POST') {
        const token=typeof b.token==='string' ? b.token : crypto.randomUUID();
        const r=await env.DB.prepare('UPDATE spreads SET lock_owner=?,lock_token=?,lock_expires=? WHERE id=? AND (lock_expires<? OR (lock_owner=? AND lock_token=?)) RETURNING id').bind(u.id,token,now+60000,s.id,now,u.id,token).first();
        if(!r) return json({error:`Bu sayfayı ${s.lock_owner==='umut'?'Umut':'Sude'} düzenliyor.`,owner:s.lock_owner,expires:s.lock_expires},423);
        return json({token,expires:now+60000,revision:s.revision});
      }
      if (path[2] === 'unlock' && method === 'POST') { await env.DB.prepare('UPDATE spreads SET lock_expires=0 WHERE id=? AND lock_owner=? AND lock_token=?').bind(s.id,u.id,b.token||'').run(); return json({ok:true}); }
      if (method === 'PUT' && path.length === 2) {
        if(!validDoc(b.doc) || b.doc.cover!==(s.position===-1)) fail(400,'Sayfa verisi geçersiz.'); await checkDocAssets(env,b.doc,s.album_id);
        const r=await env.DB.prepare('UPDATE spreads SET doc=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND lock_owner=? AND lock_token=? AND lock_expires>? RETURNING revision').bind(JSON.stringify(b.doc),now,s.id,b.revision,u.id,b.token||'',now).first<{revision:number}>();
        if(!r) fail(409,'Sayfa başka bir yerde değişti veya düzenleme süren doldu. Taslağın cihazında korunuyor.');
        await env.DB.prepare('UPDATE albums SET updated_at=? WHERE id=?').bind(now,s.album_id).run();return json({revision:r.revision});
      }
    }
    if (path[0] === 'assets' && path[1]) {
      const a=await env.DB.prepare('SELECT * FROM assets WHERE id=?').bind(path[1]).first<{id:string;album_id:string;mime:string;filename:string;kind:string;ready:number;uploaded:number}>();if(!a) fail(404,'Fotoğraf bulunamadı.'); await album(env,a.album_id,u,method!=='GET');
      const variant=path[2];if(!['original','display','thumb','complete'].includes(variant)) fail(404,'Dosya bulunamadı.');
      if (method === 'PUT' && variant !== 'complete') {
        if(a.ready) fail(409,'Bu fotoğraf zaten kaydedildi.');
        const limit=variant==='original'?30*1024*1024:6*1024*1024, length=Number(req.headers.get('content-length'));
        if(!length || length>limit) fail(413,'Dosya çok büyük. En fazla 30 MB yüklenebilir.');
        if(!req.body) fail(400,'Dosya gövdesi eksik.');
        const reader=req.body.getReader(),prefix:Uint8Array[]=[];let received=0;
        while(received<12){const part=await reader.read();if(part.done)break;prefix.push(part.value);received+=part.value.length;}
        const bytes=new Uint8Array(12);let at=0;for(const part of prefix){const n=Math.min(part.length,12-at);bytes.set(part.subarray(0,n),at);at+=n;if(at===12)break;}
        const mime=variant==='original'?a.mime:'image/webp';
        const ok=mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216 : mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71 : String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
        if(!ok){void reader.cancel();fail(400,'Dosya biçimi içeriğiyle uyuşmuyor.');}
        const stream=new FixedLengthStream(length);
        const pump=(async()=>{const writer=stream.writable.getWriter();try{for(const part of prefix)await writer.write(part);while(true){const part=await reader.read();if(part.done)break;received+=part.value.length;if(received>limit||received>length)throw new Error('Yükleme sınırı aşıldı.');await writer.write(part.value);}await writer.close();}catch(e){await writer.abort(e).catch(()=>{});throw e;}finally{reader.releaseLock();}})();
        await Promise.all([env.BUCKET.put(`${a.id}/${variant}`,stream.readable,{httpMetadata:{contentType:mime}}),pump]);
        const mask=variant==='original'?1:variant==='display'?2:4;
        await env.DB.prepare('UPDATE assets SET uploaded=uploaded|? WHERE id=?').bind(mask,a.id).run();return json({ok:true});
      }
      if (method === 'POST' && variant==='complete') {
        if(a.uploaded!==7) fail(409,'Fotoğrafın bütün kopyaları henüz yüklenmedi.'); await env.DB.prepare('UPDATE assets SET ready=1 WHERE id=?').bind(a.id).run();if(a.kind==='photo'){const parent=await album(env,a.album_id,u);await ensureAutomaticPages(env,parent.id,parent.paper,parent.design_id);}return json({ok:true});
      }
      if (method === 'GET' && variant!=='complete' && a.ready) {
        const object=await env.BUCKET.get(`${a.id}/${variant}`);if(!object) fail(404,'Dosya bulunamadı.');
        return new Response(object.body,{headers:{'Content-Type':variant==='original'?a.mime:'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`${url.searchParams.has('download')?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(a.filename)}`,'Cross-Origin-Resource-Policy':'same-origin'}});
      }
    }
    return json({error:'İşlem bulunamadı.'},404);
  } catch(e) { if(e instanceof ApiError) return json({error:e.message},e.status); console.error('Album API',e instanceof Error?e.message:'unknown');return json({error:'İşlem tamamlanamadı. Yeniden dene.'},500); }
}
