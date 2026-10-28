import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Bookmark, MoreVertical, Check, CheckCircle2, Trash2 } from 'lucide-react';
import { Note, NOTE_COLORS, noteColor, loadNotes, upsertNote, deleteNote, newNoteId } from '../utils/notes';

export const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const noteId = useRef(id === 'new' || !id ? newNoteId() : id);
  const saved = useRef<Note | undefined>(loadNotes().find((n) => n.id === noteId.current));
  const missing = id !== 'new' && !saved.current;

  const [title, setTitle] = useState(saved.current?.title || '');
  const [body, setBody] = useState(saved.current?.body || '');
  const [color, setColor] = useState(saved.current?.color || 'yellow');
  const [pinned, setPinned] = useState(saved.current?.pinned || false);
  const [completed, setCompleted] = useState(saved.current?.completed || false);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const latest = useRef({ title, body, color, pinned, completed });
  latest.current = { title, body, color, pinned, completed };
  const deleted = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const persist = () => {
    if (deleted.current) return;
    const v = latest.current;
    if (!v.title.trim() && !v.body.trim()) {
      if (saved.current) deleteNote(noteId.current); // emptied on purpose
      return;
    }
    const now = Date.now();
    const note: Note = { id: noteId.current, ...v, createdAt: saved.current?.createdAt || now, updatedAt: now };
    saved.current = note;
    upsertNote(note);
    setSavedAt(now);
  };

  // Auto-save while typing, and once more when the screen closes
  useEffect(() => {
    const t = setTimeout(persist, 400);
    return () => clearTimeout(t);
  }, [title, body, color, pinned, completed]);
  useEffect(() => () => persist(), []);

  // Textarea grows with the text
  useEffect(() => {
    const el = area.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.max(el.scrollHeight, 280)}px`; }
  }, [body]);

  if (missing) return <Navigate to="/notes" replace />;

  const c = noteColor(color);
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/notes'));
  const remove = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    deleted.current = true;
    deleteNote(noteId.current);
    navigate('/notes', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(to_bottom,var(--head),var(--page)_55%)]">
      <header className="sticky top-0 z-30 bg-(--head)">
        <div className="max-w-3xl mx-auto h-16 px-3 flex items-center gap-1">
          <button onClick={back} aria-label="Back" className="w-11 h-11 rounded-full flex items-center justify-center text-(color:--ink) cursor-pointer">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <span className="flex-1 text-xs font-semibold text-(color:--muted) pl-1">{savedAt ? 'Saved' : ''}</span>
          <button onClick={() => setPinned(!pinned)} aria-label={pinned ? 'Unpin note' : 'Pin note'} aria-pressed={pinned} className="w-11 h-11 rounded-full flex items-center justify-center text-(color:--ink) cursor-pointer">
            <Bookmark className={`w-6 h-6 ${pinned ? 'fill-current' : ''}`} />
          </button>
          <button onClick={() => { setConfirmDelete(false); setMenu(true); }} aria-label="More" className="w-11 h-11 rounded-full flex items-center justify-center text-(color:--ink) cursor-pointer">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-3 pb-28">
        <div className="rounded-3xl overflow-hidden border border-black/10 shadow-sm" style={{ background: c.bg, color: '#1F2937' }}>
          <div className="h-3" style={{ background: c.bar }} />
          <div className="p-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              maxLength={120}
              autoFocus={id === 'new'}
              className="w-full bg-transparent text-3xl font-heading font-bold placeholder-gray-400 focus:outline-none"
            />
            <textarea
              ref={area}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start writing"
              className="mt-4 w-full bg-transparent text-lg leading-relaxed placeholder-gray-400 focus:outline-none resize-none overflow-hidden"
            />
          </div>
        </div>
      </main>

      {/* Colour dots */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-(--card) border-t border-(color:--line)" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between px-5 py-3">
          {NOTE_COLORS.map((x) => (
            <button
              key={x.id}
              onClick={() => setColor(x.id)}
              aria-label={`${x.id} note`}
              aria-pressed={color === x.id}
              className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: x.bg, border: `2px solid ${color === x.id ? '#111' : x.bar}` }}
            >
              {color === x.id && <Check className="w-6 h-6 text-black" />}
            </button>
          ))}
        </div>
      </div>

      {/* Options sheet */}
      {menu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenu(false)} />
          <div className="relative w-full max-w-3xl bg-(--card) rounded-t-[32px] px-5 pt-3 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
            <span className="block w-14 h-1.5 rounded-full bg-(--chip) mx-auto mb-6" />
            <p className="text-sm font-bold tracking-[0.18em] text-(color:--muted)">NOTE COLOR</p>
            <div className="grid grid-cols-6 gap-2.5 mt-4">
              {NOTE_COLORS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setColor(x.id)}
                  aria-label={`${x.id} note`}
                  className="aspect-[1/1.05] rounded-2xl cursor-pointer"
                  style={{ background: x.bg, border: color === x.id ? '3px solid #111' : `1.5px solid ${x.bar}55` }}
                />
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-(color:--line) flex items-center gap-4">
              <CheckCircle2 className="w-7 h-7 text-(color:--muted) shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-xl text-(color:--ink)">Completed</p>
                <p className="text-(color:--muted)">Move to Completed without deleting</p>
              </div>
              <button
                role="switch"
                aria-checked={completed}
                onClick={() => setCompleted(!completed)}
                className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${completed ? 'bg-(--btn)' : 'bg-(--chip)'}`}
              >
                <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${completed ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            <button onClick={remove} className="mt-6 w-full py-4 rounded-2xl border-2 border-red-300 bg-red-50 text-red-700 font-extrabold text-lg flex items-center justify-center gap-2.5 cursor-pointer">
              <Trash2 className="w-5 h-5" /> {confirmDelete ? 'Tap again to delete' : 'Delete note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
