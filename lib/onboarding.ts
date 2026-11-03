export type TourStep='invite'|'sections'|'shared'|'personal'|'open-album'|'browse'|'view-mode'|'wide'|'edit'|'tools'|'editor-back'|'library-back'|'days'|'calendar'|'open-day'|'upload'|'close-day'|'private'|'new-album'|'create';
export type TourState={step:TourStep;albumId:string|null;book:boolean};
export type TourRead={pages:string[];book:boolean};
export type TourEvent={type:'start';albumId:string|null}|{type:'next'}|{type:'album-opened';id:string}|({type:'read'}&TourRead)|{type:'edit'}|{type:'editor-back'}|{type:'library-back'}|{type:'days'}|{type:'day-opened';day:string}|{type:'day-closed'}|{type:'filter';value:string}|{type:'new-album'}|{type:'create-closed'}|{type:'created'};
export const TOUR_DAY='2026-10-03';
export const startTour=(albumId:string|null,invite=false):TourState=>({step:invite?'invite':'sections',albumId,book:false});
const nextSteps:Partial<Record<TourStep,TourStep>>={sections:'shared',shared:'personal',personal:'open-album',wide:'edit',tools:'editor-back',calendar:'open-day',upload:'close-day'};
export function advanceTour(state:TourState|null,event:TourEvent):TourState|null {
  if(!state)return state;
  const go=(step:TourStep)=>({...state,step});
  switch(event.type){
    case 'start':return startTour(event.albumId);
    case 'next':{if(state.step==='create')return null;if(state.step==='browse')return go(state.book?'wide':'view-mode');const next=nextSteps[state.step];return next?go(next==='open-album'&&!state.albumId?'private':next):state;}
    case 'album-opened':return state.step==='open-album'&&event.id===state.albumId?go('browse'):state;
    case 'read':{
      if(state.step==='browse')return {...state,book:event.book};
      if(state.step==='view-mode'&&event.book)return {...go('wide'),book:true};return state;
    }
    case 'edit':return state.step==='edit'?go('tools'):state;
    case 'editor-back':return state.step==='editor-back'||state.step==='tools'?go('library-back'):state;
    case 'library-back':return state.step==='library-back'?go('days'):state;
    case 'days':return state.step==='days'?go('calendar'):state;
    case 'day-opened':return (state.step==='calendar'||state.step==='open-day')&&event.day===TOUR_DAY?go('upload'):state;
    case 'day-closed':return state.step==='close-day'||state.step==='upload'?go('private'):state;
    case 'filter':return state.step==='private'&&event.value==='personal'?go('new-album'):state;
    case 'new-album':return state.step==='new-album'?go('create'):state;
    case 'create-closed':return state.step==='create'?go('new-album'):state;
    case 'created':return state.step==='create'?null:state;
  }
}
export const tourContext=(step:TourStep)=>['sections','shared','personal','open-album','days','private','new-album','create'].includes(step)?'library':['browse','view-mode','wide','edit','library-back'].includes(step)?'reader':['tools','editor-back'].includes(step)?'editor':['calendar','open-day','upload','close-day'].includes(step)?'days':null;
export const tourFilter=(step:TourStep)=>['personal','new-album','create'].includes(step)?'personal':['sections','shared','open-album','days','private'].includes(step)?'shared':null;
export type TourDescription={title:string;text:string;target:string;chapter:string;next?:string};
export function describeTour(state:TourState):TourDescription {
  const target=(id:string)=>`[data-tour="${id}"]`;
  const steps:Record<TourStep,TourDescription>={
    invite:{title:'Kısa bir tur ister misin?',text:'Albümleri, düzenlemeyi ve takvimi kısaca görelim.',target:'',chapter:'Tanıtım',next:'Göster'},
    sections:{title:'Albümler ve Takvim',text:'Albüm sayfalarını istediğin gibi düzenleyebilir, takvimde fotoğraflara gün gün bakabilirsin.',target:target('sections'),chapter:'1 / 5',next:'İleri'},
    shared:{title:'Ortak albümler',text:'Bu albümlere ikimiz de fotoğraf ekleyebilir, sayfaları düzenleyebiliriz.',target:target('filter-shared'),chapter:'1 / 5',next:'İleri'},
    personal:{title:'Özel albümler',text:'Sana ait albümler burada. Fotoğraflarını ve sayfalarını yalnızca sen düzenleyebilirsin.',target:target('filter-personal'),chapter:'1 / 5',next:'Devam'},
    'open-album':{title:'Albümü aç',text:'',target:target('album')+`[data-album-id="${state.albumId}"]`,chapter:'2 / 5'},
    browse:{title:'Birkaç sayfa gez',text:'Sayfaları kaydırarak veya oklarla çevirebilirsin.',target:target('reader-next'),chapter:'2 / 5',next:'Devam'},
    'view-mode':{title:'İki sayfa görünümünü dene',text:'',target:target('reader-mode'),chapter:'2 / 5'},
    wide:{title:'Sayfa görünümü',text:'Görünümü tek sayfa ve iki sayfa olarak değiştirebilirsin. İki sayfa daha güzel görünüyor; telefonda yan tutmanı öneririm.',target:target('reader-mode'),chapter:'2 / 5',next:'Devam'},
    edit:{title:'Albümü düzenle',text:'Düzenle düğmesine dokunarak yeni fotoğraflar ekleyebilir, mevcut sayfaları değiştirebilirsin.',target:target('reader-edit'),chapter:'3 / 5'},
    tools:{title:'Düzenleme araçları',text:'Tüm değişiklikleri buradan yapabilirsin. Fotoğrafın yanı sıra metin, çıkartma ve şekil de ekleyebilirsin.',target:target('editor-tools')+'[data-tour-ready="true"]',chapter:'3 / 5',next:'Devam'},
    'editor-back':{title:'Albüme dön',text:'',target:target('editor-back'),chapter:'3 / 5'},
    'library-back':{title:'Ana sayfaya dön',text:'',target:target('reader-back'),chapter:'3 / 5'},
    days:{title:'Takvim’i aç',text:'',target:target('nav-days'),chapter:'4 / 5'},
    calendar:{title:'Fotoğraflı takvim',text:'Daha önceki fotoğraflarımızı günlerine göre yükledim. Sen de fotoğraf ekleyebilirsin. 3 Ekim’i aç.',target:target('day-'+TOUR_DAY),chapter:'4 / 5'},
    'open-day':{title:'3 Ekim Cumartesi’yi aç',text:'',target:target('day-'+TOUR_DAY),chapter:'4 / 5'},
    upload:{title:'Fotoğraf ekle',text:'Fotoğraf ekle’ye dokunup bu güne fotoğraf yükleyebilirsin.',target:target('day-upload'),chapter:'4 / 5',next:'Devam'},
    'close-day':{title:'Günü kapat',text:'',target:target('day-close'),chapter:'4 / 5'},
    private:{title:'Özel albümler',text:'Kendi albümünü oluşturmak için Özel’e geç.',target:target('filter-personal'),chapter:'5 / 5'},
    'new-album':{title:'Kendi albümünü oluştur',text:'',target:target('new-album'),chapter:'5 / 5'},
    create:{title:'Albümünü oluştur',text:'Albümüne bir isim verip tasarımını seçtikten sonra albümünü oluşturabilirsin.',target:'#album-title',chapter:'5 / 5',next:'Tamam'},
  };
  return steps[state.step];
}

export function tourInteractionTargets(state:TourState):string[]{
  if(state.step==='invite')return ['body'];
  if(state.step==='tools')return ['.canvas-workspace','.inspector','.editor-toolbar','.extra-tools','input[type="file"]','.upload-panel'];
  if(state.step==='browse')return ['[data-tour="reader-book"]','.page-navigation','.cover-link','.page-filmstrip'];
  if(state.step==='create')return ['dialog[open]'];
  if(state.step==='upload')return ['[data-tour="day-upload"]','input[type="file"]'];
  if(['sections','shared','personal'].includes(state.step))return [];
  return [describeTour(state).target].filter(Boolean);
}
