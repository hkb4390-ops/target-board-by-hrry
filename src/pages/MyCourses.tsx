import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PlayCircle, Trash2, BookOpen, Clock } from 'lucide-react';
import { DEFAULT_THUMBNAIL } from '../branding';
import { EnrolledBatch, getEnrolled, unenroll, onEnrollmentChange } from '../utils/enrollment';
import { getCourseProgress } from '../utils/progress';

const BatchCard: React.FC<{ b: EnrolledBatch }> = ({ b }) => {
  const [imgOk, setImgOk] = useState(!!b.thumbnail);
  const prog = getCourseProgress(b.id);
  const total = b.totalLectures || prog?.totalLessons || 0;
  const done = prog?.completedLessonIds?.length || 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <article className="flex flex-col rounded-2xl bg-(--card) border border-(color:--line) overflow-hidden">
      <div className="relative aspect-video bg-(--chip)">
        {imgOk ? (
          <img src={b.thumbnail} alt={b.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} className="w-full h-full object-cover" />
        ) : (
          <img src={DEFAULT_THUMBNAIL} alt={b.title} loading="lazy" className="w-full h-full object-cover" />
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-[11px] font-medium text-slate-200">{b.category}</span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        <h3 className="font-heading font-bold text-(color:--ink) leading-snug line-clamp-2">{b.title}</h3>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-(color:--muted)">
            <span>{total > 0 ? `${done} of ${total} lessons` : `${done} lessons completed`}</span>
            {total > 0 && <span className="text-(color:--accent) font-semibold">{pct}%</span>}
          </div>
          <div className="h-1.5 rounded-full bg-(--chip) overflow-hidden">
            <div className="h-full rounded-full bg-(--accent)" style={{ width: `${pct}%` }} />
          </div>
          {prog?.lastWatchedLessonTitle && (
            <p className="flex items-center gap-1.5 text-xs text-(color:--muted) pt-1 truncate">
              <Clock className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Last: {prog.lastWatchedLessonTitle}</span>
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <Link to={`/course/${b.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--btn) text-(color:--btnink) font-semibold text-sm transition-colors">
            <PlayCircle className="w-4 h-4" /> {done > 0 ? 'Continue' : "Let's Study"}
          </Link>
          <button
            onClick={() => { if (window.confirm('Remove this batch from your list?')) unenroll(b.id); }}
            className="p-2.5 rounded-xl border border-(color:--line) text-(color:--muted) hover:text-red-400 hover:border-red-400/40 transition-colors"
            aria-label="Remove batch" title="Remove batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

export const MyCourses: React.FC = () => {
  const [batches, setBatches] = useState<EnrolledBatch[]>(getEnrolled());
  useEffect(() => onEnrollmentChange(() => setBatches(getEnrolled())), []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-(color:--ink)">My Courses</h1>
          <p className="text-sm text-(color:--muted) mt-1">Only the batches you enroll in show up here.</p>
        </div>
        <Link to="/courses" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-(--btn) text-(color:--btnink) font-semibold text-sm transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Add batch
        </Link>
      </div>

      {batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-(color:--line) bg-(--card) px-6 py-14 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-(--chip) flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-(color:--accent)" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-(color:--ink)">No batches yet</h2>
            <p className="text-sm text-(color:--muted) mt-1">Open All Courses and tap Enroll on a batch to add it here.</p>
          </div>
          <Link to="/courses" className="inline-flex px-5 py-2.5 rounded-xl bg-(--btn) text-(color:--btnink) font-semibold text-sm transition-colors">
            Browse all courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b) => <BatchCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
};
