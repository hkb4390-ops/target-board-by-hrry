import { Course } from '../types';
import { useLocalPref } from './prefs';

/**
 * The classes a student can pick, in the order of the "Select Streams" screen.
 * `board: true` means the student also picks a board + medium (Class 9 to 12 only).
 */
export const STREAMS: { label: string; test: RegExp; board: boolean }[] = [
  { label: 'Class - 9', test: /(class|कक्षा)\s*-?\s*9(?!\d)|\b9th\b/i, board: true },
  { label: 'Class - 10', test: /(class|कक्षा)\s*-?\s*10(?!\d)|\b10th\b/i, board: true },
  { label: 'Class - 11', test: /(class|कक्षा)\s*-?\s*11(?!\d)|\b11th\b/i, board: true },
  { label: 'Class - 12', test: /(class|कक्षा)\s*-?\s*12(?!\d)|\b12th\b/i, board: true },
  { label: 'Spoken English', test: /spoken/i, board: false },
  { label: 'Polytechnic Batch 2026', test: /polytechnic/i, board: false },
  { label: 'CUET - 2026', test: /cuet/i, board: false },
];

/** Boards shown on the "Select your board" list. `test` finds the board in a batch title. */
export const BOARDS: { id: string; label: string; logo: string; test: RegExp }[] = [
  {
    id: 'bihar',
    label: 'Bihar Board',
    logo: 'https://i.ibb.co/21NBY09k/file-00000000d8648211a7e4c852e1340a2b.png',
    test: /bihar|बिहार/i,
  },
  {
    id: 'up',
    label: 'Uttar Pradesh Board',
    logo: 'https://i.ibb.co/21NBY09k/file-00000000d8648211a7e4c852e1340a2b.png',
    test: /\bu\.?\s?p\.?[\s-]*board|uttar\s*pradesh|उत्तर\s*प्रदेश|यूपी/i,
  },
];

/** Mediums shown in the "Please Select Your Medium" sheet. `test` finds the medium in a batch title. */
export const MEDIUMS: { id: string; label: string; test: RegExp }[] = [
  { id: 'hindi', label: 'Hindi Medium', test: /hindi\s*medium|हिं?दी\s*माध्यम|हिन्दी\s*माध्यम/i },
  { id: 'english', label: 'English Medium', test: /english\s*medium|अंग्रेज़?ी\s*माध्यम/i },
];

/** A batch whose title names no board belongs to this board; one with no medium is Hindi medium */
const UNTAGGED_BOARD = 'bihar';
const UNTAGGED_MEDIUM = 'hindi';

const textOf = (c: Course) => `${c.category || ''} ${c.title || ''}`;

/** Boards a batch is for ("FOR ALL BOARD" batches are for every board) */
export const boardsOf = (c: Course): string[] => {
  const t = textOf(c);
  if (/all\s*boards?/i.test(t)) return BOARDS.map((b) => b.id);
  const hit = BOARDS.filter((b) => b.test.test(t)).map((b) => b.id);
  return hit.length ? hit : [UNTAGGED_BOARD];
};

export const mediumOf = (c: Course): string => MEDIUMS.find((m) => m.test.test(textOf(c)))?.id ?? UNTAGGED_MEDIUM;

/** [selected class label or 'all', setter]; an old or unknown saved value counts as 'all' */
export function useClass(): [string, (v: string) => void] {
  const [raw, set] = useLocalPref<string>('tb_class', 'all');
  return [STREAMS.some((s) => s.label === raw) ? raw : 'all', set];
}

/** [selected board id or 'all', setter] */
export function useBoard(): [string, (v: string) => void] {
  const [raw, set] = useLocalPref<string>('tb_board', 'all');
  return [BOARDS.some((b) => b.id === raw) ? raw : 'all', set];
}

/** [selected medium id or 'all', setter] */
export function useMedium(): [string, (v: string) => void] {
  const [raw, set] = useLocalPref<string>('tb_medium', 'all');
  return [MEDIUMS.some((m) => m.id === raw) ? raw : 'all', set];
}

/** Does this class need a board + medium choice? */
export const needsBoard = (cls: string) => !!STREAMS.find((s) => s.label === cls)?.board;

export const matchesClass = (c: Course, cls: string, board = 'all', medium = 'all') => {
  if (cls === 'all') return true;
  const s = STREAMS.find((x) => x.label === cls);
  if (!s || !s.test.test(textOf(c))) return false;
  if (!s.board) return true; // Spoken English, Polytechnic, CUET: no board / medium
  if (board !== 'all' && !boardsOf(c).includes(board)) return false;
  if (medium !== 'all' && mediumOf(c) !== medium) return false;
  return true;
};

/** "Class - 11 · Bihar Board · Hindi Medium" (board and medium only for Class 9 to 12) */
export const selectionLabel = (cls: string, board: string, medium: string) => {
  if (cls === 'all') return '';
  const parts = [cls];
  if (needsBoard(cls)) {
    const b = BOARDS.find((x) => x.id === board);
    const m = MEDIUMS.find((x) => x.id === medium);
    if (b) parts.push(b.label);
    if (m) parts.push(m.label);
  }
  return parts.join(' · ');
};
