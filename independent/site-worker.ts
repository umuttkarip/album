import backend from './worker';
import type {AlbumEnv} from '../server/auth';
export default {
  async fetch(request:Request,env:AlbumEnv & {ASSETS:Fetcher}):Promise<Response> {
    if(new URL(request.url).pathname.startsWith('/api/'))return backend.fetch(request,env);
    const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Referrer-Policy','same-origin');
    headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    if(headers.get('Content-Type')?.includes('text/html')||new URL(request.url).pathname==='/version.json')headers.set('Cache-Control','no-store');
    return new Response(response.body,{status:response.status,headers});
  },
};
