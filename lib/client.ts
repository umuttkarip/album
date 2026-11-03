import type { Asset } from './model';
import { apiUrl, authHeaders, setSession } from './network';
import {imageMime} from './upload-files';
export class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url=apiUrl(path);
  let r:Response;try{r=await fetch(url, {...init,credentials:'same-origin',headers:{...authHeaders(),...(init.body ? {'Content-Type':'application/json'} : {}),...init.headers}});}catch{throw new RequestError('Bağlantı kurulamadı. İnternet bağlantını kontrol edip yeniden dene.',0);}
  const data: any = await r.json().catch(()=>({error:'Sunucudan yanıt alınamadı. Yeniden dene.'})); if (!r.ok) throw new RequestError(data.error || 'İşlem tamamlanamadı.',r.status); if(path==='auth/login'&&data.token)setSession(data.token);if(path==='auth/logout')setSession('');return data as T;
}
export const post = <T = any>(path: string, body: unknown = {}) => request<T>(path,{method:'POST',body:JSON.stringify(body)});
let processing: Promise<unknown> = Promise.resolve();
export async function preparePhoto(file: File) {
  const work = processing.then(async () => {
    const mime=await imageMime(file);
    let bitmap:ImageBitmap;
    try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('Fotoğraf açılamadı. Başka bir dosya seç.');}
    try {
      const make = async (size: number) => {
        const ratio=Math.min(1,size/Math.max(bitmap.width,bitmap.height)), c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*ratio));c.height=Math.max(1,Math.round(bitmap.height*ratio));c.getContext('2d')!.drawImage(bitmap,0,0,c.width,c.height);
        try{const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Fotoğraf işlenemedi.')),'image/webp',.9));if(blob.type!=='image/webp')throw new Error('Bu tarayıcı fotoğrafı hazırlayamadı. Güncel Chrome ile yeniden dene.');return blob;}finally{c.width=c.height=1;}
      };
      const display=await make(2560);
      return {width:bitmap.width,height:bitmap.height,mime,display,screen:Math.max(bitmap.width,bitmap.height)<=1280?display:await make(1280),thumb:await make(360)};
    } finally { bitmap.close(); }
  });
  processing=work.catch(()=>{});return work;
}
function uploadBlob(id: string, variant: string, blob: Blob, onProgress: (n:number)=>void, mime=blob.type) {
  return new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('PUT',apiUrl(`assets/${id}/${variant}`));xhr.setRequestHeader('Content-Type',mime);for(const [key,value] of Object.entries(authHeaders()))xhr.setRequestHeader(key,value);xhr.timeout=180000;
    xhr.upload.onprogress=e=>onProgress(e.loaded);xhr.onerror=()=>reject(new Error('Bağlantı kesildi. Yeniden deneyebilirsin.'));xhr.ontimeout=()=>reject(new Error('Yükleme zaman aşımına uğradı.'));
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300) resolve();else {let message='Fotoğraf yüklenemedi.';try{message=JSON.parse(xhr.responseText).error||message;}catch{}reject(new Error(message));}};xhr.send(blob);
  });
}
export type UploadJob = { file: File; id?: string; progress: number; state: 'waiting'|'working'|'done'|'error'; phase?:'preparing'|'uploading'|'finishing'; kind?:'photo'|'sticker'; error?: string; variants?: Awaited<ReturnType<typeof preparePhoto>>; uploaded?: string[]; capturedOn?:string };
export const uploadLabel=(job:UploadJob)=>job.state==='done'?'Yüklendi':job.state==='error'?'Yüklenemedi':job.state==='waiting'?'Sırada':job.phase==='preparing'?'Hazırlanıyor':job.phase==='finishing'?'Tamamlanıyor':`${Math.min(99,Math.round(job.progress*100))}%`;
export async function uploadJob(albumId: string, job: UploadJob, kind: 'photo'|'sticker', update: ()=>void) {
  try {
    kind=job.kind||kind;job.kind=kind;job.state='working';job.phase='preparing';job.error=undefined;update();
    if(job.id){
      const status=await request<{uploaded:number;ready:boolean}>(`assets/${job.id}/upload-status`);
      job.uploaded=([['original',1],['display',2],['thumb',4],['screen',8]] as const).filter(([,mask])=>status.uploaded&mask).map(([name])=>name);
      if(status.ready){job.state='done';job.progress=1;job.variants=undefined;update();return;}
    }
    const parts=job.variants || await preparePhoto(job.file);job.variants=parts;
    if(kind==='sticker'&&parts.mime==='image/jpeg')throw new Error('Çıkartma için PNG veya WebP seç.');
    if(!job.id) job.id=(await post(`albums/${albumId}/assets`,{kind,filename:job.file.name,mime:parts.mime,width:parts.width,height:parts.height,...(job.capturedOn?{capturedOn:job.capturedOn}:{})})).id;
    job.phase='uploading';update();
    const blobs: [string,Blob][]=[['original',job.file],['display',parts.display],['thumb',parts.thumb],...(parts.screen?[['screen',parts.screen] as [string,Blob]]:[])], total=blobs.reduce((s,[,b])=>s+b.size,0);let sent=0;
    for(const [variant,blob] of blobs) {if(!job.uploaded?.includes(variant)){await uploadBlob(job.id!,variant,blob,n=>{job.progress=(sent+n)/total;update();},variant==='original'?parts.mime:blob.type);job.uploaded=[...(job.uploaded||[]),variant];}sent+=blob.size;}
    job.phase='finishing';update();await post(`assets/${job.id}/complete`);job.state='done';job.progress=1;job.variants=undefined;update();
  }catch(e){job.state='error';job.error=e instanceof Error?e.message:'Yükleme tamamlanamadı.';update();}
}
export async function uploadJobs(albumId: string,jobs: UploadJob[],kind: 'photo'|'sticker', update:()=>void) {
  let index=0;await Promise.all([0,1].map(async()=>{while(index<jobs.length){const j=jobs[index++];if(j.state!=='done') await uploadJob(albumId,j,kind,update);}}));
}
export const draftKey=(userId:string,spreadId:string)=>`album:draft:${userId}:${spreadId}`;
export function localDraft(key:string,value?:unknown) {try {if(value!==undefined){localStorage.setItem(key,JSON.stringify(value));return null;}return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export const photoAssets = (assets: Asset[]) => assets.filter(a=>a.kind==='photo');
