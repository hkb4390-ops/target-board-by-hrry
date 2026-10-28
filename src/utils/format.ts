/** "Physics Chapter - 2 // Class - 3"  ->  { main: "Class - 3", context: "Physics Chapter - 2" } */
export function splitTitle(title: string): { main: string; context: string } {
  const raw = (title || '').trim();
  const parts = raw.split(/\s*\/\/\s*/).filter(Boolean);
  if (parts.length < 2) return { main: raw || 'Untitled', context: '' };
  return { main: parts[parts.length - 1], context: parts.slice(0, -1).join(' · ') };
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function cleanTeacher(desc?: string): string {
  const t = (desc || '').replace(/^\s*by\s*[-:]?\s*/i, '').trim();
  return t.replace(/parince/i, 'Prince');
}

/** Natural order so "Class - 2" sorts before "Class - 10" */
export const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
