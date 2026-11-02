export class AsyncCache<T>{
  private entries=new Map<string,Promise<T>>();
  constructor(private limit:number){}
  get(key:string,create:()=>Promise<T>){const existing=this.entries.get(key);if(existing){this.entries.delete(key);this.entries.set(key,existing);return existing;}const value=create().catch(error=>{if(this.entries.get(key)===value)this.entries.delete(key);throw error;});this.entries.set(key,value);while(this.entries.size>this.limit)this.entries.delete(this.entries.keys().next().value!);return value;}
  clear(){this.entries.clear();}
  get size(){return this.entries.size;}
}
