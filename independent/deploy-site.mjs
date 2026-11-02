import {spawnSync} from 'node:child_process';
import path from 'node:path';
const out=path.join('.local','site-build-'+Date.now());
function run(args,env=process.env){const result=spawnSync(process.execPath,args,{stdio:'inherit',env});if(result.status!==0)process.exit(result.status||1);}
run(['node_modules/vite/bin/vite.js','build','--config','vite.pages.config.ts','--outDir',path.resolve(out)],{...process.env,ALBUM_API_BASE:'',ALBUM_PUBLIC_BASE:'/',ALBUM_SAME_ORIGIN:'1'});
run(['independent/probe-build.mjs'],{...process.env,ALBUM_PUBLIC_BASE:'/',ALBUM_BUILD_DIR:out});
run(['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.site.jsonc','--assets',out]);
