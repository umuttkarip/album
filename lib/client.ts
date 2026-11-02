import type { Asset } from './model';
import { apiUrl, authHeaders, setSession } from './network';
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
    if (file.size > 30*1024*1024) throw new Error('En fazla 30 MB yüklenebilir.');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('JPEG, PNG veya WebP seç.');
    const bitmap = await createImageBitmap(file,{imageOrientation:'from-image'});
    try {
      const make = async (size: number) => {
        const ratio=Math.min(1,size/Math.max(bitmap.width,bitmap.height)), c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*ratio));c.height=Math.max(1,Math.round(bitmap.height*ratio));c.getContext('2d')!.drawImage(bitmap,0,0,c.width,c.height);
        const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Fotoğraf işlenemedi.')),'image/webp',.9));c.width=c.height=1;return blob;
      };
      const display=await make(2560);
      return {width:bitmap.width,height:bitmap.height,display,screen:Math.max(bitmap.width,bitmap.height)<=1280?display:await make(1280),thumb:await make(360)};
    } finally { bitmap.close(); }
  });
  processing=work.catch(()=>{});return work;
}
function uploadBlob(id: string, variant: string, blob: Blob, onProgress: (n:number)=>void) {
  return new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('PUT',apiUrl(`assets/${id}/${variant}`));xhr.setRequestHeader('Content-Type',blob.type);for(const [key,value] of Object.entries(authHeaders()))xhr.setRequestHeader(key,value);xhr.timeout=180000;
    xhr.upload.onprogress=e=>onProgress(e.loaded);xhr.onerror=()=>reject(new Error('Bağlantı kesildi. Yeniden deneyebilirsin.'));xhr.ontimeout=()=>reject(new Error('Yükleme zaman aşımına uğradı.'));
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300) resolve();else {let message='Fotoğraf yüklenemedi.';try{message=JSON.parse(xhr.responseText).error||message;}catch{}reject(new Error(message));}};xhr.send(blob);
  });
}
export type UploadJob = { file: File; id?: string; progress: number; state: 'waiting'|'working'|'done'|'error'; error?: string; variants?: Awaited<ReturnType<typeof preparePhoto>>; uploaded?: string[]; capturedOn?:string };
export async function uploadJob(albumId: string, job: UploadJob, kind: 'photo'|'sticker', update: ()=>void) {
  try {
    job.state='working';job.error=undefined;update();
    const parts=job.variants || await preparePhoto(job.file);job.variants=parts;
    if(!job.id) job.id=(await post(`albums/${albumId}/assets`,{kind,filename:job.file.name,mime:job.file.type,width:parts.width,height:parts.height,...(job.capturedOn?{capturedOn:job.capturedOn}:{})})).id;
    const blobs: [string,Blob][]=[['original',job.file],['display',parts.display],['thumb',parts.thumb],...(parts.screen?[['screen',parts.screen] as [string,Blob]]:[])], total=blobs.reduce((s,[,b])=>s+b.size,0);let sent=0;
    for(const [variant,blob] of blobs) {if(!job.uploaded?.includes(variant)){await uploadBlob(job.id!,variant,blob,n=>{job.progress=(sent+n)/total;update();});job.uploaded=[...(job.uploaded||[]),variant];}sent+=blob.size;}
    await post(`assets/${job.id}/complete`);job.state='done';job.progress=1;job.variants=undefined;update();
  }catch(e){job.state='error';job.error=e instanceof Error?e.message:'Yükleme tamamlanamadı.';update();}
}
export async function uploadJobs(albumId: string,jobs: UploadJob[],kind: 'photo'|'sticker', update:()=>void) {
  let index=0;await Promise.all([0,1].map(async()=>{while(index<jobs.length){const j=jobs[index++];if(j.state!=='done') await uploadJob(albumId,j,kind,update);}}));
}
export const draftKey=(userId:string,spreadId:string)=>`album:draft:${userId}:${spreadId}`;
export function localDraft(key:string,value?:unknown) {try {if(value!==undefined){localStorage.setItem(key,JSON.stringify(value));return null;}return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export const photoAssets = (assets: Asset[]) => assets.filter(a=>a.kind==='photo');
