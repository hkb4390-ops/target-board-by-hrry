// Cloudflare Worker proxy for https://studyapkmod.free.nf/tbapi/api.php (InfinityFree bot-check solved here).
// Deploy: Cloudflare dashboard > Workers > Create > paste this file > Settings > Compatibility flags: add "nodejs_compat".
// Then set in Vercel env:  VITE_CORS_PROXY = https://YOUR-WORKER.workers.dev/?q=   (the app appends the encoded API url)
// Or call it directly:     https://YOUR-WORKER.workers.dev/?courses   |  ?courseid=ID  |  ?video=ASSET
import crypto from 'node:crypto';

const ORIGIN = 'https://studyapkmod.free.nf/tbapi/api.php';
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const hex = (s) => Buffer.from(s, 'hex');
const isChallenge = (s) => /slowAES|toNumbers\(/.test(s);

function solve(html) {
  const m = [...html.matchAll(/toNumbers\("([0-9a-f]+)"\)/gi)].map((x) => x[1]);
  if (m.length < 3) return '';
  const d = crypto.createDecipheriv('aes-128-cbc', hex(m[0]), hex(m[1]));
  d.setAutoPadding(false);
  return Buffer.concat([d.update(hex(m[2])), d.final()]).toString('hex');
}
const get = (url, cookie) => fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json,*/*', Referer: 'https://studyapkmod.free.nf/', ...(cookie ? { Cookie: `__test=${cookie}` } : {}) } }).then((r) => r.text());

export default {
  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const u = new URL(req.url);
    let qs = u.searchParams.get('q');
    if (qs) { try { qs = new URL(qs).search.slice(1); } catch { qs = qs.replace(/^.*\?/, ''); } }
    else qs = u.search.slice(1);
    qs = qs.replace(/(^|&)i=1(&|$)/, '$1').replace(/=(&|$)/g, '$1');
    const base = `${ORIGIN}${qs ? '?' + qs : ''}`;
    try {
      let body = await get(base);
      for (let i = 0; i < 2 && isChallenge(body); i++) {
        const c = solve(body);
        if (!c) break;
        body = await get(`${ORIGIN}?${qs ? qs + '&' : ''}i=1`, c);
      }
      if (isChallenge(body) || /^\s*</.test(body)) return new Response(JSON.stringify({ error: 'host bot-check not solved' }), { status: 502, headers: cors });
      return new Response(body, { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: cors });
    }
  },
};
