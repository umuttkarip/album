import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotFiles,imageMime,isFileDrag} from '../lib/upload-files';
import {preparePhoto,uploadJobs,type UploadJob} from '../lib/client';

const jpeg=new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0]);
test('selected and dropped files survive input reset and the end of the drop event',async()=>{
 const file=new File([jpeg],'photo.jpg'),live:{length:number;[n:number]:File}={0:file,length:1};
 const selected=snapshotFiles(live);delete live[0];live.length=0;await Promise.resolve();
 assert.deepEqual(selected,[file]);assert.equal(await imageMime(selected[0]),'image/jpeg');
 assert.equal(isFileDrag({types:['Files']}),true);assert.equal(isFileDrag({types:['text/uri-list']}),false);
});
test('file content identifies dropped images with an empty or misleading OS MIME type',async()=>{
 assert.equal(await imageMime(new File([jpeg],'photo.jpg',{type:''})),'image/jpeg');
 assert.equal(await imageMime(new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'photo',{type:'application/octet-stream'})),'image/png');
 await assert.rejects(imageMime(new File(['text'],'fake.jpg',{type:'image/jpeg'})),/JPEG/);
 await assert.rejects(imageMime(new Blob()),/boş/);
 await assert.rejects(imageMime(new Blob([new Uint8Array(30*1024*1024+1)])),/30 MB/);
});
test('browser pipeline preserves originals, bounds both processing and transfers, and resumes failed copies',async()=>{
 const native={fetch:globalThis.fetch,document:globalThis.document,createImageBitmap:globalThis.createImageBitmap,XMLHttpRequest:globalThis.XMLHttpRequest};
 let decoding=0,maxDecoding=0,activeUploads=0,maxUploads=0,closed=0,sequence=0,fail=true,lostScreen=true;
 const transfers:{id:string;variant:string;blob:Blob}[]=[],metadata:any[]=[],finished:string[]=[],sizes:number[][]=[],stored=new Map<string,number>();
 globalThis.createImageBitmap=(async()=>{maxDecoding=Math.max(maxDecoding,++decoding);await new Promise(r=>setTimeout(r,2));return {width:4000,height:3000,close(){decoding--;closed++;}};}) as any;
 globalThis.document={createElement:()=>{const c={width:0,height:0,getContext:()=>({drawImage(){}}),toBlob(callback:(b:Blob)=>void,type:string){sizes.push([c.width,c.height]);callback(new Blob(['RIFF0000WEBP'],{type}));}};return c;}} as any;
 globalThis.fetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{const path=String(url);if(path.endsWith('/assets')){const body=JSON.parse(init!.body as string);metadata.push(body);return Response.json({id:'test-'+(++sequence)});}if(path.endsWith('/upload-status')){const id=path.split('/').at(-2)!;return Response.json({uploaded:stored.get(id)||0,ready:false});}assert.match(path,/\/complete$/);finished.push(path);return Response.json({ok:true});}) as any;
 globalThis.XMLHttpRequest=class{
   path='';status=200;responseText='';upload={onprogress:null as any};onload:any;onerror:any;ontimeout:any;
   open(_method:string,path:string){this.path=path;}setRequestHeader(){}send(blob:Blob){const [,id,variant]=this.path.match(/assets\/([^/]+)\/([^/]+)$/)!;transfers.push({id,variant,blob});maxUploads=Math.max(maxUploads,++activeUploads);setTimeout(()=>{activeUploads--;if(id==='test-1'&&variant==='thumb'&&fail){fail=false;this.onerror();}else {stored.set(id,(stored.get(id)||0)|({original:1,display:2,thumb:4,screen:8}[variant]||0));if(id==='test-2'&&variant==='screen'&&lostScreen){lostScreen=false;this.onerror();}else {this.upload.onprogress?.({loaded:blob.size});this.onload();}}},4);}
 } as any;
 try{
   const jobs:UploadJob[]=Array.from({length:4},(_,i)=>({file:new File([jpeg],`photo-${i}.jpg`,{type:''}),progress:0,state:'waiting'}));
   await uploadJobs('album',jobs,'photo',()=>{});
   assert.equal(maxDecoding,1);assert.equal(maxUploads,2);assert.equal(closed,4);assert.equal(jobs.filter(j=>j.state==='done').length,2);assert.equal(jobs[0].state,'error');
   assert.equal(finished.length,2);assert.ok(metadata.every(m=>m.mime==='image/jpeg'&&m.width===4000&&m.height===3000));
   assert.deepEqual(sizes,Array.from({length:4},()=>[[2560,1920],[1280,960],[360,270]]).flat());
   assert.ok(transfers.filter(t=>t.variant==='original').every(t=>jobs.some(j=>j.file===t.blob)));
   await uploadJobs('album',jobs,'photo',()=>{});assert.ok(jobs.every(j=>j.state==='done'));assert.equal(finished.length,4);
   assert.equal(transfers.filter(t=>t.id==='test-1'&&t.variant==='original').length,1);assert.equal(transfers.filter(t=>t.id==='test-1'&&t.variant==='display').length,1);assert.equal(transfers.filter(t=>t.id==='test-1'&&t.variant==='thumb').length,2);
   assert.equal(transfers.filter(t=>t.id==='test-2'&&t.variant==='screen').length,1);assert.ok(jobs.every(j=>!j.variants));
 }finally{Object.assign(globalThis,native);}
});
