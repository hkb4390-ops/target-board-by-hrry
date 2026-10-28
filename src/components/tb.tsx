import React, { useState } from 'react';
import { ChevronLeft, Folder as FolderIcon, FileText, Download, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Lesson } from '../types';
import { splitTitle } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

/* ---------- Header: back arrow, centred title, optional right action ---------- */

export const TbHeader: React.FC<{
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
  /** small brand logo before the title (used on the batch home page) */
  logo?: string;
}> = ({ title, onBack, right, logo }) => (
  <header className="sticky top-0 z-40 bg-(--head) backdrop-blur-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
    <div className="relative h-14 max-w-3xl lg:max-w-6xl mx-auto flex items-center px-2">
      <button
        onClick={onBack}
        aria-label="Go back"
        className="w-10 h-10 rounded-full flex items-center justify-center text-(color:--ink) active:bg-black/10 cursor-pointer z-10"
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={2.6} />
      </button>
      <div className="absolute inset-x-12 flex items-center justify-center gap-2 pointer-events-none">
        {logo && <img src={logo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />}
        <h1 className="font-heading font-bold text-[16px] sm:text-[17px] text-(color:--ink) truncate">{title}</h1>
      </div>
      <div className="ml-auto z-10 flex items-center">{right}</div>
    </div>
  </header>
);

/* ---------- Folder row (subject / section / chapter) ---------- */

export const FolderRow: React.FC<{
  name: string;
  hint?: string;
  disabled?: boolean;
  onOpen: () => void;
}> = ({ name, hint, disabled, onOpen }) => {
  const body = (
    <>
      <span className="tb-circle w-14 h-14 rounded-full flex items-center justify-center shrink-0">
        <FolderIcon className="w-6 h-6" style={{ color: 'var(--folder)', fill: 'var(--folder)', opacity: disabled ? 0.45 : 1 }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold text-[15px] leading-snug ${disabled ? 'text-(color:--muted)' : 'text-(color:--ink)'}`}>{name}</span>
        {hint && (
          <span className="flex items-center gap-1 text-[11.5px] text-(color:--muted) mt-0.5">
            {disabled && <Clock className="w-3 h-3" />}
            {hint}
          </span>
        )}
      </span>
    </>
  );
  return disabled ? (
    <div className="tb-card w-full flex items-center gap-4 p-3.5 opacity-80">{body}</div>
  ) : (
    <button onClick={onOpen} className="tb-card tb-press w-full text-left flex items-center gap-4 p-3.5 cursor-pointer">
      {body}
    </button>
  );
};

/* ---------- Segmented pill tabs: Video | PDF | Test ---------- */

export function SegTabs<K extends string>({
  tabs, active, onChange,
}: {
  tabs: { key: K; label: string; Icon: React.ElementType }[];
  active: K;
  onChange: (k: K) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center p-1 rounded-full bg-(--card) border-2 border-[#111]"
      style={{ borderColor: 'var(--ink)' }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const on = key === active;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full text-[14px] cursor-pointer transition-colors ${
              on ? 'bg-[#111] text-white font-bold' : 'text-(color:--ink) font-medium'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- PDF row: tap = preview, round button = download ---------- */

export const PdfListRow: React.FC<{ note: Lesson; onPreview: () => void }> = ({ note, onPreview }) => {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'nolink'>('idle');
  const { main, context } = splitTitle(note.title);
  const title = context ? `${context.replace(/ · /g, ' // ')} // ${main}` : main;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state === 'busy') return;
    if (!note.pdfUrl) { setState('nolink'); setTimeout(() => setState('idle'), 3000); return; }
    setState('busy');
    await downloadPdf(note.pdfUrl, note.title);
    setState('done');
    setTimeout(() => setState('idle'), 2500);
  };

  return (
    <div className="tb-card tb-press flex items-center gap-3 p-3.5">
      <button onClick={onPreview} className="flex items-center gap-4 min-w-0 flex-1 text-left cursor-pointer">
        <span className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,152,0,.14)' }}>
          <FileText className="w-6 h-6" style={{ color: 'var(--folder)' }} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-[15px] leading-snug text-(color:--ink) line-clamp-2">{title}</span>
          <span className="block text-[11.5px] text-(color:--muted) mt-0.5 tracking-wide">
            {state === 'nolink' ? 'File link not found, refresh the page' : 'PDF Document'}
          </span>
        </span>
      </button>
      <button
        onClick={handleDownload}
        aria-label="Download PDF"
        className="tb-circle w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-(color:--ink) cursor-pointer"
      >
        {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : state === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
      </button>
    </div>
  );
};

/* ---------- Empty state ---------- */

export const EmptyBox: React.FC<{ Icon: React.ElementType; text: string; children?: React.ReactNode }> = ({ Icon, text, children }) => (
  <div className="tb-card py-10 px-6 text-center">
    <span className="tb-circle w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
      <Icon className="w-6 h-6 text-(color:--muted)" />
    </span>
    <p className="text-sm text-(color:--muted)">{text}</p>
    {children && <div className="mt-4">{children}</div>}
  </div>
);
