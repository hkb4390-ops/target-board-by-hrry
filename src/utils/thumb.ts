import { useEffect, useState } from 'react';
import { VIDEO_THUMBNAIL } from '../branding';

/** Same picture through two image proxies first (catbox is blocked on some networks), then the direct link */
const strip = VIDEO_THUMBNAIL.replace(/^https?:\/\//, '');
const SOURCES: { url: string; delay: number }[] = [
  { url: `https://wsrv.nl/?url=${encodeURIComponent(strip)}&w=480&output=jpg`, delay: 0 },
  { url: `https://i0.wp.com/${strip}?w=480`, delay: 0 },
  { url: VIDEO_THUMBNAIL, delay: 1500 },
];

let resolved = '';
let pending: Promise<string> | null = null;

/** Loads all sources side by side and keeps the first one that works */
export function resolveThumb(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  if (pending) return pending;
  pending = new Promise<string>((done) => {
    let failed = 0;
    let finished = false;
    SOURCES.forEach(({ url, delay }) => {
      setTimeout(() => {
        if (finished) return;
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.onload = () => { if (!finished) { finished = true; resolved = url; done(url); } };
        img.onerror = () => { if (++failed === SOURCES.length && !finished) { finished = true; done(''); } };
        img.src = url;
      }, delay);
    });
  }).finally(() => { pending = null; });
  return pending;
}

/** Working video thumbnail url, or '' while loading / if every source fails */
export function useThumb(): string {
  const [src, setSrc] = useState(resolved);
  useEffect(() => {
    if (resolved) { setSrc(resolved); return; }
    let live = true;
    resolveThumb().then((s) => { if (live) setSrc(s); });
    return () => { live = false; };
  }, []);
  return src;
}
