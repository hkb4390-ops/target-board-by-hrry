/**
 * Target Board — new API layer (studyapkmod.free.nf)
 *
 *   Batches (courses)  : api.php?courses
 *   Course details     : api.php?courseid=<id>     (class > subject > chapter > videos / pdfs)
 *   Video              : api.php?video=<videoId>   (stream info for the player)
 *
 * Everything here is deliberately tolerant about the JSON shape: field names such as id / _id / courseid,
 * title / name, folders / subjects / classes / children ... are all understood, so a small change on the
 * server side does not break the app.
 */

import type { Folder, Lesson } from '../types';
import { VIDEO_THUMBNAIL } from '../branding';
import { cleanTeacher } from '../utils/format';

export const API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE || 'https://studyapkmod.free.nf/tbapi/api.php';

/** Optional CORS proxy, e.g. VITE_CORS_PROXY="https://corsproxy.io/?" (url is appended, encoded). */
const CUSTOM_PROXY: string = (import.meta as any).env?.VITE_CORS_PROXY || '';

/* ------------------------------------------------------------------ */
/* Network                                                             */
/* ------------------------------------------------------------------ */

type Route = { name: string; build: (target: string) => string };

const ROUTES: Route[] = [
  // same-origin proxy: Netlify function (netlify/functions/tbapi.js) or vite dev/preview proxy
  { name: 'local-proxy', build: (t) => t.replace(/^https?:\/\/[^/]+/i, '') },
  ...(CUSTOM_PROXY ? [{ name: 'custom-proxy', build: (t: string) => CUSTOM_PROXY + encodeURIComponent(t) }] : []),
  { name: 'direct', build: (t) => t },
  // free hosts (InfinityFree) sometimes want ?i=1 after their bot-check
  { name: 'direct-i1', build: (t) => t + (t.includes('?') ? '&' : '?') + 'i=1' },
  { name: 'corsproxy', build: (t) => 'https://corsproxy.io/?url=' + encodeURIComponent(t) },
  { name: 'allorigins', build: (t) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(t) },
];

export let lastApiError = '';
let goodRoute = 0; // index of the route that worked last time

