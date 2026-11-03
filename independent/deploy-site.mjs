import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {readdir,cp,readFile} from 'node:fs/promises';
const out=path.join('.local','site-build-'+Date.now());
const previous=(await readdir('.local',{withFileTypes:true}).catch(()=>[])).filter(e=>e.isDirectory()&&/^site-build-\d+$/.test(e.name)).map(e=>e.name).sort().reverse().slice(0,2);
function run(args,env=process.env){const result=spawnSync(process.execPath,args,{stdio:'inherit',env});if(result.status!==0)process.exit(result.status||1);}
run(['node_modules/vite/bin/vite.js','build','--config','vite.pages.config.ts','--outDir',path.resolve(out)],{...process.env,ALBUM_API_BASE:'',ALBUM_PUBLIC_BASE:'/',ALBUM_SAME_ORIGIN:'1',ALBUM_BUILD_ID:path.basename(out)});
// Keep recent immutable chunks available to already-open phone tabs. No files are removed.
for(const name of previous){
  const dir=path.join('.local',name);let files;
  try{const manifest=JSON.parse(await readFile(path.join(dir,'.vite','manifest.json'),'utf8'));files=[...new Set(Object.values(manifest).flatMap(e=>[e.file,...(e.css||[]),...(e.assets||[])]))];}
  catch{files=(await readdir(path.join(dir,'assets')).catch(()=>[])).map(f=>'assets/'+f);}
  for(const file of files.filter(f=>/^assets\/[^/]+\.(js|css)$/.test(f)))await cp(path.join(dir,file),path.join(out,file),{force:false}).catch(e=>{if(e.code!=='ENOENT')throw e;});
}
run(['independent/probe-build.mjs'],{...process.env,ALBUM_PUBLIC_BASE:'/',ALBUM_BUILD_DIR:out});
run(['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.site.jsonc','--assets',out]);
