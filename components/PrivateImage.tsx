import React, { useEffect, useRef, useState } from 'react';
import { fetchAsset } from '../lib/network';

export function PrivateImage({ src, loading, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const [blobUrl, setBlobUrl] = useState(''), [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    let url = '', started = false;
    const controller = new AbortController();
    setBlobUrl(''); setFailed(false);
    async function start() {
      if (started) return; started = true;
      try {
        const blob = await fetchAsset(src, controller.signal);
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob); setBlobUrl(url);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    }
    const observer = loading === 'lazy' && typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); void start(); } }, { rootMargin: '150px' }) : null;
    if (observer && ref.current) observer.observe(ref.current); else void start();
    return () => { controller.abort(); observer?.disconnect(); if (url) URL.revokeObjectURL(url); };
  }, [src, loading]);
  return <img ref={ref} {...props} src={blobUrl || undefined} alt={failed ? 'Fotoğraf yüklenemedi' : alt} aria-busy={!blobUrl && !failed} />;
}
