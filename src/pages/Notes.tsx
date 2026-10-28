import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, NotebookPen, Bookmark, CheckCircle2, Plus, Pin } from 'lucide-react';
import { useNotes, noteColor, Note } from '../utils/notes';

const TABS = [
  { key: 'all', label: 'All', Icon: NotebookPen },
  { key: 'pinned', label: 'Pinned', Icon: Bookmark },
  { key: 'completed', label: 'Completed', Icon: CheckCircle2 },
] as const;
type Tab = (typeof TABS)[number]['key'];

const EMPTY: Record<Tab, { title: string; text: string }> = {
  all: { title: 'No notes yet', text: 'Your notes save on their own as you type.' },
  pinned: { title: 'No pinned notes', text: 'Tap the bookmark inside a note to keep it here.' },
  completed: { title: 'Nothing completed yet', text: 'Finished notes move here without being deleted.' },
};

const when = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const NoteCard: React.FC<{ note: Note; onOpen: () => void }> = ({ note, onOpen }) => {
  const c = noteColor(note.color);
  return (
    <button
      onClick={onOpen}
      className="break-inside-avoid mb-3 w-full text-left rounded-2xl overflow-hidden border border-black/10 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
      style={{ background: c.bg, color: '#1F2937' }}
    >
      <span className="block h-1.5" style={{ background: c.bar }} />
      <span className="block p-3.5">
        <span className="flex items-start justify-between gap-2">
          <span className="font-heading font-bold text-[15px] leading-snug line-clamp-2 break-words">{note.title.trim() || 'Untitled'}</span>
          {note.pinned && <Pin className="w-4 h-4 shrink-0 mt-0.5" />}
        </span>
        {note.body.trim() && <span className="block mt-1.5 text-[13px] leading-relaxed text-gray-600 line-clamp-5 whitespace-pre-line break-words">{note.body}</span>}
        <span className="block mt-3 text-[11px] font-semibold text-gray-500">{when(note.updatedAt)}</span>
      </span>
    </button>
  );
};

export const Notes: React.FC = () => {
  const navigate = useNavigate();
  const notes = useNotes();
  const [tab, setTab] = useState<Tab>('all');

  const shown = notes.filter((n) => (tab === 'completed' ? n.completed : tab === 'pinned' ? n.pinned && !n.completed : !n.completed));

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom,var(--head),var(--page)_45%)]">
      <header className="sticky top-0 z-30 bg-(--head)">
        <div className="max-w-3xl mx-auto h-16 px-3 flex items-center">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Back" className="w-11 h-11 rounded-full flex items-center justify-center text-(color:--ink) cursor-pointer">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="flex-1 text-center -ml-11 font-heading font-bold text-xl text-(color:--ink)">Notes</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-28">
        <div role="tablist" className="grid grid-cols-3 p-1.5 rounded-full bg-(--card) border-2 border-(color:--ink) mt-2">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-full text-[15px] font-bold transition-colors cursor-pointer ${tab === key ? 'bg-[#111] text-white' : 'text-(color:--ink)'}`}
            >
              <Icon className="w-[18px] h-[18px]" /> {label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-24 px-6">
            <span className="w-24 h-24 rounded-full bg-(--card) border border-(color:--line) flex items-center justify-center text-(color:--muted)">
              <NotebookPen className="w-10 h-10" />
            </span>
            <h2 className="mt-6 font-heading font-bold text-2xl text-(color:--ink)">{EMPTY[tab].title}</h2>
            <p className="mt-2 text-(color:--muted)">{EMPTY[tab].text}</p>
            {tab === 'all' && (
              <Link to="/notes/new" className="mt-7 inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-(--btn) text-(color:--btnink) font-extrabold text-lg">
                <Plus className="w-5 h-5" /> Write a note
              </Link>
            )}
          </div>
        ) : (
          <div className="columns-2 md:columns-3 gap-3 mt-5">
            {shown.map((n) => <NoteCard key={n.id} note={n} onOpen={() => navigate(`/notes/${n.id}`)} />)}
          </div>
        )}
      </div>

      <Link
        to="/notes/new"
        aria-label="New note"
        className="fixed right-5 bottom-6 z-40 w-[72px] h-[72px] rounded-3xl bg-(--btn) text-(color:--btnink) flex items-center justify-center shadow-xl"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Plus className="w-9 h-9" />
      </Link>
    </div>
  );
};
