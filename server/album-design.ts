import {themeDocument} from '../lib/themes';
import {designs,type DesignId} from '../lib/design';
import type {Album,Asset,Spread} from '../lib/model';
import {isAutomatic,resolveSpreads} from '../lib/composition';

/** Material-only update in one D1 transaction. Never replace a saved layout with a template. */
export async function applyAlbumDesign(db:D1Database,album:Album,change:{title:string;description:string;visibility:string;designId:DesignId;updatedAt:number}){
  const cover=themeDocument(change.designId,true),page=themeDocument(change.designId),now=Math.max(Date.now(),change.updatedAt+1);
  const coverInk=designs.find(d=>d.id===change.designId)!.ink,pageInk=change.designId==='dark'?'#eee9dc':'#41483f';
  const rows=await db.prepare('SELECT id,album_id,position,doc,revision FROM spreads WHERE album_id=? ORDER BY position').bind(album.id).all<{id:string;album_id:string;position:number;doc:string;revision:number}>();
  const sources:Spread[]=rows.results.map(s=>({...s,doc:JSON.parse(s.doc)}));
  const frozen:Record<string,{source:string;doc:object}>={};
  if(sources.some(s=>isAutomatic(s.doc))){
    const assets=await db.prepare("SELECT * FROM assets WHERE album_id=? AND ready=1 AND deleted_at IS NULL ORDER BY created_at,id").bind(album.id).all<Asset>();
    for(const s of resolveSpreads(sources,assets.results,change.title)){
      const original=rows.results.find(r=>r.id===s.id)!;
      if(isAutomatic(JSON.parse(original.doc))&&s.doc.elements.some(e=>e.type==='photo'))frozen[s.id]={source:original.doc,doc:{...s.doc,autoLayout:false}};
    }
  }
  const guard=`EXISTS(SELECT 1 FROM albums WHERE id=? AND updated_at=? AND deleted_at IS NULL)
    AND NOT EXISTS(SELECT 1 FROM spreads WHERE album_id=? AND lock_expires>?)`;
  const results=await db.batch([
    // Freeze rendered automatic compositions too. The source comparison keeps
    // this optional snapshot from replacing a newly edited document.
    db.prepare(`WITH frozen AS (SELECT key AS id,json_extract(value,'$.source') AS source,json_extract(value,'$.doc') AS doc FROM json_each(?))
      UPDATE spreads SET doc=json_set(COALESCE((SELECT doc FROM frozen WHERE id=spreads.id AND source=spreads.doc),spreads.doc),
      '$.paper',CASE WHEN position=-1 THEN ? ELSE ? END,
      '$.surfaces',json(CASE WHEN position=-1 THEN ? ELSE ? END),
      '$.designId',?,'$.texture','plain',
      '$.elements',json((SELECT json_group_array(json(CASE WHEN json_extract(value,'$.type')='text'
        THEN json_set(value,'$.color',CASE WHEN spreads.position=-1 THEN ? ELSE ? END) ELSE value END))
        FROM json_each(COALESCE((SELECT doc FROM frozen WHERE id=spreads.id AND source=spreads.doc),spreads.doc),'$.elements')))),
      revision=revision+1,updated_at=? WHERE album_id=? AND ${guard}`)
      .bind(JSON.stringify(frozen),cover.paper,page.paper,JSON.stringify(cover.surfaces),JSON.stringify(page.surfaces),change.designId,coverInk,pageInk,now,album.id,album.id,change.updatedAt,album.id,now),
    db.prepare(`UPDATE albums SET title=?,description=?,design_id=?,visibility=?,updated_at=? WHERE id=? AND ${guard} RETURNING id`)
      .bind(change.title,change.description,change.designId,change.visibility,now,album.id,album.id,change.updatedAt,album.id,now),
  ]);
  return !!results[1].results.length;
}
