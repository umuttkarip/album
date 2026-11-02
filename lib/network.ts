import {AssetCache} from './asset-cache';
declare const __ALBUM_API_BASE__: string;
declare const __ALBUM_PUBLIC_BASE__: string;
declare const __ALBUM_STATIC__: boolean;

const backend = typeof __ALBUM_API_BASE__ === 'undefined' ? '' : __ALBUM_API_BASE__;
export const backendConfigured = typeof __ALBUM_STATIC__ === 'undefined' || !__ALBUM_STATIC__ || !!backend;
export const publicUrl = (path: string) => (typeof __ALBUM_PUBLIC_BASE__ === 'undefined' ? '/' : __ALBUM_PUBLIC_BASE__) + path.replace(/^\//, '');
export function apiUrl(path: string) {
  if (!backendConfigured) throw new Error('Sunucu bağlantısı henüz tamamlanmadı.');
  return backend.replace(/\/$/, '') + '/api/' + path.replace(/^\/?api\//, '').replace(/^\//, '');
}
const TOKEN_KEY = 'album:session';
const privateAssets=new AssetCache();
export const clearPrivateAssets=()=>privateAssets.clear();
// Only the legacy, explicitly separate API uses bearer auth. The canonical site uses HttpOnly cookies.
let token = '';
try { if (backend) token = globalThis.sessionStorage?.getItem(TOKEN_KEY) || ''; } catch {}
export function setSession(value: string) {
  if (!backend) return;
  if(token!==value)clearPrivateAssets();
  token = value;
  try { if (value) sessionStorage.setItem(TOKEN_KEY, value); else sessionStorage.removeItem(TOKEN_KEY); } catch {}
}
export function authHeaders(): Record<string, string> { return token ? { Authorization: 'Bearer ' + token } : {}; }
export function isPrivateAsset(src: string) { return /^(?:https?:\/\/[^/]+)?\/api\/assets\//.test(src); }
export async function fetchAsset(src: string, signal?: AbortSignal) {
  const load=async(requestSignal?:AbortSignal)=>{
    const response = await fetch(src, { headers: authHeaders(), credentials: 'same-origin', signal:requestSignal, cache: 'no-store' });
    if (!response.ok) {if(response.status===401)clearPrivateAssets();throw new Error(response.status === 401 ? 'Fotoğrafı görmek için yeniden giriş yap.' : 'Fotoğraf yüklenemedi.');}
    return response.blob();
  };
  return isPrivateAsset(src)&&/\/(thumb|screen|display)$/.test(src)?privateAssets.get(src,load,signal):load(signal);
}
export async function downloadAsset(id: string, filename: string) {
  const blob = await fetchAsset(apiUrl(`assets/${encodeURIComponent(id)}/original?download=1`));
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
