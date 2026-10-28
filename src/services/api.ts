/**
 * API Service for Target Board
 * Fetches dynamic courses and course contents from live endpoints
 */

import { Course, CourseContent, Folder, Lesson } from '../types';
import fallbackData from '../data/coursesFallback.json';
import { VIDEO_THUMBNAIL } from '../branding';
import { cleanTeacher } from '../utils/format';

import { API_BASE, apiGet, extractCourseList, courseIdOf, parseCourseDetails, pickImage, fixUrl } from './tbApi';

export const COURSES_API_URL = `${API_BASE}?courses`;
export const COURSE_CONTENT_API_URL = `${API_BASE}?courseid=`;


/**
 * The API does not always keep a PDF link in the same field. Look through the item for the real link:
 * 1) any link ending in .pdf  2) any link under a pdf / document / file style key  3) a plain url on a pdf-typed item.
 */
export function findPdfUrl(...items: any[]): string | null {
  const isHttp = (v: any) => typeof v === 'string' && /^https?:\/\//i.test(v.trim());
  const isPdfLink = (v: any) => isHttp(v) && /\.pdf(\?|#|$)/i.test(v.trim().split(' ')[0]);
  const walk = (o: any, depth: number, test: (k: string, v: any) => boolean, key = ''): string | null => {
    if (o == null || depth > 4) return null;
    if (typeof o === 'string') return test(key, o) ? o.trim() : null;
    if (Array.isArray(o)) { for (const v of o) { const r = walk(v, depth + 1, test, key); if (r) return r; } return null; }
    if (typeof o === 'object') { for (const [k, v] of Object.entries(o)) { const r = walk(v, depth + 1, test, k); if (r) return r; } }
    return null;
  };
  const docKey = /pdf|doc|file|attach|note|download/i;
  for (const it of items) { const r = walk(it, 0, (_k, v) => isPdfLink(v)); if (r) return r; }
  for (const it of items) { const r = walk(it, 0, (k, v) => isHttp(v) && docKey.test(k)); if (r) return r; }
  for (const it of items) {
    if (it && (it.type === 'pdf' || it.contentType === 'pdf')) {
      const r = walk(it, 0, (k, v) => isHttp(v) && /^(url|link|src|source|path)$/i.test(k)); if (r) return r;
    }
  }
  return null;
}

// Folder tree from the new API (class > subject > chapter > videos / pdfs) + the batch layout below
function normalizeFolders(json: any, courseTitle = ''): { title: string; folders: Folder[] } {
  const parsed = parseCourseDetails(json);
  return { title: parsed.title, folders: organizeBatch(parsed.folders, courseTitle || parsed.title) };
}

/* ---------- Batch layout: [Class folder > 6 subjects] + [Pariksha Special > everything else] ---------- */

const SUBJECT_ORDER = ['physics', 'chemistry', 'biology', 'maths', 'english', 'hindi'] as const;
// "PHYSICS - भौतिक विज्ञान", "Maths", "हिंदी" ... but NOT "Physics Important Questions"
const SUBJECT_NAME = /^(physics|chemistry|biology|maths?|mathematics|english|hindi)\s*([-–:].*)?$|^(भौतिक विज्ञान|रसायन विज्ञान|जीव विज्ञान|गणित|अंग्रेजी|हिंदी|हिन्दी)\s*$/i;
const SPECIAL_NAME = /परीक्षा|pariksha|exam\s*special/i;
const SPECIAL_NAME_2 = /common\s*class/i;
export const SPECIAL_TITLE = 'परीक्षा स्पेशल Youtube Common Class';

const subjectOf = (name: string): string => {
  const n = (name || '').trim().toLowerCase();
  if (!SUBJECT_NAME.test(n) && !SUBJECT_NAME.test((name || '').trim())) return '';
  if (/physic|भौतिक/.test(n)) return 'physics';
  if (/chem|रसायन/.test(n)) return 'chemistry';
  if (/bio|जीव/.test(n)) return 'biology';
  if (/math|गणित/.test(n)) return 'maths';
  if (/english|अंग्रेज/.test(n)) return 'english';
  if (/hindi|हिंदी|हिन्दी/.test(n)) return 'hindi';
  return '';
};

/**
 * Rebuilds the batch the way students expect it:
 *   1) the class folder, holding ONLY the subjects (Physics, Chemistry, Biology, Maths, English, Hindi)
 *   2) "Pariksha Special", holding every other folder / class / note of the batch
 * Batches that have no subjects (Polytechnic, CUET, Spoken English...) keep the old behaviour.
 */
function organizeBatch(roots: Folder[], courseTitle: string): Folder[] {
  // 1) find each subject once (first match wins), remembering which folder holds it
  const found = new Map<string, { node: Folder; parent: Folder | null; trail: Folder[] }>();
  const walk = (nodes: Folder[], parent: Folder | null, trail: Folder[]) => {
    nodes.forEach((n) => {
      const key = subjectOf(n.name);
      if (key && (n.subfolders?.length || n.lessons?.length) && !found.has(key)) {
        found.set(key, { node: n, parent, trail });
        return; // do not look for subjects inside a subject
      }
      walk(n.subfolders || [], n, [...trail, n]);
    });
  };
  walk(roots, null, []);
  if (found.size < 3) return unwrapContainers(roots);

  const subjects = SUBJECT_ORDER.filter((k) => found.has(k)).map((k) => found.get(k)!.node);
  const subjectSet = new Set<Folder>(subjects);
  const firstParent = found.get(SUBJECT_ORDER.find((k) => found.has(k))!)!.parent;

  // 2) cut the subjects out; remember every folder on the way down (batch root, class folder ...) as a plain wrapper
  const wrappers = new Set<Folder>();
  const cut = (nodes: Folder[], trail: Folder[]): Folder[] => {
    const out: Folder[] = [];
    nodes.forEach((n) => {
      if (subjectSet.has(n)) { trail.forEach((t) => wrappers.add(t)); return; }
      const kids = cut(n.subfolders || [], [...trail, n]);
      out.push({ ...n, subfolders: kids });
    });
    return out;
  };
  const rest = cut(roots, []);
  // `cut` copied the nodes, so map the wrapper originals to their copies by id
  const wrapperIds = new Set<string>([...wrappers].map((w) => w.id));

  // 3) an existing "Pariksha Special" folder is reused; everything else is poured into it
  let base: Folder | null = null;
  const pick = (nodes: Folder[], re: RegExp): Folder | null => {
    for (const n of nodes) {
      if (!wrapperIds.has(n.id) && re.test(n.name || '')) return n;
      const d: Folder | null = pick(n.subfolders || [], re);
      if (d) return d;
    }
    return null;
  };
  base = pick(rest, SPECIAL_NAME) || pick(rest, SPECIAL_NAME_2);

  const extraFolders: Folder[] = [];
  const extraLessons: Lesson[] = [];
  const gather = (nodes: Folder[]) => {
    nodes.forEach((n) => {
      if (base && n.id === base.id) return;
      if (wrapperIds.has(n.id)) {
        extraLessons.push(...(n.lessons || []));
        gather(n.subfolders || []);
      } else if ((n.subfolders?.length || 0) > 0 || (n.lessons?.length || 0) > 0) {
        extraFolders.push(n);
      }
    });
  };
  // when the special folder sits inside a wrapper, gather() still skips it by id and keeps its siblings
  gather(rest);

  // 4) the class folder: use the real "Class 10th - All Subject ..." folder when the API has one
  //    (any ancestor of the subjects), otherwise build the name from the batch title. Never a wrapper like "SCIENCE".
  const CLASS_NAME = /class\s*\d{1,2}|\d{1,2}\s*th|all\s*subject/i;
  const ancestors = found.get(SUBJECT_ORDER.find((k) => found.has(k))!)!.trail;
  const classFolder = [...ancestors].reverse().find((f) => CLASS_NAME.test(f.name || "") && !/batch|बैच/i.test(f.name || ""));
  const classNo = (courseTitle.match(/class\s*(\d{1,2})/i) || courseTitle.match(/(\d{1,2})\s*th/i) || [])[1];
  const main: Folder = {
    id: classFolder ? classFolder.id : firstParent ? `tb-main-${firstParent.id}` : 'tb-main',
    name: classFolder ? classFolder.name : (classNo ? `Class ${classNo}th - All Subject ( आगे बढ़िए और पढ़ना शुरू करिए )` : 'All Subjects'),
    level: 1,
    lessons: [],
    subfolders: subjects,
  };

  const out: Folder[] = [main];
  if (base || extraFolders.length || extraLessons.length) {
    out.push({
      id: base ? base.id : 'tb-special',
      name: base ? base.name : SPECIAL_TITLE,
      level: 1,
      lessons: [...(base?.lessons || []), ...extraLessons],
      subfolders: [...(base?.subfolders || []), ...extraFolders],
    });
  }
  return out;
}

/**
 * The API returns: Batch folder (level 0) > Subject > Chapter > items.
 * The UI needs Subjects at the top, so skip any wrapper folder that has no items of its own
 * and whose children are themselves folders of folders.
 */
function unwrapContainers(nodes: Folder[]): Folder[] {
  return nodes.flatMap((n) => {
    const subs = n.subfolders || [];
    const isWrapper = (n.lessons?.length || 0) === 0 && subs.some((s) => (s.subfolders?.length || 0) > 0);
    return isWrapper ? unwrapContainers(subs) : [n];
  });
}


/**
 * Safety net: if the live API gives a PDF without any usable link, borrow the link from the bundled
 * copy of the course (matched by id, then by title). The big file is only loaded when it is needed.
 */
async function backfillPdfUrls(folders: Folder[]): Promise<void> {
  const missing: Lesson[] = [];
  const scan = (f: Folder) => {
    (f.lessons || []).forEach((l) => { if (l.type === 'pdf' && !l.pdfUrl) missing.push(l); });
    (f.subfolders || []).forEach(scan);
  };
  folders.forEach(scan);
  if (!missing.length) return;
  try {
    const mod: any = await import('../data/courseContentFallback.json');
    const data = mod.default || mod;
    const byId = new Map<string, string>();
    const byTitle = new Map<string, string>();
    const norm = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const walk = (o: any) => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      if (o.type === 'pdf' && o.pdfUrl) { byId.set(String(o.id), o.pdfUrl); byTitle.set(norm(o.title), o.pdfUrl); }
      Object.values(o).forEach(walk);
    };
    walk(data);
    missing.forEach((l) => { l.pdfUrl = byId.get(l.id) || byTitle.get(norm(l.title)) || null; });
  } catch (e) {
    console.warn('PDF backfill skipped', e);
  }
}

