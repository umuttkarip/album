import { api } from '../server/api';
import type { AlbumEnv } from '../server/auth';

export default {
  async fetch(request: Request, env: AlbumEnv): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALBUM_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const sameOrigin = origin === new URL(request.url).origin;
    if (origin && !sameOrigin && !allowed.includes(origin)) return new Response('Forbidden', { status: 403 });
    const cors: Record<string, string> = origin && !sameOrigin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin',
    } : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!new URL(request.url).pathname.startsWith('/api/')) return new Response('Album API', { headers: { 'Cache-Control': 'no-store' } });
    const response = await api(request, env);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    return new Response(response.body, { status: response.status, headers });
  },
};
