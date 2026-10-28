// Vercel Serverless Function: proxy for https://studyapkmod.free.nf/tbapi/api.php (InfinityFree)
// - solves the InfinityFree "aes.js" bot-check (__test cookie + ?i=1) server-side
// - tries several request variants (https/http, mobile/desktop browser) before giving up
// - add &_debug=1 to any call to see exactly what the host answered to this server
// Routed from /tbapi/* by vercel.json. Works for: (none) status, ?courses, ?courseid=, ?video=
import crypto from 'node:crypto';

const HOST = 'studyapkmod.free.nf';
const PATH = '/tbapi/api.php';
const UAS = [
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
];
const VARIANTS = [
  { proto: 'https', ua: 0 },
  { proto: 'https', ua: 1 },
  { proto: 'http', ua: 0 },
];
const hex = (s) => Buffer.from(s, 'hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isChallenge = (s) => /slowAES|toNumbers\(/.test(s);
const isHtml = (s) => /^\s*</.test(s) || isChallenge(s);

let cookieCache = ''; // survives while the function instance is warm

function solve(html) {
  const m = [...html.matchAll(/toNumbers\("([0-9a-f]+)"\)/gi)].map((x) => x[1]);
  if (m.length < 3) return '';
  const d = crypto.createDecipheriv('aes-128-cbc', hex(m[0]), hex(m[1]));
  d.setAutoPadding(false);
  return Buffer.concat([d.update(hex(m[2])), d.final()]).toString('hex');
}

async function get(url, ua, cookie, accept) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': UAS[ua],
        Accept: accept,
        'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
        Referer: `https://${HOST}/`,
        ...(cookie ? { Cookie: `__test=${cookie}` } : {}),
      },
    });
    return { status: r.status, text: await r.text() };
  } finally {
    clearTimeout(t);
  }
}

async function attempt(qs, v, trace) {
  const base = `${v.proto}://${HOST}${PATH}${qs ? '?' + qs : ''}`;
  const withI = `${v.proto}://${HOST}${PATH}?${qs ? qs + '&' : ''}i=1`;
  const html = 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8';
  let res = await get(cookieCache ? withI : base, v.ua, cookieCache, html);
  trace.push({ step: `${v.proto}/ua${v.ua}${cookieCache ? '+cookie' : ''}`, status: res.status, len: res.text.length, head: res.text.slice(0, 120) });
  for (let i = 0; i < 2 && isChallenge(res.text); i++) {
    const c = solve(res.text);
    if (!c) break;
    cookieCache = c;
    res = await get(withI, v.ua, c, html);
    trace.push({ step: 'solved->i=1', status: res.status, len: res.text.length, head: res.text.slice(0, 120) });
  }
  if (isHtml(res.text) || !res.text.trim()) { cookieCache = ''; throw new Error(`host answered HTTP ${res.status} with a ${isChallenge(res.text) ? 'bot-check page' : 'non-JSON page'}`); }
  return res.text;
}

async function fetchTb(qs, trace) {
  let last;
  for (const v of VARIANTS) {
    try { return await attempt(qs, v, trace); } catch (e) { last = e; trace.push({ step: 'error', error: String(e.message || e) }); await sleep(250); }
  }
  throw last;
}

// Query string however Vercel hands it over (req.url after a rewrite, or req.query)
function queryString(req) {
  const p = new URLSearchParams(new URL(req.url || '/', 'http://x').search);
  if (req.query && typeof req.query === 'object') {
    for (const [k, v] of Object.entries(req.query)) if (!p.has(k)) p.append(k, Array.isArray(v) ? v[0] : String(v));
  }
  ['path', 'i', '_debug'].forEach((k) => p.delete(k));
  return p.toString().replace(/=(&|$)/g, '$1'); // "courses=" -> "courses"
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const url = new URL(req.url || '/', 'http://x');
  const debug = url.searchParams.has('_debug') || (req.query && '_debug' in req.query);
  const qs = queryString(req);
  const trace = [];
  try {
    const body = await fetchTb(qs, trace);
    if (debug) return res.status(200).json({ ok: true, query: qs, trace, preview: body.slice(0, 600) });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // stream/token links stay fresh; course data can be cached
    res.setHeader('Cache-Control', /(^|&)video=/.test(qs) ? 'no-store' : 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(body);
  } catch (e) {
    return res.status(502).json({ ok: false, error: String((e && e.message) || e), query: qs, trace });
  }
}