/**
 * Fetch Course List dynamically from API
 */
const CACHE_TTL = 10 * 60 * 1000;
let coursesCache: { at: number; data: Course[] } | null = null;
const contentCache = new Map<string, { at: number; data: CourseContent }>();

/** Read cached content instantly (used so moving between lessons never reloads the whole course) */
export const getCachedContent = (id: string): CourseContent | null => contentCache.get(id)?.data || null;
export const getCachedCourses = (): Course[] | null => coursesCache?.data || null;

export async function fetchCourses(): Promise<Course[]> {
  if (coursesCache && Date.now() - coursesCache.at < CACHE_TTL) return coursesCache.data;
  const fresh = await fetchCoursesFresh();
  if (fresh.length) coursesCache = { at: Date.now(), data: fresh };
  return fresh;
}

async function fetchCoursesFresh(): Promise<Course[]> {
  try {
    const json = await apiGet('courses');
    const rawList = extractCourseList(json);
    if (!rawList.length) throw new Error('empty course list');

    return rawList.map((item: any) => {
      // Dynamic property detection: id, _id, title, name, description, thumbnail, image, cover, category, instructor, lessons
      const courseId = courseIdOf(item);
      const title = item.title || item.name || item.courseName || item.course_name || item.batchName || item.batch_name || 'Untitled Course';
      const plainDesc = String(item.courseDescription || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      const description = item.description || plainDesc || 'Comprehensive learning curriculum with high-definition video lectures and study notes.';
      const directThumb = [item.courseImage, item.course_image, item.thumbnail, item.thumb, item.image, item.image_url, item.banner, item.poster, item.cover]
        .find((v) => typeof v === 'string' && v.trim());
      const liveThumb = directThumb ? fixUrl(directThumb) : pickImage(item);
      const thumbnail = liveThumb || savedThumbnail(courseIdOf(item), String(item.title || item.name || item.courseName || ''));
      const category = item.category || (() => {
        const m = String(title).match(/(\d{1,2})\s*th/i);
        if (m) return `Class ${m[1]}`;
        if (/cuet/i.test(title)) return 'CUET';
        if (/polytechnic/i.test(title)) return 'Polytechnic';
        return 'General';
      })();
      const instructor = item.instructor || 'STUDYMODSHRRY Faculty';
      const countKey = Object.keys(item).find((k) => /(total|count|num).*(lecture|video|lesson|stream|class)|(lecture|video|lesson|stream)s?_?(count|total)/i.test(k) && Number(item[k]) > 0);
      const totalLectures = Number(item.totalLectures ?? item.total_lectures ?? item.lectures) > 0 ? Number(item.totalLectures ?? item.total_lectures ?? item.lectures) : (countKey ? Number(item[countKey]) : (Array.isArray(item.lessons) ? item.lessons.length : (item.totalStreams || 24)));
      const rating = typeof item.rating === 'number' ? item.rating : 4.9;

      return {
        id: courseId,
        title,
        description,
        thumbnail,
        category,
        totalLectures,
        rating,
        instructor,
        badge: 'FREE',
        price: 0,
        strikeoutPrice: typeof item.price === 'number' && item.price > 0 ? item.price : 999,
        enrolled: false,
        createdAt: String(item.createdAt || item.created_at || ''),
      };
    });
  } catch (err) {
    console.warn('API error fetching courses, using cached fallback data:', err);
    return (fallbackData.data as any[]).map(item => ({
      ...item,
      badge: 'FREE',
      price: 0,
    }));
  }
}

/**
 * Fetch Course Content dynamically for given COURSE_ID
 */
export async function fetchCourseContent(courseId: string): Promise<CourseContent> {
  const cleanId = (courseId || '').trim();
  const hit = contentCache.get(cleanId);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;
  const fresh = await fetchCourseContentFresh(courseId);
  if (fresh.success && fresh.folders.length) {
    contentCache.set(cleanId, { at: Date.now(), data: fresh });
  }
  return fresh;
}

const normTitle = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, '');
/** Thumbnail from the bundled snapshot of the course list, matched by id or title (used when the live item has no usable image). */
function savedThumbnail(id: string, title: string): string {
  const list = ((fallbackData as any).data || []) as any[];
  const hit = list.find((c) => c.id === id) || list.find((c) => normTitle(c.title) === normTitle(title));
  return hit?.thumbnail ? fixUrl(String(hit.thumbnail)) : '';
}

