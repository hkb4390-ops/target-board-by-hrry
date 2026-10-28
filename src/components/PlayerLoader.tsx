import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { OFFICIAL_LOGO } from '../branding';

const STEPS = ['Connecting', 'Secure key', 'Starting'];
const MESSAGES = [
  'Connecting to the video server',
  'Getting your secure playback key',
  'Starting playback',
];

interface PlayerLoaderProps {
  /** 0 = connecting, 1 = secure key, 2 = starting playback */
  stage: number;
  title?: string;
}

export const PlayerLoader: React.FC<PlayerLoaderProps> = ({ stage, title }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-5 text-center bg-[radial-gradient(ellipse_at_center,#1b1608_0%,#0b0b0e_70%)]">
      {/* Progress ring */}
      <div className="relative w-[84px] h-[84px] mb-5">
        <div className="tb-glow absolute inset-0 rounded-full bg-blue-500/25 blur-xl" />
        <svg viewBox="0 0 84 84" className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="42" cy="42" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        </svg>
        <svg viewBox="0 0 84 84" className="tb-spin absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="tbRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FBDC8E" />
              <stop offset="100%" stopColor="#DB9712" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          <circle cx="42" cy="42" r="38" fill="none" stroke="url(#tbRing)" strokeWidth="3" strokeLinecap="round" strokeDasharray="70 170" />
        </svg>
        <div className="absolute inset-[14px] rounded-full overflow-hidden bg-black border border-white/10 shadow-lg">
          <img src={OFFICIAL_LOGO} alt="" className="w-full h-full object-cover" />
        </div>
      </div>

      <p className="text-[15px] font-heading font-bold text-white leading-tight">Preparing your class</p>
      {title && <p className="text-[11px] text-slate-500 mt-1 max-w-[260px] truncate">{title}</p>}
      <p key={stage} className="text-xs text-blue-300 mt-2 animate-fade-in">
        {MESSAGES[Math.min(stage, MESSAGES.length - 1)]}…
      </p>

      {/* Indeterminate bar */}
      <div className="relative mt-4 h-[3px] w-40 rounded-full bg-white/10 overflow-hidden">
        <div className="tb-bar absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
      </div>

      {/* Steps */}
      <ol className="mt-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide">
        {STEPS.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
                  done
                    ? 'bg-blue-500 border-blue-500 text-[#1A1405]'
                    : active
                    ? 'border-blue-400 text-blue-300'
                    : 'border-white/15 text-slate-600'
                }`}
              >
                {done ? <Check className="w-2.5 h-2.5" strokeWidth={3.5} /> : i + 1}
              </span>
              <span className={done || active ? 'text-slate-200' : 'text-slate-600'}>{label}</span>
            </li>
          );
        })}
      </ol>

      {seconds >= 8 && (
        <p className="mt-4 text-[11px] text-slate-500 animate-fade-in">
          Slow connection — still trying ({seconds}s)
        </p>
      )}
    </div>
  );
};
