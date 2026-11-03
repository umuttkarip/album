import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = process.env.ALBUM_API_BASE || '';
const buildId=process.env.ALBUM_BUILD_ID||'development';
const sameOrigin = process.env.ALBUM_SAME_ORIGIN === '1';
if (sameOrigin && backend) throw new Error('A same-origin build must use relative API URLs.');
if (backend && (!/^https:\/\//.test(backend) && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(backend))) throw new Error('ALBUM_API_BASE must be an HTTPS origin or loopback development URL.');
if (/chatgpt\.site/i.test(backend)) throw new Error('Album must use its own independent server.');
export default defineConfig({
  root: path.join(here, 'pages'),
  base: process.env.ALBUM_PUBLIC_BASE || '/album/',
  publicDir: path.join(here, 'public'),
  define: {
    __ALBUM_BUILD_ID__: JSON.stringify(buildId),
    __ALBUM_API_BASE__: JSON.stringify(backend),
    __ALBUM_PUBLIC_BASE__: JSON.stringify(process.env.ALBUM_PUBLIC_BASE || '/album/'),
    __ALBUM_STATIC__: sameOrigin ? 'false' : 'true',
  },
  plugins: [
    {name:'album-release',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({id:buildId})});}},
    { name: 'album-pages-fonts', enforce: 'pre', transform(code, id) { if (id.endsWith('/app/globals.css')) return code.replace("@import url('/fonts/fonts.css');", ''); } },
    react(),
  ],
  build: { outDir: path.join(here, 'web'), emptyOutDir: false, chunkSizeWarningLimit: 1600 },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
