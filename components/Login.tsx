import React from 'react';
import { Eye, ArrowRight, LoaderCircle } from 'lucide-react';
import { backendConfigured } from '../lib/network';
import { publicUrl } from '../lib/network';

export default function Login({username,password,showPassword,onUsername,onPassword,onShow,onSubmit,busy,error}:{
  username:string; password:string; showPassword:boolean; onUsername:(v:string)=>void; onPassword:(v:string)=>void; onShow:()=>void; onSubmit:(e:React.FormEvent)=>void; busy:boolean; error:string;
}){
  return <main className="login-screen">
    <div className="login-main"><section className="login-form-area"><h1>Giriş yap</h1><form onSubmit={onSubmit}>
      <label htmlFor="username">Kullanıcı adı</label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={e=>onUsername(e.target.value)}/>
      <label htmlFor="password">Şifre</label><div className="password-field"><input id="password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>onPassword(e.target.value)}/><button type="button" aria-label={showPassword?'Şifreyi gizle':'Şifreyi göster'} onClick={onShow}><Eye size={19}/></button></div>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button className="button primary login-submit" disabled={busy||!backendConfigured}>{busy?<LoaderCircle className="spin" size={19}/>:<>Giriş yap<ArrowRight size={18}/></>}</button>
    </form></section><div className="login-art" aria-hidden="true"><img className="login-album-image" src={publicUrl('illustrations/login-album.webp')} srcSet={`${publicUrl('illustrations/login-album-small.webp')} 480w, ${publicUrl('illustrations/login-album.webp')} 960w`} sizes="(max-width:760px) 180px, 430px" width="960" height="1200" alt="" fetchPriority="high" decoding="async" draggable={false}/></div></div>
  </main>;
}
