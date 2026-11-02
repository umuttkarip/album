import { publicUrl } from './network';
import { extraStickers } from './stickers-extra';
export interface StickerSpec { id: string; name: string; src: string; width: number; height: number; packId?:string }
export const stickerPacks=[{id:'paper',name:'Kâğıt ve bant'},{id:'drawing',name:'Çizimler'},{id:'objects',name:'Nesneler'},{id:'supplied',name:'Gönderdiklerin'},{id:'uploaded',name:'Yüklediklerin'}];

export const stickers: StickerSpec[] = [
  {
    "id": "tape-oat",
    "name": "Kâğıt bant",
    "src": "/stickers/tape-oat.svg",
    "width": 240,
    "height": 52
  },
  {
    "id": "tape-sage",
    "name": "Adaçayı bant",
    "src": "/stickers/tape-sage.svg",
    "width": 240,
    "height": 52
  },
  {
    "id": "tape-blue",
    "name": "Mavi bant",
    "src": "/stickers/tape-blue.svg",
    "width": 240,
    "height": 52
  },
  {
    "id": "tape-rust",
    "name": "Kil rengi bant",
    "src": "/stickers/tape-rust.svg",
    "width": 240,
    "height": 52
  },
  {
    "id": "label-rounded",
    "name": "Kâğıt etiket",
    "src": "/stickers/label-rounded.svg",
    "width": 220,
    "height": 106
  },
  {
    "id": "label-index",
    "name": "Fiş etiketi",
    "src": "/stickers/label-index.svg",
    "width": 220,
    "height": 104
  },
  {
    "id": "label-dark",
    "name": "Koyu etiket",
    "src": "/stickers/label-dark.svg",
    "width": 220,
    "height": 104
  },
  {
    "id": "luggage-tag",
    "name": "Bagaj etiketi",
    "src": "/stickers/luggage-tag.svg",
    "width": 220,
    "height": 116
  },
  {
    "id": "arrow-sweep",
    "name": "Kavisli ok",
    "src": "/stickers/arrow-sweep.svg",
    "width": 210,
    "height": 124
  },
  {
    "id": "arrow-straight",
    "name": "İnce ok",
    "src": "/stickers/arrow-straight.svg",
    "width": 210,
    "height": 72
  },
  {
    "id": "arrow-return",
    "name": "Dönüş oku",
    "src": "/stickers/arrow-return.svg",
    "width": 164,
    "height": 132
  },
  {
    "id": "marker-oval",
    "name": "Kalem çemberi",
    "src": "/stickers/marker-oval.svg",
    "width": 190,
    "height": 130
  },
  {
    "id": "star-four",
    "name": "Dört uçlu yıldız",
    "src": "/stickers/star-four.svg",
    "width": 124,
    "height": 124
  },
  {
    "id": "star-five",
    "name": "Beş uçlu yıldız",
    "src": "/stickers/star-five.svg",
    "width": 128,
    "height": 124
  },
  {
    "id": "spark-pair",
    "name": "Küçük parıltılar",
    "src": "/stickers/spark-pair.svg",
    "width": 150,
    "height": 132
  },
  {
    "id": "asterisk",
    "name": "Kalem yıldızı",
    "src": "/stickers/asterisk.svg",
    "width": 122,
    "height": 122
  },
  {
    "id": "stamp-frame",
    "name": "Pul çerçevesi",
    "src": "/stickers/stamp-frame.svg",
    "width": 150,
    "height": 184
  },
  {
    "id": "stamp-sun",
    "name": "Güneş pulu",
    "src": "/stickers/stamp-sun.svg",
    "width": 154,
    "height": 180
  },
  {
    "id": "stamp-airmail",
    "name": "Hava postası",
    "src": "/stickers/stamp-airmail.svg",
    "width": 224,
    "height": 142
  },
  {
    "id": "stamp-round",
    "name": "Yuvarlak damga",
    "src": "/stickers/stamp-round.svg",
    "width": 154,
    "height": 154
  },
  {
    "id": "film-strip",
    "name": "Film şeridi",
    "src": "/stickers/film-strip.svg",
    "width": 234,
    "height": 126
  },
  {
    "id": "photo-corners",
    "name": "Fotoğraf köşeleri",
    "src": "/stickers/photo-corners.svg",
    "width": 192,
    "height": 150
  },
  {
    "id": "postmark",
    "name": "Posta izi",
    "src": "/stickers/postmark.svg",
    "width": 244,
    "height": 128
  },
  {
    "id": "wave-line",
    "name": "Dalgalı çizgi",
    "src": "/stickers/wave-line.svg",
    "width": 230,
    "height": 66
  }
];

for(const s of stickers)s.packId=/tape|label|tag|film|corners/.test(s.id)?'paper':/arrow|marker|star|spark|asterisk|wave/.test(s.id)?'drawing':'objects';
stickers.push(...extraStickers);
for(const [id,name,w,h] of [['crying-cat','Ağlayan kedi',220,153],['thumb-cat','Başparmak kedi',210,196],['tiny-cat','Minik kedi',150,164],['shy-character','Çekingen karakter',180,180],['lollipop-character','Şekerli karakter',180,180]] as const)stickers.push({id:'supplied-'+id,name,src:'/stickers/supplied/'+id+'.png',width:w,height:h,packId:'supplied'});
for(const sticker of stickers)sticker.src=publicUrl(sticker.src);
export const STICKERS = stickers;
