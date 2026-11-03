import {randomBytes,scryptSync} from 'node:crypto';
import type {AlbumEnv} from './auth';
import type {User} from '../lib/model';

export type Credential={password_hash:string;password_encrypted:string;updated_at:number};
export const credential=(env:AlbumEnv)=>env.DB.prepare("SELECT password_hash,password_encrypted,updated_at FROM user_credentials WHERE user_id='sude'").first<Credential>();
export async function accountUser(user:User,_env:AlbumEnv):Promise<User>{return {...user,passwordChangeRequired:false};}
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');}
async function key(value?:string){
  if(!value||!/^([A-Za-z0-9+/]{43}=)$/.test(value))throw Error('Password encryption key unavailable');
  const bytes=Buffer.from(value,'base64');if(bytes.length!==32)throw Error('Password encryption key unavailable');
  return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const aad=new TextEncoder().encode('album:password:sude:v1');
export async function encryptPassword(password:string,secret?:string){
  const k=await key(secret),iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},k,new TextEncoder().encode(password));
  return 'v1:'+Buffer.from(iv).toString('base64')+':'+Buffer.from(encrypted).toString('base64');
}
// Server maintenance only. No HTTP endpoint returns the saved password.
export async function decryptPassword(value:string,secret:string){
  const [version,iv,data]=value.split(':');if(version!=='v1'||!iv||!data)throw Error('Invalid encrypted password');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(iv,'base64'),additionalData:aad},await key(secret),Buffer.from(data,'base64'));
  return new TextDecoder().decode(plain);
}
