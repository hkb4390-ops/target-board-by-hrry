import { Folder } from '../types';

const DEVANAGARI = /[\u0900-\u097F]/;

export interface ParsedName {
  /** chapter number, when the name looks like "Chapter - 3 ( Title )" */
  num?: string;
  title: string;
  /** second-language name, e.g. "भौतिक विज्ञान" for "PHYSICS - भौतिक विज्ञान" */
  sub?: string;
}

/**
 * "Chapter - 2 ( सरल रेखा में गति )"  -> { num: "2", title: "सरल रेखा में गति" }
 * "PHYSICS - भौतिक विज्ञान"           -> { title: "Physics", sub: "भौतिक विज्ञान" }
 * "Poetry Section"                    -> { title: "Poetry Section" }
 */
export function parseName(raw: string): ParsedName {
  const name = (raw || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return { title: 'Untitled' };

  const chapter = name.match(/^chapter\s*[-–:]?\s*(\d+)\s*(?:\(\s*([\s\S]*?)\s*\))?$/i);
  if (chapter) {
    return chapter[2]
      ? { num: chapter[1], title: chapter[2] }
      : { title: `Chapter ${chapter[1]}` };
  }

  const bilingual = name.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (bilingual && DEVANAGARI.test(bilingual[2]) && !DEVANAGARI.test(bilingual[1])) {
    const en = bilingual[1].toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
    return { title: en, sub: bilingual[2] };
  }
  return { title: name };
}

export type SubjectKey = 'physics' | 'chemistry' | 'biology' | 'maths' | 'english' | 'hindi' | 'other';

export function subjectKey(name: string): SubjectKey {
  const n = (name || '').toLowerCase();
  if (/physic|भौतिक/.test(n)) return 'physics';
  if (/chem|रसायन/.test(n)) return 'chemistry';
  if (/bio|जीव/.test(n)) return 'biology';
  if (/math|गणित/.test(n)) return 'maths';
  if (/english|अंग्रेज/.test(n)) return 'english';
  if (/hindi|हिंदी|हिन्दी/.test(n)) return 'hindi';
  return 'other';
}

export interface FolderStats {
  lectures: number;
  notes: number;
  /** real chapters: folders that hold classes/notes directly */
  chapters: number;
}

export function folderStats(folder: Folder): FolderStats {
  const s: FolderStats = { lectures: 0, notes: 0, chapters: 0 };
  const walk = (n: Folder) => {
    (n.lessons || []).forEach((l) => (l.type === 'video' ? s.lectures++ : s.notes++));
    if (n.subfolders && n.subfolders.length > 0) n.subfolders.forEach(walk);
    else if ((n.lessons || []).length > 0) s.chapters++;
  };
  walk(folder);
  return s;
}

/** True when the folder only groups other folders (a "section" such as Poetry / Prose / Grammar) */
export const isSection = (f: Folder) => (f.subfolders?.length || 0) > 0;

/** Folder trail (subject > section > chapter) that holds a lesson, at any depth */
export function findLessonPath(folders: Folder[], lessonId: string, trail: Folder[] = []): Folder[] | null {
  for (const f of folders) {
    const t = [...trail, f];
    if (f.lessons?.some((l) => l.id === lessonId)) return t;
    const deeper = findLessonPath(f.subfolders || [], lessonId, t);
    if (deeper) return deeper;
  }
  return null;
}

/** Turn a list of folder ids (from the URL) back into the folder trail; stops at the first unknown id */
export function resolvePath(folders: Folder[], ids: string[]): Folder[] {
  const out: Folder[] = [];
  let level = folders;
  for (const id of ids) {
    const node = level.find((f) => f.id === id);
    if (!node) break;
    out.push(node);
    level = node.subfolders || [];
  }
  return out;
}

/** Link back to the exact folder in the course page */
export const coursePathLink = (courseId: string, trail: Folder[]) =>
  trail.length ? `/course/${courseId}?p=${trail.map((f) => f.id).join(',')}` : `/course/${courseId}`;
