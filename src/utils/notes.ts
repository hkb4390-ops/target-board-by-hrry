import { useLocalPref } from './prefs';

export interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

/** bg is the note colour, bar is the stronger accent used for the strip and the colour dots */
export const NOTE_COLORS = [
  { id: 'yellow', bg: '#FEF6C7', bar: '#FFD60A' },
  { id: 'peach', bg: '#FFEBD6', bar: '#F2A65A' },
  { id: 'pink', bg: '#FDE0E6', bar: '#E88AA2' },
  { id: 'green', bg: '#DDF1E4', bar: '#6FBF8E' },
  { id: 'blue', bg: '#DDE9F7', bar: '#76A3D6' },
  { id: 'purple', bg: '#E8E1F5', bar: '#A38BD0' },
];
export const noteColor = (id: string) => NOTE_COLORS.find((c) => c.id === id) || NOTE_COLORS[0];

const KEY = 'tb_notes';

export const newNoteId = () => `n_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function loadNotes(): Note[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeNotes(list: Note[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new CustomEvent('tb-pref', { detail: KEY }));
}

export function upsertNote(note: Note) {
  const list = loadNotes();
  const i = list.findIndex((n) => n.id === note.id);
  if (i >= 0) list[i] = note; else list.push(note);
  writeNotes(list);
}

export function deleteNote(id: string) {
  writeNotes(loadNotes().filter((n) => n.id !== id));
}

/** All saved notes, pinned first and newest first; updates live when a note changes */
export function useNotes(): Note[] {
  const [list] = useLocalPref<Note[]>(KEY, []);
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}
