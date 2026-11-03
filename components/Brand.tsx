import React from 'react';
import { publicUrl } from '../lib/network';

export default function Brand() {
  return <span className="brand-logo" role="img" aria-label="Anılar">
    <svg className="brand-symbol" width="34" height="38" viewBox="0 0 40 44" fill="none" aria-hidden="true">
      <rect x="5" y="9" width="25" height="30" rx="2" transform="rotate(-12 5 9)" stroke="currentColor" opacity=".55"/>
      <rect x="12" y="5" width="25" height="32" rx="2" fill="currentColor"/>
      <path d="M15 8h19v22H15z" fill="#697d6c"/>
      <circle cx="29" cy="13" r="2.3" fill="currentColor" opacity=".9"/>
      <path d="m15 27 6-8 5 5 3-3 5 6v3H15z" fill="#364c40"/>
    </svg>
    <img className="brand-title" src={publicUrl('illustrations/anilar-wordmark.svg')} width="88" height="35" alt="" draggable={false}/>
  </span>;
}
