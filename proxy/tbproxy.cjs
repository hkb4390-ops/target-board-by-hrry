// Shared server-side fetcher for https://studyapkmod.free.nf/tbapi/api.php
// Solves the InfinityFree "aes.js" bot-check (the __test cookie) so real JSON comes back.
// Used by: netlify/functions/tbapi.js, api/tbapi.js (Vercel) and the vite dev/preview server.
const crypto = require('crypto');

const ORIGIN = 'https://studyapkmod.free.nf';
const PATH = '/tbapi/api.php';
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const hex = (s) => Buffer.from(s, 'hex');

function solveChallenge(html) {
  const m = html.match(/toNumbers\("([0-9a-f]+)"\)[\s\S]*?toNumbers\("([0-9a-f]+)"\)[\s\S]*?toNumbers\("([0-9a-f]+)"\)/i);
  if (!m) return null;
  const d = crypto.createDecipheriv('aes-128-cbc', hex(m[1]), hex(m[2]));
  d.setAutoPadding(false);
  return Buffer.concat([d.update(hex(m[3])), d.final()]).toString('hex');
}

async function get(url, cookie) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8', Referer: ORIGIN + '/', ...(cookie ? { Cookie: `__test=${cookie}` } : {}) },
    redirect: 'follow',
  });
  return res.text();
}

const looksLikeHtml = (s) => /^\s*</.test(s) || /slowAES|toNumbers\(/.test(s);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(qs) {
  const base = `${ORIGIN}${PATH}?${qs}`;
  let body = await get(base);
  for (let attempt = 0; attempt < 3 && looksLikeHtml(body); attempt++) {
    const cookie = solveChallenge(body);
    if (!cookie) break;
    body = await get(`${base}${qs ? '&' : ''}i=1`, cookie);
  }
  if (looksLikeHtml(body)) throw new Error('host bot-check could not be solved');
  return body;
}

/** qs = the query string after "?" (e.g. "courses" or "courseid=abc"). Returns the JSON text. Retries a few times if the free host hiccups. */
async function fetchTb(qs) {
  qs = (qs || '').replace(/^\?/, '').replace(/(^|&)i=1(&|$)/, '$1').replace(/&$/, '');
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try { return await fetchOnce(qs); } catch (e) { lastErr = e; await sleep(400 * (i + 1)); }
  }
  throw lastErr;
}

module.exports = { fetchTb };
