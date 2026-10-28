import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { CheckCircle2, Layers } from 'lucide-react';
import { DEFAULT_THUMBNAIL } from '../branding';
import { isEnrolled, enroll, unenroll } from '../utils/enrollment';

export const CourseCard: React.FC<{ course: Course }> = ({ course }) => {
  // 0 = original link, 1 = through an image proxy (works when the host blocks hotlinking), 2 = give up (logo tile)
  const [imgTry, setImgTry] = useState(0);
  const imgError = imgTry > 1;
  const imgSrc = imgTry === 0
    ? course.thumbnail
    : `https://images.weserv.nl/?url=${encodeURIComponent((course.thumbnail || '').replace(/^https?:\/\//i, ''))}`;
  const [enrolled, setEnrolled] = useState(() => isEnrolled(course.id));

  const toggle = () => {
    if (enrolled) { unenroll(course.id); setEnrolled(false); }
    else { enroll(course); setEnrolled(true); }
  };

  return (
    <article className="flex flex-col rounded-3xl bg-(--course) border border-(color:--line) overflow-hidden p-1.5">
      <Link to={`/course/${course.id}`} className="block rounded-2xl overflow-hidden bg-black">
        {!imgError && course.thumbnail ? (
          <img
            src={imgSrc}
            alt={course.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgTry((n) => n + 1)}
            className="w-full h-auto block"
          />
        ) : (
          <img src={DEFAULT_THUMBNAIL} alt={course.title} loading="lazy" className="w-full h-auto block" />
        )}
      </Link>

      <div className="px-3 pt-3 pb-3 flex flex-col gap-3">
        <Link to={`/course/${course.id}`} className="font-heading font-semibold text-[15px] text-(color:--ink) leading-snug line-clamp-2">
          {course.title}
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-heading font-bold text-(color:--ink)">FREE</span>
          <span className="px-3 py-1 rounded-full bg-(--free) text-white text-xs font-bold">100% free access</span>
          {course.totalLectures > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-(color:--muted)"><Layers className="w-3.5 h-3.5" />{course.totalLectures} lessons</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Link to={`/course/${course.id}`} className="py-3.5 rounded-2xl bg-(--btn) text-(color:--btnink) text-center text-sm font-extrabold tracking-wide">
            DETAILS
          </Link>
          <button
            onClick={toggle}
            className={`py-3.5 rounded-2xl text-sm font-extrabold tracking-wide cursor-pointer inline-flex items-center justify-center gap-1.5 ${
              enrolled ? 'bg-(--free) text-white' : 'bg-(--btn2) text-(color:--btn2ink)'
            }`}
          >
            {enrolled ? <><CheckCircle2 className="w-4 h-4" /> ENROLLED</> : 'ENROLL'}
          </button>
        </div>
      </div>
    </article>
  );
};
