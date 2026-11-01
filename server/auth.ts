import { scryptSync, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import type { User } from '../lib/model';
export type AlbumEnv = { DB: D1Database; BUCKET: R2Bucket; ALBUM_UMUT_HASH?: string; ALBUM_SUDE_HASH?: string; ALBUM_ALLOWED_ORIGINS?: string };
const COOKIE = 'album_session';
export const hashToken = (s: string) => createHash('sha256').update(s).digest('hex');
export function verifyPassword(password: string, stored?: string) {
  if (!stored || password.length > 256) return false;
  const [salt, value] = stored.split(':');
  if (!salt || !value || !/^[a-f\d]{128}$/.test(value)) return false;
  const actual = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(actual, Buffer.from(value, 'hex'));
}
export function cookieToken(req: Request) { return req.headers.get('cookie')?.split(';').map(p => p.trim()).find(p => p.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || ''; }
export function sessionToken(req: Request) { const authorization = req.headers.get('authorization'); return authorization ? authorization.replace(/^Bearer /, '') : cookieToken(req); }
export async function currentUser(req: Request, env: AlbumEnv): Promise<User | null> {
  const token = sessionToken(req); if (!/^[a-f\d]{64}$/.test(token)) return null;
  const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').bind(hashToken(token), Date.now()).first<{user_id:string}>();
  if (!row || !['umut','sude'].includes(row.user_id)) return null;
  return { id: row.user_id as User['id'], name: row.user_id === 'umut' ? 'Umut' : 'Sude', admin: row.user_id === 'umut' };
}
export async function createSession(req: Request, env: AlbumEnv, id: string) {
  const token = randomBytes(32).toString('hex');
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(hashToken(token),id,Date.now()+7*86400000).run();
  return { token, cookie: `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}` };
}
export const expiredCookie = (req: Request) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
