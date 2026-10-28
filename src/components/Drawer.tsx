import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X, Pencil, Check, BookOpen, NotebookPen, ClipboardList, Code2, Share2, Info, HelpCircle,
  Moon, Globe, ChevronRight,
} from 'lucide-react';
import { SOCIAL_LINKS, OFFICIAL_LOGO } from '../branding';
import { useLocalPref } from '../utils/prefs';

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'S';

type Row = { to?: string; href?: string; label: string; Icon: React.ElementType; tint: string; onClick?: () => void };

export const Drawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [name, setName] = useLocalPref<string>('tb_name', '');
  const [dark, setDark] = useLocalPref<boolean>('tb_dark', false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [note, setNote] = useState('');

  useEffect(() => { if (open) setDraft(name); }, [open]);

  const saveName = () => { setName(draft.trim()); setEditing(false); };

  const share = async () => {
    const data = { title: 'STUDYMODSHRRY', text: 'Free board exam batches, lectures and notes', url: window.location.origin };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); setNote('Link copied'); setTimeout(() => setNote(''), 2000); }
    } catch { /* cancelled */ }
  };

  const general: Row[] = [
    { to: '/my-courses', label: 'My Courses', Icon: BookOpen, tint: '#4F6AD4' },
    { to: '/notes', label: 'Notes', Icon: NotebookPen, tint: '#9B3FB5' },
    { to: '/tests', label: 'Tests', Icon: ClipboardList, tint: '#F59E0B' },
    { to: '/developer', label: 'Developer Info', Icon: Code2, tint: '#1FA37F' },
  ];
  const community: Row[] = [
    { to: '/social', label: 'Social Media Links', Icon: Globe, tint: '#E1306C' },
  ];
  const more: Row[] = [
    { href: SOCIAL_LINKS.telegram, label: 'Help', Icon: HelpCircle, tint: '#229ED9' },
    { label: note || 'Share', Icon: Share2, tint: '#25A55F', onClick: share },
    { to: '/about', label: 'About', Icon: Info, tint: '#6B7280' },
  ];

  const rowClass = 'w-full flex items-center gap-4 px-4 py-3.5 text-[16px] font-semibold text-(color:--ink) hover:bg-(--chip) cursor-pointer text-left';

  const renderRow = ({ to, href, label, Icon, tint, onClick }: Row) => {
    const inner = (
      <>
        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-(--chip)" style={{ color: tint }}>
          <Icon className="w-5 h-5" />
        </span>
        <span className="flex-1">{label}</span>
        <ChevronRight className="w-4 h-4 text-(color:--muted)" />
      </>
    );
    if (to) return <Link key={label} to={to} onClick={onClose} className={rowClass}>{inner}</Link>;
    if (href) return <a key={label} href={href} target="_blank" rel="noreferrer" className={rowClass}>{inner}</a>;
    return <button key={label} onClick={onClick} className={rowClass}>{inner}</button>;
  };

  const group = (title: string, rows: Row[], extra?: React.ReactNode) => (
    <section>
      <p className="px-2 mb-2 text-xs font-bold tracking-[0.2em] text-(color:--muted)">{title}</p>
      <div className="rounded-3xl bg-(--card) border border-(color:--line) overflow-hidden divide-y divide-(color:--line)">
        {rows.map(renderRow)}
        {extra}
      </div>
    </section>
  );

  const drawer = (
    <div className={`fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside
        className={`absolute inset-y-0 left-0 w-[84%] max-w-sm bg-(--page) border-r border-(color:--line) flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-4 px-5 py-5 border-b border-(color:--line) bg-(--head)">
          <img src={OFFICIAL_LOGO} alt="STUDYMODSHRRY" className="w-16 h-16 rounded-2xl object-cover border border-(color:--line)" />
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-xl text-(color:--ink) leading-tight">STUDYMODSHRRY</p>
            <p className="text-xs font-semibold tracking-[0.22em] text-(color:--muted) mt-1">FREE STUDY PORTAL</p>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="w-9 h-9 rounded-full flex items-center justify-center text-(color:--muted) hover:bg-(--chip) cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Student name */}
          <div className="flex items-center gap-3 px-1">
            <span className="w-11 h-11 rounded-full bg-(--btn) text-(color:--btnink) flex items-center justify-center font-heading font-bold shrink-0">{initials(name)}</span>
            {editing ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  placeholder="Your name"
                  className="flex-1 min-w-0 bg-(--card) border border-(color:--line) rounded-xl px-3 py-2 text-sm text-(color:--ink) focus:outline-none focus:border-(color:--accent)"
                />
                <button onClick={saveName} aria-label="Save name" className="w-10 h-10 rounded-xl bg-(--btn) text-(color:--btnink) flex items-center justify-center cursor-pointer"><Check className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs text-(color:--muted)">Student</span>
                  <span className="block font-heading font-bold text-(color:--ink) truncate">{name || 'Add your name'}</span>
                </span>
                <button onClick={() => setEditing(true)} aria-label="Edit name" className="w-10 h-10 rounded-xl hover:bg-(--chip) text-(color:--muted) flex items-center justify-center cursor-pointer"><Pencil className="w-4 h-4" /></button>
              </>
            )}
          </div>

          {group('GENERAL', general, (
            <div className="flex items-center gap-4 px-4 py-3.5">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-(--chip) text-(color:--muted)"><Moon className="w-5 h-5" /></span>
              <span className="flex-1 text-[16px] font-semibold text-(color:--ink)">Dark mode</span>
              <button
                role="switch"
                aria-checked={dark}
                aria-label="Dark mode"
                onClick={() => setDark(!dark)}
                className={`w-12 h-7 rounded-full p-0.5 transition-colors cursor-pointer ${dark ? 'bg-(--btn)' : 'bg-(--chip)'}`}
              >
                <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
          {group('COMMUNITY', community)}
          {group('MORE', more)}
        </div>
      </aside>
    </div>
  );

  // Render on <body>: the sticky header has backdrop-blur, which would otherwise trap this fixed drawer inside the header and cut it off.
  return typeof document === 'undefined' ? drawer : createPortal(drawer, document.body);
};
