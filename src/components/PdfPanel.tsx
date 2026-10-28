import React, { useEffect, useRef, useState } from 'react';
import { FileText, Download, ExternalLink, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { Lesson } from '../types';
import { splitTitle } from '../utils/format';
import { googleViewerUrl, downloadPdf } from '../utils/pdf';

interface PdfPanelProps {
  pdf: Lesson;
  onClose: () => void;
}

export const PdfPanel: React.FC<PdfPanelProps> = ({ pdf, onClose }) => {
  const url = pdf.pdfUrl || '';
  const [engine, setEngine] = useState<'google' | 'direct'>('google');
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [reload, setReload] = useState(0);
  const [dl, setDl] = useState<'idle' | 'busy' | 'done'>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const { main, context } = splitTitle(pdf.title);

  // bring the reader into view and reset when another PDF is opened
  useEffect(() => {
    setLoading(true); setSlow(false); setEngine('google'); setDl('idle');
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pdf.id]);

  // if the viewer is slow, show the "open directly" help
  useEffect(() => {
    if (!loading) return;
    const t1 = setTimeout(() => setSlow(true), 9000);
    // viewer never answered: switch to the direct file once
    const t2 = setTimeout(() => { if (engine === 'google') { setEngine('direct'); setReload((k) => k + 1); } }, 16000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading, reload, engine, pdf.id]);

  const handleDownload = async () => {
    if (!url || dl === 'busy') return;
    setDl('busy');
    await downloadPdf(url, pdf.title);
    setDl('done');
    setTimeout(() => setDl('idle'), 2500);
  };

  const src = engine === 'google' ? googleViewerUrl(url) : url;

  return (
    <div ref={ref} className="scroll-mt-20 rounded-3xl bg-[#15171C] border border-white/10 shadow-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm text-white leading-snug line-clamp-2">{main}</h3>
            {context && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{context}</p>}
          </div>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 cursor-pointer shrink-0">
          Close
        </button>
      </div>

      {url ? (
        <>
          {/* Actions: always visible */}
          <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/5">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-[#1A1405] font-bold text-xs cursor-pointer"
            >
              {dl === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : dl === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{dl === 'busy' ? 'Downloading…' : dl === 'done' ? 'Done' : 'Download PDF'}</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in new tab</span>
            </a>
          </div>

          {/* Reader */}
          <div className="relative w-full h-[65vh] min-h-[420px] bg-[#0B0C10]">
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0B0C10] text-center px-6">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-sm text-slate-300 font-semibold">Opening document…</p>
                {slow && (
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Taking long? Use <span className="text-slate-300">Open in new tab</span> or <span className="text-slate-300">Download PDF</span> above.
                  </p>
                )}
              </div>
            )}
            <iframe
              key={`${src}-${reload}`}
              src={src}
              title={pdf.title}
              onLoad={() => { setLoading(false); setSlow(false); }}
              className="w-full h-full border-0 bg-white"
            />
          </div>

          {/* Reader tools */}
          <div className="flex items-center justify-between gap-2 p-3 border-t border-white/5 text-[11px]">
            <div className="inline-flex rounded-lg bg-white/5 p-0.5 border border-white/10">
              {(['google', 'direct'] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => { setEngine(e); setLoading(true); setReload((k) => k + 1); }}
                  className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${engine === e ? 'bg-blue-600 text-[#1A1405]' : 'text-slate-400 hover:text-white'}`}
                >
                  {e === 'google' ? 'Preview' : 'Direct'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setLoading(true); setReload((k) => k + 1); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>
          </div>
        </>
      ) : (
        <div className="p-8 text-center space-y-2">
          <FileText className="w-9 h-9 mx-auto text-slate-600" />
          <p className="text-sm text-slate-300 font-semibold">This PDF link is not available right now</p>
          <p className="text-xs text-slate-500">Please refresh the page and open the chapter again.</p>
          <button onClick={() => window.location.reload()} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-[#1A1405] text-xs font-bold cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh page
          </button>
        </div>
      )}
    </div>
  );
};
