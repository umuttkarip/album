import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.ALBUM_PUBLIC_BASE||'/album/';
const html=await readFile('web/index.html','utf8');
const links=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"|<link[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g)].map(m=>m[1]||m[2]);
assert.ok(links.some(url=>url.includes('/fonts/fonts.css')),'Local fonts must be linked');
for(const url of links){const pathname=new URL(url,'https://example.test').pathname;assert.ok(pathname.startsWith(base),'Stylesheet outside the site base');const file='web/'+pathname.slice(base.length);await readFile(file);}
const css=await readFile('web/fonts/fonts.css','utf8');
for(const match of css.matchAll(/url\(\.\/([^\)]+)\)/g)){const data=await readFile('web/fonts/'+match[1]);assert.equal(data.subarray(0,4).toString(),'wOF2','Expected a real WOFF2 font');}
assert.ok(!html.includes(base+'album/'),'Site base must not be doubled');
console.log('Built stylesheets and all local WOFF2 files resolve under the site base.');
