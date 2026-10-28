import React from 'react';
import { OFFICIAL_LOGO } from '../branding';

export const Loading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
    <div className="relative w-14 h-14">
      <img src={OFFICIAL_LOGO} alt="STUDYMODSHRRY" className="w-full h-full rounded-xl object-cover" />
      <div className="absolute -inset-1.5 rounded-2xl border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
    <p className="text-sm text-slate-400">{message}</p>
  </div>
);
