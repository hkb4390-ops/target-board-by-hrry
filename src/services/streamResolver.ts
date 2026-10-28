/**
 * Stream Resolver for Target Board
 * Uses ONLY the new video API:  api.php?video=<id>  -> finds the playable link in the response.
 * (The old CloudFront / worker-token guessing has been removed.)
 */

import { fetchVideoInfo, lastVideoDebug, lastApiError } from './tbApi';

export const TPSTREAMS_ORG_ID = 'kuepke';

export interface StreamResolution {
  dashUrl: string;
  hlsUrl: string;
  thumbnailUrl: string;
  directMediaUrl: string;
  drmToken: string | null;
  drmLicenseUrl: string | null;
  assetId: string;
  directPlayerLink: string;
  hlsCandidates: string[];
  /** web player page given by the API (works in an iframe or a new tab) */
  pageUrl: string;
}

/** assetId can come directly or hidden in a gateway link like .../test.php?id=XXXX */
export function extractCleanAssetId(assetId?: string, url?: string): string {
  if ((assetId || '').trim()) return assetId!.trim();
  const m = (url || '').match(/[?&](?:id|assetId|video)=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

/** True only for real media files/manifests. Gateway web pages (test.php, sangam.free.nf, t.me) are NOT media. */
export function isDirectMediaStream(url?: string): boolean {
  if (!url) return false;
  const l = url.toLowerCase();
  if (l.includes('test.php') || l.includes('sangam.free.nf') || l.includes('t.me')) return false;
  return l.includes('.mpd') || l.includes('.m3u8') || l.includes('.mp4') || l.includes('.webm') || l.startsWith('blob:');
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(t); }
}

export async function resolveVideoStream(
  assetId: string,
  providedUrl: string = '',
  title: string = '',
  _courseId: string = '',
  log: (m: string) => void = () => {}
): Promise<StreamResolution> {
  const id = extractCleanAssetId(assetId, providedUrl);
  const ownMedia = isDirectMediaStream(providedUrl) ? providedUrl : '';

  // The new video API: the link is searched inside whatever it returns
  const info = id ? await Promise.race([fetchVideoInfo(id), new Promise<null>((r) => setTimeout(() => r(null), 25000))]) : null;
  log(info ? lastVideoDebug : (lastVideoDebug || 'video api: no answer'));
  if (!info && id) {
    log(`asset id sent: ${id}`);
    if (lastApiError) log(lastApiError);
  }
  if (!id) log('this lesson has no video id (asset) - nothing to ask the API for');

  let hlsUrl = info?.hlsUrl || (/\.m3u8/i.test(ownMedia) ? ownMedia : '');
  let dashUrl = info?.dashUrl || (/\.mpd/i.test(ownMedia) ? ownMedia : '');
  const mp4Url = info?.mp4Url || (/\.(mp4|webm)/i.test(ownMedia) ? ownMedia : '');
  const drmToken = info?.drmToken || null;
  let thumbnailUrl = info?.thumbnail || '';

  // Only a token came back (TPStreams asset): ask TPStreams itself for the stream with that token
  // (skipped when the API already gave a ready web-player page: its token belongs to that page, not to TPStreams)
  if (drmToken && id && !hlsUrl && !dashUrl) {
    try {
      const r = await fetchWithTimeout(`https://app.tpstreams.com/api/v1/${TPSTREAMS_ORG_ID}/assets/${id}/?access_token=${drmToken}`);
      if (r.ok) {
        const d = await r.json();
        hlsUrl = d?.video?.playback_url || hlsUrl;
        dashUrl = d?.video?.dash_url || dashUrl;
        thumbnailUrl = d?.video?.cover_thumbnail_url || thumbnailUrl;
      } else { let b = ''; try { b = (await r.text()).slice(0, 120); } catch (_) {} log(`tpstreams asset: HTTP ${r.status} ${b}`); }
    } catch (e: any) { log('tpstreams asset: ' + (e?.name === 'AbortError' ? 'timeout' : 'failed')); }
  }

  const drmLicenseUrl = info?.drmLicenseUrl || (id && drmToken ? `https://app.tpstreams.com/api/v1/${TPSTREAMS_ORG_ID}/assets/${id}/drm_license/?access_token=${drmToken}` : null);

  return {
    dashUrl,
    hlsUrl,
    thumbnailUrl,
    directMediaUrl: mp4Url,
    drmToken,
    drmLicenseUrl,
    assetId: id,
    directPlayerLink: '',
    hlsCandidates: hlsUrl ? [hlsUrl] : [],
    pageUrl: info?.pageUrl || '',
  };
}
