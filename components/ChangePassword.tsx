import React,{useState} from 'react';
import {Eye,EyeOff,LoaderCircle} from 'lucide-react';
import {post} from '../lib/client';
import type {User} from '../lib/model';

export default function ChangePassword({onComplete,onLogout}:{onComplete:(user:User)=>void;onLogout:()=>void}){
  const [password,setPassword]=useState(''),[confirmPassword,setConfirm]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');if(password!==confirmPassword){setError('Şifreler aynı değil.');return;}
    setBusy(true);try{const r=await post<{user:User}>('auth/password',{password,confirmPassword});setPassword('');setConfirm('');onComplete(r.user);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <main className="password-change-screen"><header><span className="wordmark">Album</span></header><section><h1>Geçici şifreni değiştir</h1><form onSubmit={submit}>
    <label htmlFor="new-password">Yeni şifre</label><div className="password-field"><input id="new-password" name="new-password" type={show?'text':'password'} autoComplete="new-password" minLength={8} maxLength={256} required disabled={busy} aria-describedby="password-length" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={show?'Şifreyi gizle':'Şifreyi göster'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div><small id="password-length">En az 8 karakter.</small>
    <label htmlFor="confirm-password">Yeni şifre (tekrar)</label><input id="confirm-password" name="confirm-password" type={show?'text':'password'} autoComplete="new-password" minLength={8} maxLength={256} required disabled={busy} value={confirmPassword} onChange={e=>setConfirm(e.target.value)}/>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button primary full" disabled={busy}>{busy?<LoaderCircle size={19} className="spin"/>:'Şifreyi kaydet'}</button><button className="text-button" type="button" disabled={busy} onClick={onLogout}>Çıkış yap</button>
  </form></section></main>;
}
