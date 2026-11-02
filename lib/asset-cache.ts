type Entry={promise:Promise<Blob>;controller:AbortController;users:number;blob?:Blob;settled:boolean};

/** Compressed private images, in this page's memory only. Originals never enter this cache. */
export class AssetCache {
  private entries=new Map<string,Entry>();
  private bytes=0;
  constructor(private limitBytes=24*1024*1024,private limitEntries=192){}
  get(key:string,load:(signal:AbortSignal)=>Promise<Blob>,signal?:AbortSignal):Promise<Blob>{
    if(signal?.aborted)return Promise.reject(signal.reason);
    let entry=this.entries.get(key);
    if(entry){this.entries.delete(key);this.entries.set(key,entry);}
    else{
      const created:Entry={controller:new AbortController(),users:0,settled:false,promise:null!};entry=created;
      created.promise=Promise.resolve().then(()=>load(created.controller.signal)).then(blob=>{
        created.controller.signal.throwIfAborted();created.settled=true;
        if(this.entries.get(key)===created){created.blob=blob;this.bytes+=blob.size;this.trim();}
        return blob;
      }).catch(error=>{created.settled=true;if(this.entries.get(key)===created)this.remove(key,created);throw error;});
      this.entries.set(key,created);
    }
    const active=entry;active.users++;
    return new Promise((resolve,reject)=>{
      let finished=false;
      const finish=(ok:boolean,value:unknown)=>{
        if(finished)return;finished=true;signal?.removeEventListener('abort',abort);active.users--;
        if(!active.settled&&active.users===0&&this.entries.get(key)===active){this.entries.delete(key);active.controller.abort();}
        if(ok)resolve(value as Blob);else reject(value);
      };
      const abort=()=>finish(false,signal!.reason||new DOMException('Aborted','AbortError'));
      signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted)abort();
      active.promise.then(blob=>finish(true,blob),error=>finish(false,error));
    });
  }
  private remove(key:string,entry:Entry){this.entries.delete(key);if(entry.blob)this.bytes-=entry.blob.size;}
  private trim(){for(const [key,entry]of this.entries){if(this.bytes<=this.limitBytes&&this.entries.size<=this.limitEntries)break;if(entry.settled)this.remove(key,entry);}}
  clear(){for(const entry of this.entries.values())if(!entry.settled)entry.controller.abort();this.entries.clear();this.bytes=0;}
  get byteLength(){return this.bytes;}
  get size(){return this.entries.size;}
}
