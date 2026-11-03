export type TourStep='invite'|'sections'|'shared'|'personal'|'open-album'|'browse'|'view-mode'|'wide'|'edit'|'tools'|'editor-back'|'library-back'|'days'|'calendar'|'open-day'|'upload'|'close-day'|'private'|'new-album'|'create';
export type TourState={step:TourStep;albumId:string|null;visited:string[];book:boolean};
export type TourRead={pages:string[];book:boolean};
export type TourEvent={type:'start';albumId:string|null}|{type:'next'}|{type:'album-opened';id:string}|({type:'read'}&TourRead)|{type:'edit'}|{type:'editor-back'}|{type:'library-back'}|{type:'days'}|{type:'day-opened';day:string}|{type:'day-closed'}|{type:'filter';value:string}|{type:'new-album'}|{type:'create-closed'}|{type:'created'};
export const TOUR_DAY='2026-10-03';
export const startTour=(albumId:string|null,invite=false):TourState=>({step:invite?'invite':'sections',albumId,visited:[],book:false});
const nextSteps:Partial<Record<TourStep,TourStep>>={sections:'shared',shared:'personal',personal:'open-album',wide:'edit',tools:'editor-back',calendar:'open-day',upload:'close-day'};
export function advanceTour(state:TourState|null,event:TourEvent):TourState|null {
  if(!state)return state;
  const go=(step:TourStep)=>({...state,step});
  switch(event.type){
    case 'start':return startTour(event.albumId);
    case 'next':{if(state.step==='create')return null;const next=nextSteps[state.step];return next?go(next==='open-album'&&!state.albumId?'private':next):state;}
    case 'album-opened':return state.step==='open-album'&&event.id===state.albumId?{...go('browse'),visited:[]}:state;
    case 'read':{
      if(state.step==='browse'){const visited=[...new Set([...state.visited,...event.pages])];return {...state,visited,book:event.book,step:visited.length>=4?(event.book?'wide':'view-mode'):'browse'};}
      if(state.step==='view-mode'&&event.book)return {...go('wide'),book:true};return state;
    }
    case 'edit':return state.step==='edit'?go('tools'):state;
    case 'editor-back':return state.step==='editor-back'||state.step==='tools'?go('library-back'):state;
    case 'library-back':return state.step==='library-back'?go('days'):state;
    case 'days':return state.step==='days'?go('calendar'):state;
    case 'day-opened':return state.step==='open-day'&&event.day===TOUR_DAY?go('upload'):state;
    case 'day-closed':return state.step==='close-day'||state.step==='upload'?go('private'):state;
    case 'filter':return state.step==='private'&&event.value==='personal'?go('new-album'):state;
    case 'new-album':return state.step==='new-album'?go('create'):state;
    case 'create-closed':return state.step==='create'?go('new-album'):state;
    case 'created':return state.step==='create'?null:state;
  }
}
export const tourContext=(step:TourStep)=>['sections','shared','personal','open-album','days','private','new-album','create'].includes(step)?'library':['browse','view-mode','wide','edit','library-back'].includes(step)?'reader':['tools','editor-back'].includes(step)?'editor':['calendar','open-day','upload','close-day'].includes(step)?'days':null;
export const tourFilter=(step:TourStep)=>['personal','new-album','create'].includes(step)?'personal':['sections','shared','open-album','days','private'].includes(step)?'shared':null;
export type TourDescription={title:string;text:string;target:string;chapter:string;next?:string;action?:string};
export function describeTour(state:TourState):TourDescription {
  const target=(id:string)=>`[data-tour="${id}"]`;
  const steps:Record<TourStep,TourDescription>={
    invite:{title:'Siteyi birlikte gezelim mi?',text:'Albümleri açıp sayfaları gezeceğiz; ardından düzenleme ve Günler’e bakacağız.',target:'',chapter:'Kısa kullanım',next:'Göster'},
    sections:{title:'Albümler ve Günler',text:'Albümler, sayfalarını düzenleyebildiğin defterler. Günler’de fotoğraflara tarihe göre bakarsın.',target:target('sections'),chapter:'1 / 5 · Ana sayfa',next:'İleri'},
    shared:{title:'Ortak albümler',text:'Buradaki albümlere ikiniz de fotoğraf ekleyip sayfaları düzenleyebilirsiniz.',target:target('filter-shared'),chapter:'1 / 5 · Ana sayfa',next:'İleri'},
    personal:{title:'Özel albümler',text:'Kendi albümlerini burada bulursun. Fotoğraflarını ve sayfalarını yalnızca sen düzenlersin.',target:target('filter-personal'),chapter:'1 / 5 · Ana sayfa',next:'Bir albüme bakalım'},
    'open-album':{title:'Albümü aç',text:'İşaretli kapağa dokun. Sonraki adım albüm açıldığında gelecek.',target:target('album')+`[data-album-id="${state.albumId}"]`,chapter:'2 / 5 · Albüm',action:'Albüm kapağına dokun'},
    browse:{title:'Birkaç sayfa gez',text:'Okla ilerle veya sayfayı kaydır. Dört sayfa gezdikten sonra görünüm düğmesine bakacağız.',target:target('reader-next'),chapter:'2 / 5 · Albüm',action:`Gezilen sayfa: ${Math.min(4,state.visited.length)} / 4`},
    'view-mode':{title:'İki sayfayı birlikte gör',text:'İşaretli düğmeye dokunarak açık deftere geç.',target:target('reader-mode'),chapter:'2 / 5 · Albüm',action:'Açık defter düğmesine dokun'},
    wide:{title:'Açık defter',text:'İki sayfa birlikte görünüyor. Telefonda daha büyük görmek için ekranı yan tutabilirsin; yatayda bu görünüm otomatik açılır.',target:target('reader-mode'),chapter:'2 / 5 · Albüm',next:'Düzenlemeye bakalım'},
    edit:{title:'Düzenle’yi aç',text:'Sayfalara fotoğraf, metin ve çıkartma eklemek için işaretli düğmeye dokun.',target:target('reader-edit'),chapter:'3 / 5 · Düzenleme',action:'Düzenle’ye dokun'},
    tools:{title:'Sayfa araçları',text:'Metin, çıkartma ve şekiller ekleyebilirsin. Çizim araçları Diğer’de. Değişiklikler otomatik kaydedilir; şimdi bir şey eklemek zorunda değilsin.',target:target('editor-tools')+'[data-tour-ready="true"]',chapter:'3 / 5 · Düzenleme',next:'Geri dönelim'},
    'editor-back':{title:'Albüme dön',text:'Sol üstteki geri düğmesine dokunarak düzenlemeden çık.',target:target('editor-back'),chapter:'3 / 5 · Düzenleme',action:'İşaretli geri düğmesine dokun'},
    'library-back':{title:'Ana sayfaya dön',text:'Bir kez daha geri dön. Bu kez Günler bölümünü açacağız.',target:target('reader-back'),chapter:'3 / 5 · Düzenleme',action:'Albümlere geri dön'},
    days:{title:'Günler’i aç',text:'Üstteki Günler düğmesine dokun.',target:target('nav-days'),chapter:'4 / 5 · Günler',action:'Günler’e dokun'},
    calendar:{title:'Fotoğraflar tarihe göre',text:'Geçmiş günlerin fotoğrafları burada. İstediğin tarihe, aynı gün için de birden fazla fotoğraf ekleyebilirsin. Ekleyen kişi fotoğrafta görünür.',target:target('calendar'),chapter:'4 / 5 · Günler',next:'Bir günü açalım'},
    'open-day':{title:'3 Ekim Cumartesi’yi aç',text:'İşaretli güne dokunarak o tarihin fotoğraflarını aç.',target:target('day-'+TOUR_DAY),chapter:'4 / 5 · Günler',action:'3 Ekim’e dokun'},
    upload:{title:'Bu güne fotoğraf ekleme',text:'Fotoğraf ekle ile bu tarihe yeni fotoğraflar yükleyebilirsin. Tarihi değiştirerek geçmiş veya sonraki bir günü de seçebilirsin.',target:target('day-upload'),chapter:'4 / 5 · Günler',next:'Anladım'},
    'close-day':{title:'Günü kapat',text:'Sağ üstteki kapat düğmesine dokun. Son olarak kendi albümünü oluşturmaya bakalım.',target:target('day-close'),chapter:'4 / 5 · Günler',action:'Günü kapat'},
    private:{title:'Kendi albümüne başla',text:'Ana sayfadaki Özel bölümünü aç.',target:target('filter-personal'),chapter:'5 / 5 · Yeni albüm',action:'Özel’e dokun'},
    'new-album':{title:'Yeni albüm',text:'Yeni albüm’e dokun. Buradan kendi defterini hazırlayabilirsin.',target:target('new-album'),chapter:'5 / 5 · Yeni albüm',action:'Yeni albüm’e dokun'},
    create:{title:'Sıra senin albümünde',text:'Bir ad yazıp tasarımını seç. Özel seçili; hazır olduğunda Albümü oluştur’a dokunabilirsin.',target:'#album-title',chapter:'5 / 5 · Yeni albüm',next:'Kendim devam edeceğim'},
  };
  return steps[state.step];
}
