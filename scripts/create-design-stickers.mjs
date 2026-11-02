import {writeFile} from 'node:fs/promises';
const data=[];
async function asset(id,name,body,width=180,height=150,packId='objects'){
  await writeFile(`public/stickers/${id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${body}</svg>`);
  data.push({id,name,src:`/stickers/${id}.svg`,width,height,packId});
}
for(const [i,id,name,color] of [[0,'tape-check','Ekose bant','#9bafc4'],[1,'tape-stripe','Çizgili bant','#c7a389'],[2,'tape-grid','Kareli bant','#9dac91'],[3,'tape-dots','Noktalı bant','#c8b5cb'],[4,'tape-ripped','Yırtık bant','#e8d8b6'],[5,'tape-clear','Şeffaf bant','#b8c9d5']]){
  let pattern='';if(i===0)pattern='<path d="M20 0v60m40-60v60m40-60v60m40-60v60m40-60v60m40-60v60M0 10h240M0 40h240" stroke="#fff" stroke-width="13" opacity=".4"/>';
  if(i===1)pattern=Array.from({length:12},(_,n)=>`<path d="M${n*24-30} 60l60-60" stroke="#fff" stroke-width="8" opacity=".4"/>`).join('');
  if(i===2)pattern='<path d="M20 0v60m30-60v60m30-60v60m30-60v60m30-60v60m30-60v60m30-60v60M0 20h240M0 40h240" stroke="#fff" opacity=".6"/>';
  if(i===3)pattern=Array.from({length:21},(_,n)=>`<circle cx="${12+n%7*35}" cy="${10+Math.floor(n/7)*20}" r="3" fill="#fff" opacity=".6"/>`).join('');
  await asset(id,name,`<defs><clipPath id="p"><path d="M7 3L15 6 29 2 49 5 66 2 92 5 117 2 144 5 173 2 200 5 234 2 229 12 236 22 230 32 235 43 228 57 206 54 182 58 154 54 128 58 98 54 70 58 41 55 6 58 11 45 5 34 11 23 4 13Z"/></clipPath></defs><g clip-path="url(#p)"><path fill="${color}" d="M0 0h240v60H0z"/>${pattern}</g>`,240,60,'paper');
}
await asset('paper-torn','Yırtık kâğıt','<path d="M7 6L33 3 62 7 97 3 132 6 174 3 172 30 176 60 172 92 176 122 171 146 143 143 111 147 80 143 48 147 6 144 9 115 4 87 8 57 4 30Z" fill="#faf6e9"/><path d="M10 8h158" stroke="#fff" opacity=".8"/>',180,150,'paper');
await asset('paper-grid','Kareli kâğıt','<path d="M4 4h172v142H4z" fill="#f2ecdb"/><path d="M20 4v142m20-142v142m20-142v142m20-142v142m20-142v142m20-142v142m20-142v142m20-142v142M4 25h172M4 45h172M4 65h172M4 85h172M4 105h172M4 125h172" stroke="#94a9b0" opacity=".45"/>',180,150,'paper');
await asset('paper-note','Not kâğıdı','<path d="M9 7h160v115l-23 23H9Z" fill="#e7dba9"/><path d="M146 145v-23h23" fill="#cabc87"/><path d="M30 39h115M30 61h115M30 83h90" stroke="#a49a72" opacity=".4"/>',180,150,'paper');
await asset('paper-ticket','Bilet','<path d="M8 25H172v30a20 20 0 0 0 0 40v30H8V95a20 20 0 0 0 0-40Z" fill="#c9d5de"/><path d="M125 30v90" stroke="#718497" stroke-dasharray="4 5"/><path d="M35 48h65M35 68h45M35 88h65M35 108h35" stroke="#7f93a3" stroke-width="2"/>',180,150,'paper');
await asset('paper-tab','Dosya etiketi','<path d="M8 45h60l12-22h57l11 22h24v97H8Z" fill="#c7d0b9"/><path d="M30 75h120M30 98h93" stroke="#81917d" opacity=".5"/>',180,150,'paper');
await asset('paper-label','Kesik etiket','<path d="M20 23h139l13 16v72l-13 16H20L7 111V39Z" fill="#eee5d5" stroke="#c3b39c"/><path d="M31 45h118v60H31z" stroke="#a7957c" stroke-dasharray="3 4"/>',180,150,'paper');
await asset('doodle-sun','Güneş','<g stroke="#cfad5b" stroke-width="5" stroke-linecap="round"><circle cx="90" cy="75" r="29" fill="#ead38b"/><path d="M90 9v17m0 98v17M24 75h17m98 0h17M43 28l12 12m70 70 12 12M43 122l12-12m70-70 12-12"/></g>',180,150,'drawing');
await asset('doodle-cloud','Bulut','<path d="M38 110a24 24 0 0 1-6-47 34 34 0 0 1 63-18 28 28 0 0 1 48 29 18 18 0 0 1-1 36Z" fill="#e3e9e8" stroke="#99afbc" stroke-width="3"/>',180,150,'drawing');
await asset('doodle-rainbow','Gökkuşağı','<path d="M25 118a65 65 0 0 1 130 0" stroke="#c48f7d" stroke-width="15"/><path d="M42 118a48 48 0 0 1 96 0" stroke="#d6bb7c" stroke-width="13"/><path d="M57 118a33 33 0 0 1 66 0" stroke="#93aa94" stroke-width="12"/>',180,150,'drawing');
await asset('doodle-flower','Çiçek','<path d="M91 83v57m0-21q-35-34-44-10 9 25 44 10" stroke="#80977b" stroke-width="5"/><g fill="#c3adbd" stroke="#a28f9b" stroke-width="2"><ellipse cx="90" cy="41" rx="17" ry="29"/><ellipse cx="62" cy="65" rx="29" ry="17"/><ellipse cx="117" cy="65" rx="29" ry="17"/><ellipse cx="90" cy="87" rx="17" ry="25"/></g><circle cx="90" cy="65" r="16" fill="#e9ce83"/>',180,150,'drawing');
await asset('doodle-leaf','Yaprak','<path d="M32 124Q13 23 148 20 161 126 32 124Z" fill="#a9b69a"/><path d="M23 139L136 32m-83 77-2-38m30 13 33 2" stroke="#667e68" stroke-width="4" stroke-linecap="round"/>',180,150,'drawing');
await asset('doodle-smile','Gülen yüz','<circle cx="90" cy="75" r="58" fill="#e9d798"/><path d="M61 85q29 38 58-1" stroke="#73705a" stroke-width="4" stroke-linecap="round"/><ellipse cx="65" cy="61" rx="4" ry="6" fill="#73705a"/><ellipse cx="115" cy="61" rx="4" ry="6" fill="#73705a"/>',180,150,'drawing');
await asset('object-camera','Fotoğraf makinesi','<path d="M16 43h38l9-14h45l9 14h47v85H16Z" fill="#8f9f9e" stroke="#586b6a" stroke-width="3"/><circle cx="91" cy="84" r="31" fill="#d7dace" stroke="#586b6a" stroke-width="5"/><circle cx="91" cy="84" r="18" fill="#6c8180"/><path d="M133 55h19v14h-19Z" fill="#e1d7ba"/>');
await asset('object-coffee','Kahve','<path d="M39 58h87v39q-1 31-44 31T39 97Z" fill="#c9b39a" stroke="#8d7664" stroke-width="3"/><path d="M127 65q43-5 20 34h-20M21 136h133M64 40q-12-14 1-27m25 27q-12-14 1-27" stroke="#8d7664" stroke-width="4" stroke-linecap="round"/>');
await asset('object-film','Film kutusu','<rect x="46" y="30" width="75" height="103" rx="10" fill="#d9bd70" stroke="#8a7a51" stroke-width="3"/><path d="M41 29h85v20H41z" fill="#56615d"/><path d="M61 69h46v39H61z" fill="#f3ead1"/><path d="M121 58h30v64h-30" fill="#5c6661"/><path d="M130 65v8m0 12v8m0 12v8" stroke="#ece4d0" stroke-width="4"/>');
await asset('object-moon','Ay','<path d="M116 16a58 58 0 1 0 42 88 60 60 0 0 1-42-88Z" fill="#ded4ac"/><path d="m145 30 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" fill="#c6b981"/>');
await asset('object-envelope','Zarf','<path d="M14 34h152v97H14Z" fill="#c6cdbb" stroke="#89977d" stroke-width="3"/><path d="m15 35 75 57 75-57M15 131l53-50m98 50-53-50" stroke="#89977d" stroke-width="3"/>');
await asset('object-matchbox','Kibrit kutusu','<path d="m43 23 92 12 11 100-92-12Z" fill="#ce9f8d" stroke="#98776c" stroke-width="3"/><path d="m55 38 65 8 7 68-65-8Z" fill="#ebe0c6"/><path d="m71 96 28-40" stroke="#a89670" stroke-width="5"/><ellipse cx="101" cy="54" rx="5" ry="8" transform="rotate(32 101 54)" fill="#ba8371"/>');
await writeFile('lib/stickers-extra.ts',`export const extraStickers = ${JSON.stringify(data,null,2)};\n`);
console.log(JSON.stringify({created:data.length}));
