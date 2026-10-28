import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OFFICIAL_LOGO } from '../branding';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Content',
  message = 'We encountered an issue fetching course data. Please check your connection and try again.',
  onRetry,
}) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center w-full max-w-md mx-auto animate-fade-in">
      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/15 bg-black mb-4">
        <img
          src={OFFICIAL_LOGO}
          alt="STUDYMODSHRRY"
          className="w-full h-full object-cover object-top"
        />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold mb-3">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>STUDYMODSHRRY System Notice</span>
      </div>

      <h3 className="text-lg font-bold text-white font-heading">
        {title}
      </h3>
      <p className="text-xs text-zinc-400 mt-2 leading-relaxed w-full break-all whitespace-pre-wrap">
        {message}
      </p>

      <div className="flex items-center gap-3 mt-6">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[#1A1405] font-bold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
        <Link
          to="/"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs border border-white/10 transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Go Home</span>
        </Link>
      </div>
    </div>
  );
};
