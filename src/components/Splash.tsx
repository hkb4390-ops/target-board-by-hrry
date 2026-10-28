import React, { useEffect, useState } from 'react';
import { BookOpen, MonitorPlay, ClipboardCheck, NotebookPen, Trophy, Star } from 'lucide-react';
import { OFFICIAL_LOGO } from '../branding';

/* Faint school doodles (globe, book, pencil, bulb, ABC, stars) tiled behind everything */
const DOODLES = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220' fill='none' stroke='%23B9B29C' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' opacity='.38'>
<circle cx='42' cy='44' r='17'/><path d='M25 44h34M42 27c-9 10-9 24 0 34M42 27c9 10 9 24 0 34'/>
<path d='M120 28l28 28M114 34l28 28-34 8z'/>
<path d='M178 38a14 14 0 1 1 9 13v7h-12v-7M175 64h14'/>
<path d='M30 120l24-6v32l-24 6zM54 114l24 6v32l-24-6z'/>
<text x='108' y='128' font-family='serif' font-size='22' stroke='none' fill='%23B9B29C'>ABC</text>
<path d='M180 120l4 9 10 1-8 7 3 10-9-6-9 6 3-10-8-7 10-1z'/>
<circle cx='70' cy='190' r='10'/><path d='M120 182l18-8 8 18-18 8zM168 176h24v24h-24z'/>
</svg>`.replace(/\n/g, '');
const DOODLE_URL = `url("data:image/svg+xml,${encodeURIComponent(DOODLES).replace(/%2523/g, '%23')}")`;

const FEATURES = [
  { label: 'Learn', Icon: BookOpen, color: '#4F6AD4' },
  { label: 'Live Class', Icon: MonitorPlay, color: '#1FA37F' },
  { label: 'Test', Icon: ClipboardCheck, color: '#F59E0B' },
  { label: 'Notes', Icon: NotebookPen, color: '#9B3FB5' },
  { label: 'Topper', Icon: Trophy, color: '#4F6AD4' },
];

export const Splash: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2300);
    const b = setTimeout(onDone, 2800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <div
      role="status"
      aria-label="Loading Target Board"
      className={`fixed inset-0 z-[100] flex flex-col items-center overflow-hidden transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: '#FBF9F1', backgroundImage: DOODLE_URL, color: '#10204A' }}
    >
      <div className="flex-1 w-full flex flex-col items-center justify-center px-6 pb-24 pt-8">
        {/* Logo in a gold-to-teal ring */}
        <div className="animate-[tbpop_700ms_cubic-bezier(.2,.9,.3,1.2)_both] rounded-full p-[7px] shadow-xl" style={{ background: 'conic-gradient(from 200deg, #FFC700, #9BCB5A, #12B5CB, #6DBB6D, #FFC700)' }}>
          <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-white overflow-hidden flex items-center justify-center">
            <img src={OFFICIAL_LOGO} alt="STUDYMODSHRRY" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="mt-10 text-[34px] sm:text-5xl font-heading font-extrabold tracking-wide text-center animate-[tbrise_600ms_250ms_ease-out_both]">TARGET BOARD</h1>

        <div className="mt-3 flex items-center gap-3 animate-[tbrise_600ms_350ms_ease-out_both]" aria-hidden>
          <span className="w-20 h-px bg-[#F2C14E]" />
          <Star className="w-5 h-5 text-[#F5A524] fill-current" />
          <span className="w-20 h-px bg-[#F2C14E]" />
        </div>

        <p className="mt-4 text-xl sm:text-2xl text-[#2A3558] animate-[tbrise_600ms_450ms_ease-out_both]">By STUDYMODSHRRY</p>

        {/* Feature row */}
        <div className="mt-12 w-full max-w-md grid grid-cols-5 animate-[tbrise_600ms_600ms_ease-out_both]">
          {FEATURES.map(({ label, Icon, color }, i) => (
            <div key={label} className={`flex flex-col items-center gap-2.5 ${i > 0 ? 'border-l border-black/10' : ''}`}>
              <span className="w-[62px] h-[62px] sm:w-[70px] sm:h-[70px] rounded-full flex items-center justify-center bg-white/60" style={{ border: `2.5px solid ${color}`, color }}>
                <Icon className="w-7 h-7" />
              </span>
              <span className="text-[13px] font-semibold text-[#10204A]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navy and gold wave */}
      <svg className="absolute bottom-0 inset-x-0 w-full h-28 sm:h-36" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        <path d="M0 62C70 30 130 38 200 62S330 84 400 40V120H0Z" fill="#0F1B3D" />
        <path d="M0 52C70 20 130 28 200 52S330 74 400 30" fill="none" stroke="#F4B731" strokeWidth="9" />
        <path d="M0 88C80 66 150 72 220 90S340 100 400 76" fill="none" stroke="#9A7B2F" strokeWidth="1.5" opacity=".7" />
      </svg>
      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-[#F4B731] animate-pulse" style={{ animationDelay: `${i * 180}ms` }} />)}
      </div>
    </div>
  );
};