/** Compact description of a JSON value (keys, array sizes, types) used only for the on-screen debug message. */
function shapeOf(v: any, d: number): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.length}${v.length && d < 5 ? ' of ' + shapeOf(v[0], d + 1) : ''}]`;
  if (typeof v === 'object') {
    if (d > 5) return '{..}';
    return '{' + Object.keys(v).slice(0, 14).map((k) => `${k}:${shapeOf(v[k], d + 1)}`).join(',') + '}';
  }
  if (typeof v === 'string') return v.length > 14 ? 'str' : JSON.stringify(v);
  return String(v);
}

async function fetchCourseContentFresh(courseId: string): Promise<CourseContent> {
  const cleanId = (courseId || '').trim();
  if (!cleanId) {
    throw new Error('Course ID is required');
  }

  try {
    const json = await apiGet(`courseid=${encodeURIComponent(cleanId)}`);
    const known = coursesCache?.data.find((c) => c.id === cleanId)?.title || '';
    const { title, folders: normalizedFolders } = normalizeFolders(json, known);
    if (!normalizedFolders.length) {
      throw new Error(`course has no folders | id=${cleanId} | shape: ${shapeOf(json, 0).slice(0, 450)}`);
    }
    await backfillPdfUrls(normalizedFolders);

    return {
      success: true,
      courseId: cleanId,
      title: title || known || 'Course Curriculum',
      source: json?.source || 'api',
      folders: normalizedFolders,
    };
  } catch (err) {
    console.warn(`Failed to fetch content from API for course ${cleanId}, checking local fallback...`, err);
    
    return {
      success: false,
      courseId: cleanId,
      title: 'Course Content Unavailable',
      error: (err as any)?.message || 'unknown error',
      folders: [],
    };
  }
}

/**
 * Utility to recursively extract all lessons from a folder tree in sequential order
 */
export function extractAllLessons(folders: Folder[]): Lesson[] {
  const result: Lesson[] = [];
  const scan = (f: Folder) => {
    if (f.lessons && f.lessons.length > 0) {
      result.push(...f.lessons);
    }
    if (f.subfolders && f.subfolders.length > 0) {
      f.subfolders.forEach(scan);
    }
  };
  folders.forEach(scan);
  return result;
}

/**
 * Returns exact Lecture and Note counts for a Subject folder
 * e.g., "Lecture 58, Notes 64"
 */
export function getSubjectStats(folder: Folder): { lectures: number; notes: number; chapters: number } {
  let lectures = 0;
  let notes = 0;
  const chapters = folder.subfolders?.length || 0;

  const countItems = (node: any) => {
    if (node.lessons && Array.isArray(node.lessons)) {
      node.lessons.forEach((l: any) => {
        if (l.type === 'video') lectures++;
        else notes++;
      });
    }
    if (node.subfolders && Array.isArray(node.subfolders)) {
      node.subfolders.forEach(countItems);
    }
  };

  countItems(folder);

  return { lectures, notes, chapters };
}

