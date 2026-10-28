// Netlify Function: server-side proxy for https://studyapkmod.free.nf/tbapi/api.php
const { fetchTb } = require('../../proxy/tbproxy.cjs');

exports.handler = async (event) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  try {
    const body = await fetchTb(event.rawQuery || '');
    return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' }, body };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
