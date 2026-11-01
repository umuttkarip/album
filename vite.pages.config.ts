import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: path.join(here, 'pages'),
  base: process.env.ALBUM_PUBLIC_BASE || '/album/',
  publicDir: path.join(here, 'public'),
  define: {
    __ALBUM_API_BASE__: JSON.stringify(process.env.ALBUM_API_BASE || ''),
    __ALBUM_PUBLIC_BASE__: JSON.stringify(process.env.ALBUM_PUBLIC_BASE || '/album/'),
    __ALBUM_STATIC__: 'true',
  },
  plugins: [
    { name: 'album-pages-fonts', enforce: 'pre', transform(code, id) { if (id.endsWith('/app/globals.css')) return code.replace("@import url('/fonts/fonts.css');", ''); } },
    react(),
  ],
  build: { outDir: path.join(here, 'web'), emptyOutDir: false, chunkSizeWarningLimit: 1600 },
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
