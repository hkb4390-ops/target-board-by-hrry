import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, X, BookOpen, NotebookPen, Radio } from 'lucide-react';
import { Course } from '../types';
import { fetchCourses, getCachedCourses } from '../services/api';
import { Carousel } from '../components/Carousel';
import { CourseCard } from '../components/CourseCard';
import { useClass, useBoard, useMedium, matchesClass, selectionLabel } from '../utils/streams';
import { newestFirst } from '../utils/newest';
import { TOP_BANNER } from '../branding';

const BANNERS = ['https://i.postimg.cc/sgrqsNC6/file-00000000e09c8211917add5c777155ae.png'];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>(() => getCachedCourses() || []);
  const [loading, setLoading] = useState(courses.length === 0);
  const [cls] = useClass();
  const [board] = useBoard();
  const [medium] = useMedium();
  const [toast, setToast] = useState('');
  const [topClosed, setTopClosed] = useState(() => sessionStorage.getItem('tb_top_closed') === '1');

  useEffect(() => {
    fetchCourses().then(setCourses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // newest batch first
  const classBatches = useMemo(() => (cls === 'all' ? [] : newestFirst(courses.filter((c) => matchesClass(c, cls, board, medium)))), [courses, cls, board, medium]);
  const picked = selectionLabel(cls, board, medium);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };
  const closeTop = () => { sessionStorage.setItem('tb_top_closed', '1'); setTopClosed(true); };

  const tiles = [
    { label: 'All Courses', Icon: BookOpen, circle: 'bg-[#1E2230] text-white', onClick: () => navigate('/courses') },
    { label: 'Live Class', Icon: Radio, circle: 'bg-[#EF4444] text-white', onClick: () => showToast('Live classes are coming soon') },
    { label: 'Notes', Icon: NotebookPen, circle: 'bg-[#06B6D4] text-white', onClick: () => navigate('/notes') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6 space-y-5 animate-fade-in">
      {/* Top promo, can be closed */}
      {!topClosed && (
        <div className="relative rounded-xl overflow-hidden shadow-md w-[88%] sm:w-[60%] md:w-[46%] mx-auto">
          <Link to="/courses"><img src={TOP_BANNER} alt="Offer" referrerPolicy="no-referrer" className="w-full h-auto block" /></Link>
          <button onClick={closeTop} aria-label="Close banner" className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Auto-sliding banners */}
      <Carousel
        dots
        interval={3500}
        itemClass="w-[92%] sm:w-[70%] md:w-[48%]"
        items={BANNERS.map((src, i) => (
          <img key={src} src={src} alt={`Banner ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-auto block rounded-2xl shadow-md" />
        ))}
      />

      {/* Quick tiles */}
      <div className="grid grid-cols-3 gap-3">
        {tiles.map(({ label, Icon, circle, onClick }) => (
          <button key={label} onClick={onClick} className="flex flex-col items-center gap-3 py-5 rounded-3xl bg-(--card) border border-(color:--line) shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
            <span className={`w-[60px] h-[60px] rounded-full flex items-center justify-center ${circle}`}><Icon className="w-7 h-7" /></span>
            <span className="font-heading font-semibold text-[13px] sm:text-sm text-(color:--ink)">{label}</span>
          </button>
        ))}
      </div>

      {/* Latest courses: slides by itself */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-[22px] text-(color:--ink)">Latest Courses</h2>
          <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-bold text-(color:--accent)">See all <ChevronRight className="w-4 h-4" /></Link>
        </div>

        {loading ? (
          <div className="h-80 rounded-3xl bg-(--chip) animate-pulse" />
        ) : (
          <Carousel interval={3000} itemClass="w-[88%] sm:w-[46%] lg:w-[31%]" items={courses.map((c) => <CourseCard key={c.id} course={c} />)} />
        )}
      </section>

      {/* Batches of the chosen class */}
      <section className="space-y-3 pb-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading font-bold text-[22px] text-(color:--ink)">Latest Batches{cls !== 'all' && <span className="block text-sm font-semibold text-(color:--muted)">{picked}</span>}</h2>
          <Link to="/streams" className="shrink-0 px-3.5 py-2 rounded-xl bg-(--btn) text-(color:--btnink) text-xs font-extrabold">{cls === 'all' ? 'SELECT CLASS' : 'CHANGE CLASS'}</Link>
        </div>

        {cls === 'all' ? (
          <div className="py-10 text-center rounded-3xl border border-dashed border-(color:--line) text-sm text-(color:--muted) px-6">
            Select your class to see its batches here.
          </div>
        ) : classBatches.length === 0 ? (
          <div className="py-10 text-center rounded-3xl border border-dashed border-(color:--line) text-sm text-(color:--muted) px-6">
            No batches for {picked} yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classBatches.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </section>

      {toast && (
        <div role="status" className="fixed bottom-24 md:bottom-8 inset-x-0 z-[80] flex justify-center px-4 pointer-events-none">
          <span className="px-4 py-2.5 rounded-xl bg-[#111] text-white text-sm font-semibold shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  );
};
