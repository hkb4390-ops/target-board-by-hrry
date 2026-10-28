import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass, ArrowLeft } from 'lucide-react';
import { OFFICIAL_LOGO } from '../branding';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto animate-fade-in space-y-6">
      <div className="w-20 h-20 rounded-3xl overflow-hidden border border-white/15 bg-black shadow-xl">
        <img
          src={OFFICIAL_LOGO}
          alt="STUDYMODSHRRY"
          className="w-full h-full object-cover object-top"
        />
      </div>

      <div className="space-y-2">
        <span className="text-5xl font-black font-heading tracking-tight bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-transparent">
          404
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
          The page or lesson you are looking for doesn't exist or may have been moved.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-[#1A1405] font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/20 transition-all hover:scale-105"
        >
          <Home className="w-4 h-4" />
          <span>Go Home</span>
        </Link>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-bold text-xs sm:text-sm border border-white/10 transition-all"
        >
          <Compass className="w-4 h-4 text-blue-400" />
          <span>Explore Courses</span>
        </Link>
      </div>
    </div>
  );
};
