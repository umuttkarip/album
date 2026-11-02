import {mkdir,writeFile} from 'node:fs/promises';
const folder='.local/redirect-public';
await mkdir(folder,{recursive:true});
await writeFile(folder+'/index.html',`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=https://album.umuttkarip.workers.dev/"><link rel="canonical" href="https://album.umuttkarip.workers.dev/"><title>Album</title></head><body><p><a href="https://album.umuttkarip.workers.dev/">Album’u aç</a></p></body></html>`);
console.log('GitHub Pages redirect prepared.');
