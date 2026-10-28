import React, { useState } from 'react';
import { FileText, Eye, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Lesson } from '../types';
import { splitTitle } from '../utils/format';
import { downloadPdf } from '../utils/pdf';

interface PdfRowProps {
  note: Lesson;
  onPreview: () => void;
  compact?: boolean;
}

/** One PDF in a list: always shows both a Preview and a Download button. */
export const PdfRow: React.FC<PdfRowProps> = ({ note, onPreview, compact }) => {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'nolink'>('idle');
  const { main, context } = splitTitle(note.title);

  const handleDownload = async () => {
    if (state === 'busy') return;
    if (!note.pdfUrl) { setState('nolink'); return; }
    setState('busy');
    await downloadPdf(note.pdfUrl, note.title);
    setState('done');
    setTimeout(() => setState('idle'), 2500);
  };

  return (
    <div className={`rounded-2xl bg-[#15171C]/90 border border-white/10 ${compact ? 'p-2.5' : 'p-3.5'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`rounded-xl bg-blue-500/15 text-blue-400 shrink-0 ${compact ? 'p-2' : 'p-2.5'}`}>
          <FileText className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
        <div className="min-w-0">
          <h4 className={`font-semibold text-white leading-snug line-clamp-2 ${compact ? 'text-xs' : 'text-[13px] sm:text-sm'}`}>{main}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{context || 'PDF document'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={onPreview}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[#1A1405] text-xs font-bold cursor-pointer"
        >
          {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : state === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          <span>{state === 'busy' ? 'Downloading…' : state === 'done' ? 'Done' : 'Download'}</span>
        </button>
      </div>

      {state === 'nolink' && (
        <p className="text-[11px] text-amber-400 mt-2">This file's link could not be found. Please refresh the page and try again.</p>
      )}
    </div>
  );
};