async function timedFetch(url: string, ms: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal, headers: { Accept: 'application/json, text/plain, */*' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/** Parses a response body as JSON. Tolerates BOMs, junk before/after the JSON and rejects HTML pages. */
export function parseJsonLoose(text: string): any {
  const s = (text || '').replace(/^﻿/, '').trim();
  if (!s) throw new Error('empty response');
  if (s[0] === '<') throw new Error('got an HTML page instead of JSON (host bot-check?)');
  try {
    return JSON.parse(s);
  } catch {
    const a = Math.min(...['{', '['].map((c) => { const i = s.indexOf(c); return i < 0 ? Infinity : i; }));
    const b = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (isFinite(a) && b > a) return JSON.parse(s.slice(a, b + 1));
    throw new Error('invalid JSON');
  }
}

/** GET api.php?<query> with automatic route fallback + one retry. */
export async function apiGet(query: string, raw = false): Promise<any> {
  const target = `${API_BASE}?${query}`;
  const order = [goodRoute, ...ROUTES.map((_, i) => i).filter((i) => i !== goodRoute)];
  const errors: string[] = [];
  for (let round = 0; round < 2; round++) {
    for (const i of order) {
      const route = ROUTES[i];
      try {
        const text = await timedFetch(route.build(target), round === 0 ? 12000 : 20000);
        let json: any;
        try { json = parseJsonLoose(text); }
        catch (pe) {
          // video endpoint may answer with a bare link / text: keep it (never an HTML or bot-check page)
          const t = (text || '').trim();
          if (raw && t && t[0] !== '<' && !/slowAES|toNumbers\(/.test(t)) json = { __text: t };
          else throw pe;
        }
        goodRoute = i;
        lastApiError = '';
        return json;
      } catch (e: any) {
        errors.push(`${route.name}: ${e?.name === 'AbortError' ? 'timeout' : e?.message || 'failed'}`);
      }
    }
  }
  lastApiError = errors.slice(0, ROUTES.length).join(' | ');
  throw new Error('API unreachable → ' + lastApiError);
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

const isObj = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: any): string => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');
const firstStr = (o: any, keys: string[]): string => {
  if (!isObj(o)) return '';
  for (const k of keys) { const v = str(o[k]); if (v) return v; }
  return '';
};
const isHttp = (v: any) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const imgRe = /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i;

/** Makes any image link usable on an https site: //cdn.. , http://.. , /uploads/x.jpg , uploads/x.jpg */
export function fixUrl(u: string): string {
  u = (u || '').trim();
  if (!u) return '';
  if (u.startsWith('data:')) return u;
  if (u.startsWith('//')) return 'https:' + u;
  if (/^https?:\/\//i.test(u)) return u.replace(/^http:\/\//i, 'https://');
  try { return new URL(u, API_BASE).href; } catch { return ''; }
}

/** Finds a thumbnail anywhere in an object: thumbnail / image / courseImage / banner / cover ... or any *.jpg|png|webp link. */
export function pickImage(o: any, depth = 0): string {
  if (o == null || depth > 3) return '';
  if (typeof o === 'string') return imgRe.test(o.trim()) ? fixUrl(o) : '';
  if (Array.isArray(o)) { for (const v of o) { const r = pickImage(v, depth + 1); if (r) return r; } return ''; }
  if (isObj(o)) {
    for (const [k, v] of Object.entries(o)) {
      if (!/thumb|image|img|banner|cover|poster|photo|picture/i.test(k)) continue;
      const sv = typeof v === 'string' ? v.trim() : isObj(v) ? firstStr(v, ['url', 'src', 'link', 'path', 'original']) : '';
      if (sv) return fixUrl(sv);
      const r = pickImage(v, depth + 1);
      if (r) return r;
    }
    for (const v of Object.values(o)) { const r = pickImage(v, depth + 1); if (r) return r; }
  }
  return '';
}

/** Finds the first array under one of `keys`, looking inside common wrappers (data / result / course ...). */
export function pickArray(json: any, keys: string[], depth = 0): any[] | null {
  if (Array.isArray(json)) return json;
  if (!isObj(json) || depth > 3) return null;
  for (const k of keys) if (Array.isArray(json[k])) return json[k];
  for (const k of ['data', 'result', 'results', 'response', 'course', 'batch', 'payload']) {
    if (json[k] != null) { const r = pickArray(json[k], keys, depth + 1); if (r) return r; }
  }
  // { "<id>": {...}, "<id2>": {...} }  ->  values
  if (depth === 0) {
    const vals = Object.values(json).filter(isObj);
    if (vals.length && vals.length === Object.keys(json).filter((k) => !['success', 'status', 'count', 'source', 'message'].includes(k)).length) return vals as any[];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Course list                                                         */
/* ------------------------------------------------------------------ */

export const COURSE_ID_KEYS = ['courseid', 'courseId', 'course_id', 'id', '_id', 'batchid', 'batchId', 'batch_id'];

export function extractCourseList(json: any): any[] {
  return pickArray(json, ['courses', 'batches', 'batch', 'data', 'items', 'list']) || [];
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;
/** Prefers a Mongo-style 24-hex id (what ?courseid= expects) wherever it sits, else falls back to the usual keys. */
export const courseIdOf = (item: any): string => {
  if (isObj(item)) {
    for (const k of COURSE_ID_KEYS) { const v = str(item[k]); if (OBJECT_ID.test(v)) return v; }
    for (const v of Object.values(item)) { const x = str(v); if (OBJECT_ID.test(x)) return x; }
  }
  return firstStr(item, COURSE_ID_KEYS);
};

/* ------------------------------------------------------------------ */
/* Course details: class > subject > chapter > lessons                  */
/* ------------------------------------------------------------------ */

const FOLDER_KEYS = ['folders', 'subfolders', 'children', 'subjects', 'classes', 'chapters', 'topics', 'sections', 'modules', 'units', 'categories', 'content', 'contents', 'items'];
const LESSON_KEYS = ['lessons', 'videos', 'lectures', 'classes_list', 'pdfs', 'notes', 'files', 'documents', 'materials', 'items', 'contents', 'content'];
const NAME_KEYS = ['name', 'title', 'folderName', 'folder_name', 'subject', 'subjectName', 'subject_name', 'className', 'class_name', 'chapter', 'chapterName', 'topic', 'label'];
const TITLE_KEYS = ['title', 'name', 'lectureName', 'lecture_name', 'videoTitle', 'video_title', 'topic', 'label', 'fileName', 'file_name'];
const VIDEO_ID_KEYS = ['asset', 'video', 'videoid', 'videoId', 'video_id', 'vid', 'assetId', 'asset_id', 'tpAssetId', 'tpassetid', 'refId'];

const mediaRe = /\.(m3u8|mpd|mp4|webm|m4v|mov)(\?|#|$)/i;
const pdfRe = /\.pdf(\?|#|$)/i;

function findPdf(o: any, depth = 0): string | null {
  if (o == null || depth > 4) return null;
  if (typeof o === 'string') return isHttp(o) && pdfRe.test(o.trim().split(' ')[0]) ? o.trim() : null;
  if (Array.isArray(o)) { for (const v of o) { const r = findPdf(v, depth + 1); if (r) return r; } return null; }
  if (isObj(o)) {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && isHttp(v) && /pdf|doc|file|attach|note|download/i.test(k) && !mediaRe.test(v)) return v.trim();
    }
    for (const v of Object.values(o)) { const r = findPdf(v, depth + 1); if (r) return r; }
  }
  return null;
}

/** pulls `video=XXXX` / `id=XXXX` / last path part out of a player link */
function idFromLink(u: string): string {
  const m = u.match(/[?&](?:video|videoid|videoId|assetId|id)=([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

function videoIdOf(item: any): string {
  for (const k of VIDEO_ID_KEYS) {
    const v = item[k];
    if (isObj(v)) { const n = firstStr(v, ['assetId', 'asset_id', 'id', 'videoId']); if (n) return n; }
    else { const s = str(v); if (s && !isHttp(s) && /^[A-Za-z0-9_-]{6,}$/.test(s)) return s; if (isHttp(s)) { const x = idFromLink(s); if (x) return x; } }
  }
  for (const k of ['url', 'link', 'playerUrl', 'player_url', 'videoUrl', 'video_url']) {
    const s = str(item[k]);
    if (isHttp(s) && !mediaRe.test(s) && !pdfRe.test(s)) { const x = idFromLink(s); if (x) return x; }
  }
  return '';
}

function directMediaOf(item: any): string {
  for (const k of ['hlsUrl', 'hls_url', 'hls', 'm3u8', 'mp4', 'mp4Url', 'videoUrl', 'video_url', 'playUrl', 'play_url', 'playerUrl', 'player_url', 'url', 'link', 'src', 'source']) {
    const s = str(item[k]);
    if (isHttp(s) && mediaRe.test(s)) return s;
  }
  return '';
}

/** True when the object is a playable video or a pdf (a "leaf"), not a folder. */
function lessonKind(raw: any): 'video' | 'pdf' | null {
  const t = firstStr(raw, ['type', 'contentType', 'content_type', 'kind', 'category']).toLowerCase();
  const pdf = raw.pdfUrl || raw.pdf_url || raw.pdf?.url || findPdf(raw);
  if (/pdf|note|doc|file|dpp|material/.test(t) && pdf) return 'pdf';
  if (t === 'pdf') return 'pdf';
  if (videoIdOf(raw) || directMediaOf(raw)) return 'video';
  if (pdf) return 'pdf';
  return null;
}

function hasChildArrays(raw: any): boolean {
  return FOLDER_KEYS.concat(LESSON_KEYS).some((k) => Array.isArray(raw[k]) && raw[k].length);
}

let uid = 0;
const nextId = (p: string) => `${p}-${++uid}`;

function toLesson(raw: any, idx: number): Lesson | null {
  // some APIs wrap the real data in "source"
  const item = isObj(raw.source) ? { ...raw, ...raw.source } : raw;
  const kind = lessonKind(item);
  if (!kind) return null;
  const title = firstStr(item, TITLE_KEYS) || (kind === 'pdf' ? 'Notes' : `Class ${idx + 1}`);
  const id = firstStr(item, ['_id', 'id', 'refId', 'lessonId', 'lesson_id']) || nextId('l');
  const order = typeof raw.sequence === 'number' ? raw.sequence : typeof item.order === 'number' ? item.order : idx + 1;
  if (kind === 'pdf') {
    const pdfUrl = str(item.pdfUrl) || str(item.pdf_url) || str(item.pdf?.url) || findPdf(item) || null;
    return { id, title, type: 'pdf', duration: 'PDF Document', pdfUrl, isFree: true, order: 1000 + order };
  }
  const assetId = videoIdOf(item);
  const media = directMediaOf(item);
  return {
    id,
    title,
    type: 'video',
    duration: str(item.duration) || 'Recorded Lecture',
    teacher: cleanTeacher(item.teacher || item.instructor || item.description || ''),
    date: str(item.startTime) || str(item.scheduledStart) || str(item.date) || str(item.createdAt) || str(item.created_at),
    thumbnail: pickImage(item) || VIDEO_THUMBNAIL,
    assetId,
    playerUrl: media,
    pdfUrl: null,
    isFree: true,
    order,
  };
}

function toFolder(raw: any, idx: number, fallbackName = ''): Folder | null {
  if (!isObj(raw)) return null;
  const lessons: Lesson[] = [];
  const subfolders: Folder[] = [];
  const seen = new Set<any>();

  const feed = (arr: any[]) => {
    arr.forEach((child, i) => {
      if (!isObj(child) || seen.has(child)) return;
      seen.add(child);
      const lesson = !hasChildArrays(child) ? toLesson(child, lessons.length + i) : null;
      if (lesson) { lessons.push(lesson); return; }
      const f = toFolder(child, subfolders.length);
      if (f) subfolders.push(f);
    });
  };
  for (const k of FOLDER_KEYS.concat(LESSON_KEYS)) {
    if (Array.isArray(raw[k])) feed(raw[k]);
  }
  // { "Physics": [ ... ] } style maps under folders/subjects
  for (const k of ['folders', 'subjects', 'classes', 'chapters']) {
    if (isObj(raw[k])) Object.entries(raw[k]).forEach(([name, v]) => {
      const f = Array.isArray(v) ? toFolder({ name, lessons: v }, subfolders.length) : toFolder({ name, ...(v as any) }, subfolders.length);
      if (f) subfolders.push(f);
    });
  }

  // dedupe identical lessons (same title + same media / pdf)
  const keys = new Set<string>();
  const uniq = lessons.filter((l) => {
    const k = `${l.type}|${l.assetId || l.pdfUrl || l.playerUrl || l.id}|${l.title}`;
    if (keys.has(k)) return false;
    keys.add(k);
    return true;
  });
  uniq.sort((a, b) => a.order - b.order);

  const name = firstStr(raw, NAME_KEYS) || fallbackName || `Section ${idx + 1}`;
  return {
    id: firstStr(raw, ['_id', 'id', 'folderId', 'folder_id']) || nextId('f'),
    name,
    level: typeof raw.level === 'number' ? raw.level : 1,
    lessons: uniq,
    subfolders,
  };
}

/** Course-details JSON -> folder tree (before the batch layout in api.ts is applied). */

/* ------------------------------------------------------------------ */
/* "tree" format:  { course, tree:[{id,name,children:[...],videos:[],pdfs:[],tests:[]}], catalog:{id:{...}} } */
/* ------------------------------------------------------------------ */

const countLessons = (l: Folder[]): number => l.reduce((n, f) => n + (f.lessons?.length || 0) + countLessons((f.subfolders as Folder[]) || []), 0);

export function parseTreeCourse(json: any): { title: string; folders: Folder[] } | null {
  const base = isObj(json?.data) && !Array.isArray(json.data) && (json.data.tree || json.data.raw_tree) ? json.data : json;
  const tree = Array.isArray(base?.tree) && base.tree.length ? base.tree : Array.isArray(base?.raw_tree) && base.raw_tree.length ? base.raw_tree : null;
  if (!tree) return null;
  const catalog: Record<string, any> = isObj(base.catalog) && !Array.isArray(base.catalog) ? base.catalog : {};
  const title = firstStr(base.course, ['title', 'name']) || firstStr(base, ['title', 'name']);

  // an entry in videos[] / pdfs[] is either a full object or just an id that is described in catalog
  const resolve = (entry: any): any => {
    if (typeof entry === 'string' || typeof entry === 'number') {
      const c = catalog[String(entry)];
      return isObj(c) ? { id: String(entry), ...c } : { id: String(entry) };
    }
    if (!isObj(entry)) return null;
    const k = str(entry.id ?? entry._id ?? entry.item_id ?? entry.ref);
    const c = k ? catalog[k] : null;
    const merged = isObj(c) && !Array.isArray(c) ? { ...c, ...entry } : entry;
    return isObj(merged.source) ? { ...merged, ...merged.source } : merged;
  };

  let seq = 0;
  const makeLesson = (entry: any, kind: 'video' | 'pdf', owner = ''): Lesson | null => {
    const item = resolve(entry);
    if (!item) return null;
    seq += 1;
    const assetId = kind === 'video' ? videoIdOf(item) : '';
    const ownId = firstStr(item, ['_id', 'id', 'item_id', 'refId']);
    // stable id: the same lesson must get the same id on every load (it is used in the player URL)
    const id = ownId || (assetId ? assetId : `${owner || 'x'}-${kind === 'pdf' ? 'p' : 'v'}${seq}`);
    const title = firstStr(item, TITLE_KEYS) || (kind === 'pdf' ? 'Notes' : `Class ${seq}`);
    if (kind === 'pdf') {
      const pdfUrl = str(item.pdfUrl) || str(item.pdf_url) || str(item.url) || str(item.link) || str(item.file) || findPdf(item) || null;
      return { id, title, type: 'pdf', duration: 'PDF Document', pdfUrl: pdfUrl && fixUrl(pdfUrl) || null, isFree: true, order: 1000 + seq };
    }
    const media = directMediaOf(item);
    return {
      id, title, type: 'video',
      duration: str(item.duration) || 'Recorded Lecture',
      teacher: cleanTeacher(item.teacher || item.instructor || item.description || ''),
      date: str(item.startTime) || str(item.scheduledStart) || str(item.date) || str(item.createdAt) || str(item.created_at),
      thumbnail: pickImage(item) || VIDEO_THUMBNAIL,
      assetId, playerUrl: media, pdfUrl: null, isFree: true, order: seq,
    };
  };

  const itemsOf = (node: any): Lesson[] => {
    const out: Lesson[] = [];
    const seen = new Set<string>(); // videos/pdfs listed on the node AND in catalog[node.id] must count once
    const owner = str(node.id);
    const add = (arr: any, kind: 'video' | 'pdf') => {
      if (!Array.isArray(arr)) return;
      arr.forEach((e) => {
        const l = makeLesson(e, kind, owner);
        if (!l) return;
        const key = `${kind}|${l.assetId || l.pdfUrl || ''}|${l.title}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(l);
      });
    };
    add(node.videos, 'video');
    add(node.pdfs, 'pdf');
    // items kept in catalog under the folder id (only used when the node itself has none)
    if (!out.length) {
      const cat = catalog[owner];
      if (Array.isArray(cat)) cat.forEach((e) => { const k = isObj(e) ? lessonKind(resolve(e)) : null; if (k) add([e], k); });
      else if (isObj(cat)) { add(cat.videos, 'video'); add(cat.pdfs, 'pdf'); }
    }
    return out;
  };

  const build = (node: any, level: number): Folder | null => {
    if (!isObj(node)) return null;
    const subfolders = (Array.isArray(node.children) ? node.children : []).map((c: any) => build(c, level + 1)).filter(Boolean) as Folder[];
    const lessons = itemsOf(node);
    if (!lessons.length && !subfolders.length) return null;
    return { id: str(node.id) || nextId('f'), name: firstStr(node, NAME_KEYS) || 'Folder', level, lessons, subfolders };
  };

  let folders = tree.map((n: any) => build(n, 1)).filter(Boolean) as Folder[];
  // catalog may hold every item on its own (keyed by item id) - last resort so something always shows
  if (!countLessons(folders) && Object.keys(catalog).length) {
    const loose = looseParseCourse(catalog);
    if (loose.folders.length) folders = loose.folders;
  }
  return { title, folders: pruneFolders(folders) };
}

export function parseCourseDetails(json: any): { title: string; folders: Folder[] } {
  const treeRes = parseTreeCourse(json);
  if (treeRes && countLessons(treeRes.folders) > 0) return treeRes;
  const root = isObj(json?.data) && !Array.isArray(json.data) ? json.data : json;
  const title = firstStr(root, ['title', 'name', 'courseTitle', 'course_title', 'batchName']) || firstStr(json, ['title', 'name', 'courseTitle']);

  const top = pickArray(json, ['folders', 'subjects', 'classes', 'chapters', 'content', 'contents', 'curriculum', 'syllabus', 'sections', 'items']);
  let folders: Folder[] = [];
  if (top) {
    top.forEach((raw, i) => {
      if (!isObj(raw)) return;
      const lesson = !hasChildArrays(raw) ? toLesson(raw, i) : null;
      if (lesson) return; // a lonely lesson at top level is handled below
      const f = toFolder(raw, i);
      if (f) folders.push(f);
    });
    const loose = top.filter((r) => isObj(r) && !hasChildArrays(r)).map((r, i) => toLesson(r, i)).filter(Boolean) as Lesson[];
    if (loose.length) folders.push({ id: nextId('f'), name: 'Lectures & Documents', level: 1, lessons: loose, subfolders: [] });
  } else if (isObj(root)) {
    const f = toFolder(root, 0, title || 'Course');
    if (f && (f.lessons?.length || f.subfolders?.length)) folders = f.lessons?.length ? [f] : f.subfolders || [];
  }
  const res = { title, folders: pruneFolders(folders) };
  // the strict parser may find only part of an unusual shape: also run the loose one and keep whichever finds more
  const count = (l: Folder[]): number => l.reduce((n, f) => n + (f.lessons?.length || 0) + count((f.subfolders as Folder[]) || []), 0);
  const loose = looseParseCourse(json);
  if (count(loose.folders) > count(res.folders)) return { title: title || loose.title, folders: loose.folders };
  return res;
}

function pruneFolders(list: Folder[]): Folder[] {
  return list
    .map((f) => ({ ...f, subfolders: pruneFolders((f.subfolders as Folder[]) || []) }))
    .filter((f) => (f.lessons?.length || 0) > 0 || (f.subfolders?.length || 0) > 0);
}

const containsArray = (o: any, d: number): boolean =>
  Array.isArray(o) ? o.some((x) => isObj(x) || Array.isArray(x)) || d === 0 : isObj(o) && d < 6 && Object.values(o).some((v) => (Array.isArray(v) && v.some((x) => isObj(x))) || (isObj(v) && containsArray(v, d + 1)));

const GENERIC_KEYS = /^(data|result|results|response|payload|items|content|contents|folders|subfolders|children|lessons|videos|subjects|chapters|topics|sections|classes|modules|units|files|pdfs|notes|lectures|course|batch|source|list|categories|materials|documents)$/i;

/** Last resort: walk ANY json shape, collect every video / pdf anywhere and group them under the nearest named parent. */
export function looseParseCourse(json: any): { title: string; folders: Folder[] } {
  const root: any = { id: nextId('f'), name: 'root', level: 1, lessons: [], subfolders: [] };
  const base = isObj(json?.data) && !Array.isArray(json.data) ? json.data : json;
  const title = firstStr(base, ['title', 'name', 'courseTitle', 'course_title', 'batchName']);
  const mk = (name: string): any => ({ id: nextId('f'), name, level: 1, lessons: [], subfolders: [] });

  const walk = (node: any, cur: any, depth: number): void => {
    if (node == null || depth > 14) return;
    if (Array.isArray(node)) { node.forEach((c) => walk(c, cur, depth + 1)); return; }
    if (!isObj(node)) return;
    if (!containsArray(node, 0)) {
      const l = toLesson(node, cur.lessons.length);
      if (l) { cur.lessons.push(l); return; }
    }
    let target = cur;
    const name = firstStr(node, NAME_KEYS);
    const hasKids = Object.values(node).some((v) => Array.isArray(v) || isObj(v));
    if (depth > 0 && hasKids && name) { target = mk(name); cur.subfolders.push(target); }
    for (const [k, v] of Object.entries(node)) {
      if (!Array.isArray(v) && !isObj(v)) continue;
      if (!GENERIC_KEYS.test(k) && !/^\d+$/.test(k) && !firstStr(v as any, NAME_KEYS) && (Array.isArray(v) || Object.values(v as any).some((x) => Array.isArray(x)))) {
        const f = mk(k); target.subfolders.push(f); walk(v, f, depth + 1);
      } else walk(v, target, depth + 1);
    }
  };
  walk(base, root, 0);

  const folders: any[] = [...root.subfolders];
  if (root.lessons.length) folders.unshift({ ...mk('Lectures & Documents'), lessons: root.lessons });
  return { title, folders: pruneFolders(folders) };
}

/* ------------------------------------------------------------------ */
/* Video                                                               */
/* ------------------------------------------------------------------ */

export interface VideoInfo {
  id: string;
  title: string;
  hlsUrl: string;
  dashUrl: string;
  mp4Url: string;
  thumbnail: string;
  drmToken: string | null;
  drmLicenseUrl: string | null;
  pdfUrl: string | null;
  /** web player page from the API (api.php?video= -> video_url), used as a fallback / "open in new tab" link */
  pageUrl: string;
  /** every other link found in the response */
  links: string[];
}

const vidRe = /\.(mp4|webm|m4v|mov)(\?|#|$)/i;

/** Reads ANY response shape of api.php?video=<id> and pulls out the playable link(s). */
export function parseVideoInfo(json: any, id: string): VideoInfo {
  const info: VideoInfo = { id, title: '', hlsUrl: '', dashUrl: '', mp4Url: '', thumbnail: '', drmToken: null, drmLicenseUrl: null, pdfUrl: null, pageUrl: '', links: [] };
  const visit = (o: any, key: string, depth: number) => {
    if (o == null || depth > 8) return;
    if (typeof o === 'string') {
      let v = o.trim();
      if (!v) return;
      // JSON hidden inside a string
      if ((v[0] === '{' || v[0] === '[') && depth < 8) { try { return visit(JSON.parse(v), key, depth + 1); } catch { /* not json */ } }
      if (v.startsWith('//')) v = 'https:' + v;
      if (isHttp(v)) {
        v = v.replace(/^http:\/\//i, 'https://');
        if (/m3u8/i.test(v) || /playback_url|^hls/i.test(key)) { if (!info.hlsUrl) info.hlsUrl = v; }
        else if (/\.mpd(\?|#|$)/i.test(v) || /dash/i.test(key)) { if (!info.dashUrl) info.dashUrl = v; }
        else if (vidRe.test(v)) { if (!info.mp4Url) info.mp4Url = v; }
        else if (/license/i.test(key)) { if (!info.drmLicenseUrl) info.drmLicenseUrl = v; }
        else if (imgRe.test(v) || /thumb|cover|poster|image/i.test(key)) { if (!info.thumbnail) info.thumbnail = v; }
        else if (pdfRe.test(v)) { if (!info.pdfUrl) info.pdfUrl = v; }
        else if (/video_?url|player|watch|embed|page|stream|^url$|^link$|^src$/i.test(key)) { if (!info.pageUrl) info.pageUrl = v; else info.links.push(v); }
        else info.links.push(v);
      } else if (/^(token|access_token|accesstoken|code|drm_token|drmtoken)$/i.test(key) && !info.drmToken) {
        info.drmToken = v;
      } else if (/^(title|name)$/i.test(key) && !info.title) {
        info.title = v;
      }
      return;
    }
    if (Array.isArray(o)) return o.forEach((v) => visit(v, key, depth + 1));
    if (isObj(o)) Object.entries(o).forEach(([k, v]) => visit(v, k, depth + 1));
  };
  visit(json, '', 0);
  if (!info.pageUrl && info.links.length) info.pageUrl = info.links[0];
  if (!info.pageUrl && info.drmToken) info.pageUrl = `https://targetboard.co.in/dashboard/video?v=${encodeURIComponent(info.drmToken)}`;
  return info;
}

const videoCache = new Map<string, Promise<VideoInfo | null>>();
/** What the video API answered (or why it failed) - shown under "Technical details" in the player. */
export let lastVideoDebug = '';

/** api.php?video=<id>  (the NEW video API only). Never throws: the player has its own fallbacks when this returns null. */
export function fetchVideoInfo(videoId: string): Promise<VideoInfo | null> {
  const id = (videoId || '').trim();
  if (!id) return Promise.resolve(null);
  let p = videoCache.get(id);
  if (!p) {
    p = apiGet(`video=${encodeURIComponent(id)}`, true)
      .then((json) => {
        const src = json && json.__text ? { text: json.__text, links: (String(json.__text).match(/https?:\/\/[^\s"'<>\\]+/g) || []) } : json;
        const info = parseVideoInfo(src, id);
        const ok = info.hlsUrl || info.dashUrl || info.mp4Url || info.drmToken || info.pageUrl;
        lastVideoDebug = ok
          ? `video api ok: ${info.hlsUrl ? 'hls ' : ''}${info.dashUrl ? 'dash ' : ''}${info.mp4Url ? 'mp4 ' : ''}${info.drmToken ? 'token ' : ''}${info.pageUrl ? 'page' : ''}`
          : 'video api returned no link: ' + JSON.stringify(json).slice(0, 300);
        return ok ? info : null;
      })
      .catch((e) => { lastVideoDebug = 'video api failed: ' + (e?.message || e); videoCache.delete(id); return null; });
    videoCache.set(id, p);
  }
  return p;
}
