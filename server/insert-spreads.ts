import type {PageDoc} from '../lib/model';

/** Insert complete compositions atomically; an active editor or stale album cancels the batch. */
export async function insertSpreads(db:D1Database,albumId:string,updatedAt:number,position:number,docs:PageDoc[]) {
  const now=Date.now(),ids=docs.map(()=>crypto.randomUUID());
  const guard='EXISTS(SELECT 1 FROM albums WHERE id=? AND updated_at=? AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM spreads WHERE album_id=? AND position>=? AND lock_expires>?)';
  const values=[albumId,updatedAt,albumId,position,now];
  const statements=[
    db.prepare(`UPDATE spreads SET position=position+?,revision=revision+1,updated_at=? WHERE album_id=? AND position>=? AND ${guard}`).bind(docs.length,now,albumId,position,...values),
    ...docs.map((doc,i)=>db.prepare(`INSERT INTO spreads(id,album_id,position,doc,updated_at) SELECT ?,?,?,?,? WHERE ${guard}`).bind(ids[i],albumId,position+i,JSON.stringify(doc),now,...values)),
    db.prepare(`UPDATE albums SET updated_at=? WHERE id=? AND ${guard} RETURNING id`).bind(Math.max(now,updatedAt+1),albumId,...values),
  ];
  const result=await db.batch(statements);
  return result.at(-1)!.results.length ? ids : null;
}
