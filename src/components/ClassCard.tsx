import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2, Clock, User, CalendarDays } from 'lucide-react';
import { Lesson } from '../types';
import { OFFICIAL_LOGO, VIDEO_THUMBNAIL } from '../branding';
import { useThumb } from '../utils/thumb';
import { splitTitle, formatDate } from '../utils/format';

interface ClassCardProps {
  lesson: Lesson;
  index: number;
  done?: boolean;
  /** currently playing in the player */
  active?: boolean;
  /** last class the student opened */
  resume?: boolean;
  compact?: boolean;
  onClick: () => void;
}

const Thumb: React.FC<{ lesson: Lesson; index: number; done?: boolean; active?: boolean; compact?: boolean }> = ({
  lesson, index, done, active, compact,
}) => {
  const resolved = useThumb();
  const thumb = resolved || VIDEO_THUMBNAIL;
  const [ok, setOk] = useState(true);
  useEffect(() => { setOk(true); }, [thumb]);
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl bg-[#1C1F26] border border-black/10 ${compact ? 'w-24 aspect-video' : 'w-32 sm:w-40 aspect-video'}`}>
      {ok ? (
        <img
          src={thumb}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setOk(false)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#262014] to-[#14161B]">
          <img src={OFFICIAL_LOGO} alt="" className="w-9 h-9 rounded-lg object-cover opacity-80" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <span className="absolute top-1.5 left-1.5 min-w-[22px] h-[18px] px-1 rounded-md bg-black/70 text-[10px] font-bold text-white flex items-center justify-center font-mono">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span
        className={`absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
          done ? 'bg-emerald-500 text-black' : active ? 'bg-blue-500 text-[#1A1405]' : 'bg-black/65 text-white'
        }`}
      >
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
      </span>
    </div>
  );
};

export const ClassCard: React.FC<ClassCardProps> = ({ lesson, index, done, active, resume, compact, onClick }) => {
  const { main, context } = splitTitle(lesson.title);
  const date = formatDate(lesson.date);

  return (
    <button
      onClick={onClick}
      className={`tb-press w-full text-left flex items-center gap-3 cursor-pointer ${
        compact ? 'p-2' : 'p-2.5 sm:p-3'
      } ${
        active
          ? 'rounded-2xl border-l-4 border-[#F4BC4A] bg-[#1B1D29] text-white shadow-md'
          : 'tb-card'
      }`}
    >
      <Thumb lesson={lesson} index={index} done={done} active={active} compact={compact} />

      <div className="min-w-0 flex-1 py-0.5">
        <h4 className={`font-semibold leading-snug line-clamp-2 ${active ? 'text-white' : 'text-(color:--ink)'} ${compact ? 'text-xs' : 'text-[14px] sm:text-[15px]'}`}>
          {main}
        </h4>
        {context && !compact && (
          <p className={`text-[11px] mt-0.5 truncate ${active ? 'text-slate-400' : 'text-(color:--muted)'}`}>{context}</p>
        )}

        <div className={`mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11.5px] tracking-wide ${active ? 'text-slate-400' : 'text-(color:--muted)'}`}>
          {lesson.teacher && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{lesson.teacher}</span>
            </span>
          )}
          {date && !compact && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {date}
            </span>
          )}
          {!lesson.teacher && !date && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Video
            </span>
          )}
        </div>

        {(active || resume || done) && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {active && (
              <span className="text-[10px] font-bold tracking-wider text-[#F4BC4A] uppercase">Now playing</span>
            )}
            {!active && resume && (
              <span className="text-[10px] font-bold text-[#7A4E00] px-2 py-0.5 rounded-full bg-[#FFD60A]/50">Continue</span>
            )}
            {done && (
              <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-500/15">Completed</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};
