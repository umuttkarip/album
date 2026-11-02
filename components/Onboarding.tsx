import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,ImagePlus,LayoutTemplate,LockKeyhole,MousePointer2,Pencil,Plus,Users,X} from 'lucide-react';

const steps=[
  {title:'Albümleri incele',text:'Kapağa dokunarak albümü aç. Sayfaları kaydırarak veya oklarla gez; fotoğrafı basılı tutarak orijinalini aç.',kind:'read'},
  {title:'Sayfaları düzenle',text:'Albümde Düzenle’ye gir. Fotoğraf ekle, yerini ve boyutunu değiştir. Değişikliklerin otomatik kaydedilir.',kind:'edit'},
  {title:'Kendi albümünü oluştur',text:'Yeni albüm’den adını ve tasarımını seç. Ortak albümü birlikte, özel albümünü yalnızca sen düzenlersin.',kind:'create'},
  {title:'Günlere fotoğraf ekle',text:'Albümler sayfalar halinde, Günler tarihe göre gösterir. Günler’de bir tarihi açıp Fotoğraf ekle’ye dokun. Aynı güne birkaç fotoğraf eklenebilir; ekleyen kişi görünür.',kind:'days'},
] as const;

function Example({kind}:{kind:typeof steps[number]['kind']}) {
  return <div className={'tour-example tour-'+kind} aria-hidden="true">
    {kind==='read'?<><BookOpen size={30}/><span>Sayfaları gez</span><ArrowRight size={17}/><MousePointer2 size={20}/><span>Fotoğrafı aç</span></>
      :kind==='edit'?<><Pencil size={21}/><span>Düzenle</span><i/><ImagePlus size={21}/><span>Fotoğraf ekle</span></>
      :kind==='create'?<><span><Users size={21}/>Ortak</span><span><LockKeyhole size={20}/>Özel</span><LayoutTemplate size={27}/></>
      :<><BookOpen size={22}/><span>Albümler</span><ArrowRight size={17}/><CalendarDays size={22}/><span>Günler</span><Plus size={17}/></>}
  </div>;
}
export default function Onboarding({onClose,replay=false}:{onClose:()=>void;replay?:boolean}) {
  const [step,setStep]=useState(replay?0:-1),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();}};document.addEventListener('keydown',listener);return()=>document.removeEventListener('keydown',listener);},[]);
  const current=steps[Math.max(0,step)];
  return <aside className="usage-tour" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-description">
    <div className="tour-top"><span>{step<0?'Kısa kullanım turu':`${step+1} / ${steps.length}`}</span><button className="icon-button" onClick={onClose} aria-label="Tanıtımı kapat"><X size={19}/></button></div>
    {step>=0&&<Example kind={current.kind}/>}
    <div className="tour-copy" aria-live="polite"><h2 id="tour-title">{step<0?'Siteyi kısaca gezmek ister misin?':current.title}</h2><p id="tour-description">{step<0?'Albümler, düzenleme ve Günler. Dört kısa adım.':current.text}</p></div>
    <div className="tour-actions">{step<=0?<button className="text-button" onClick={onClose}>Geç</button>:<button className="text-button" onClick={()=>setStep(n=>n-1)}><ArrowLeft size={16}/>Geri</button>}<button className="button primary" onClick={()=>step===steps.length-1?onClose():setStep(n=>n+1)}>{step<0?'Göster':step===steps.length-1?'Tamam':'İleri'}{step<steps.length-1&&<ArrowRight size={17}/>}</button></div>
  </aside>;
}
