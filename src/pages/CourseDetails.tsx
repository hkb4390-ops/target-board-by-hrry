import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Course, CourseContent, Folder, Lesson } from '../types';
import { fetchCourses, fetchCourseContent, extractAllLessons } from '../services/api';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { getCourseProgress, isLessonCompleted } from '../utils/progress';
import { isEnrolled, enroll, unenroll, useEnrolledCount } from '../utils/enrollment';
import { OFFICIAL_LOGO, BRAND_NAME } from '../branding';
import { ClassCard } from '../components/ClassCard';
import { PdfPanel } from '../components/PdfPanel';
import { TbHeader, FolderRow, SegTabs, PdfListRow, EmptyBox } from '../components/tb';
import { subjectKey, folderStats, isSection, resolvePath } from '../utils/tree';
import { Play, Video, FileText, ClipboardList, Search, X, BookmarkPlus, CheckCircle2 } from 'lucide-react';

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const cleanName = (raw: string) => (raw || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
const matches = (text: string, q: string) => !q.trim() || text.toLowerCase().includes(q.trim().toLowerCase());

type ChapterTab = 'video' | 'pdf' | 'test';

export const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [content, setContent] = useState<CourseContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  useEnrolledCount();
  const enrolled = id ? isEnrolled(id) : false;

  const [tab, setTab] = useState<ChapterTab>('video');
  const [viewingPdf, setViewingPdf] = useState<Lesson | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  const loadCourseData = async () => {
    if (!id) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const contentData = await fetchCourseContent(id);
      setErrorDetail(contentData.success ? '' : contentData.error || '');
      if (!contentData.success) { setHasError(true); return; }
      setContent(contentData);
      const list = await fetchCourses();
      const matched = list.find((c) => c.id === id);
      setCourse(
        matched || {
          id, title: contentData.title || 'Course Details',
          description: 'Subjects, chapters, classes and notes in one place.',
          thumbnail: '', category: 'General', totalLectures: 0, rating: 4.9,
          instructor: `${BRAND_NAME} Faculty`, badge: 'FREE', price: 0,
        }
      );
    } catch (err) {
      console.error('Course details fetch error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadCourseData(); }, [id]);

  // The folder trail lives in the URL (?p=subject,section,chapter) so Back and the player's
  // back arrow land on the exact same screen.
  const urlIds = (params.get('p') || '').split(',').filter(Boolean);
  const path = useMemo(() => (content ? resolvePath(content.folders, urlIds) : []), [content, params]);
  const pathKey = path.map((f) => f.id).join(',');
  const node = path[path.length - 1] || null;

  const go = (trail: Folder[]) => {
    setParams(trail.length ? { p: trail.map((f) => f.id).join(',') } : {});
    window.scrollTo({ top: 0 });
  };

  useEffect(() => { setTab('video'); setViewingPdf(null); setQ(''); setSearchOpen(false); }, [pathKey]);

  const allLessons = useMemo(() => (content ? extractAllLessons(content.folders) : []), [content]);
  const totals = useMemo(() => ({
    lectures: allLessons.filter((l) => l.type === 'video').length,
    notes: allLessons.filter((l) => l.type === 'pdf').length,
  }), [allLessons]);

  const isChapter = !!node && !isSection(node);
  const chapterClasses = useMemo(() => (isChapter ? (node!.lessons || []).filter((l) => l.type === 'video') : []), [node, isChapter]);
  const chapterNotes = useMemo(() => (isChapter ? (node!.lessons || []).filter((l) => l.type === 'pdf') : []), [node, isChapter]);

  const lastWatchedId = id ? getCourseProgress(id)?.lastWatchedLessonId : undefined;
  const doneInChapter = chapterClasses.filter((c) => id && isLessonCompleted(id, c.id)).length;
  const chapterPct = chapterClasses.length ? Math.round((doneInChapter / chapterClasses.length) * 100) : 0;
  const resumeLesson =
    chapterClasses.find((c) => c.id === lastWatchedId) ||
    chapterClasses.find((c) => id && !isLessonCompleted(id, c.id)) ||
    chapterClasses[0];

  const handleStartCourse = () => {
    if (!id || !allLessons.length) return;
    const first = allLessons.find((l) => l.type === 'video') || allLessons[0];
    navigate(`/player/${id}/${first.id}`);
  };

  if (isLoading) return <Loading message="Loading subjects and chapters..." />;
  if (hasError || !course || !content) {
    return <ErrorState title="Course not found" message={`We couldn't load this batch. Check your connection and try again.${errorDetail ? ' [' + errorDetail + ']' : ''}`} onRetry={loadCourseData} />;
  }

  const parent = path.slice(0, -1);
  const onBack = () => (node ? go(parent) : navigate('/courses'));
  const headerTitle = node ? cleanName(node.name) : course.title;

  const searchBtn = (
    <button
      onClick={() => { setSearchOpen((o) => !o); if (searchOpen) setQ(''); }}
      aria-label="Search"
      className="w-10 h-10 mr-1 rounded-full flex items-center justify-center text-(color:--ink) active:bg-black/10 cursor-pointer"
    >
      {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
    </button>
  );

  /** one folder row: tells subjects / sections / chapters apart by what they hold */
  const renderFolder = (f: Folder) => {
    const empty = !(f.subfolders?.length) && !(f.lessons?.length);
    const s = folderStats(f);
    const subjectCount = (f.subfolders || []).filter((x) => subjectKey(x.name) !== 'other').length;
    const hint = empty
      ? 'Coming soon'
      : isSection(f)
        ? subjectCount >= 3
          ? `${plural(subjectCount, 'subject')} · ${plural(s.lectures, 'class', 'classes')}`
          : `${plural(s.chapters, 'chapter')} · ${plural(s.lectures, 'class', 'classes')}`
        : `${plural(f.lessons!.filter((l) => l.type === 'video').length, 'class', 'classes')} · ${plural(f.lessons!.filter((l) => l.type === 'pdf').length, 'note')}`;
    return (
      <FolderRow
        key={f.id}
        name={cleanName(f.name)}
        hint={hint}
        disabled={empty}
        onOpen={() => go([...path, f])}
      />
    );
  };

  const folderList = (folders: Folder[]) => {
    const list = folders.filter((f) => matches(cleanName(f.name), q));
    return list.length ? (
      <div className="space-y-3">{list.map(renderFolder)}</div>
    ) : (
      <EmptyBox Icon={Search} text="Nothing matches your search." />
    );
  };

  const playClass = (cls: Lesson) => navigate(`/player/${course.id}/${cls.id}`);

  return (
    <div className="min-h-screen pb-12 animate-fade-in">
      <TbHeader
        title={headerTitle}
        onBack={onBack}
        logo={!node ? OFFICIAL_LOGO : undefined}
        right={searchBtn}
      />

      {searchOpen && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <div className="tb-card flex items-center gap-2 px-3.5 h-11">
            <Search className="w-4 h-4 text-(color:--muted) shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isChapter ? 'Search videos or PDFs' : 'Search folders'}
              className="flex-1 bg-transparent outline-none text-sm text-(color:--ink) placeholder:text-(color:--muted)"
            />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">

        {/* LEVEL 0: batch card + the first folders */}
        {!node && (
          <>
            <section className="tb-card p-4 flex items-center gap-4">
              <img src={OFFICIAL_LOGO} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold tracking-wide text-emerald-700">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 mr-2">FREE</span>
                  {BRAND_NAME}
                </p>
                <h2 className="font-heading font-bold text-[17px] leading-snug text-(color:--ink) mt-1">{course.title}</h2>
                <p className="text-[12px] text-(color:--muted) mt-0.5">
                  {plural(totals.lectures, 'class', 'classes')} · {plural(totals.notes, 'note')}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleStartCourse}
                className="tb-press h-12 rounded-2xl bg-[#FFD60A] text-[#111] font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Start learning
              </button>
              <button
                onClick={() => (enrolled ? unenroll(course.id) : enroll(course))}
                className={`tb-press h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                  enrolled ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-600/30' : 'bg-[#111] text-white'
                }`}
              >
                {enrolled ? <CheckCircle2 className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                {enrolled ? 'Enrolled' : 'Enroll'}
              </button>
            </div>

            {folderList(content.folders)}
          </>
        )}

        {/* LEVEL 1+: a subject or section -> its folders (and any loose classes / notes) */}
        {node && !isChapter && (
          <>
            {folderList(node.subfolders || [])}

            {(node.lessons?.length || 0) > 0 && (
              <div className="space-y-3 pt-1">
                {viewingPdf && <PdfPanel pdf={viewingPdf} onClose={() => setViewingPdf(null)} />}
                {node.lessons!.filter((l) => l.type === 'video' && matches(l.title, q)).map((cls, idx) => (
                  <ClassCard key={cls.id || idx} lesson={cls} index={idx} done={isLessonCompleted(course.id, cls.id)} resume={cls.id === lastWatchedId} onClick={() => playClass(cls)} />
                ))}
                {node.lessons!.filter((l) => l.type === 'pdf' && matches(l.title, q)).map((note, idx) => (
                  <PdfListRow key={note.id || idx} note={note} onPreview={() => setViewingPdf(note)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* LEAF: a chapter -> Video / PDF / Test */}
        {node && isChapter && (
          <>
            <SegTabs<ChapterTab>
              active={tab}
              onChange={(k) => { setTab(k); setQ(''); }}
              tabs={[
                { key: 'video', label: 'Video', Icon: Video },
                { key: 'pdf', label: 'PDF', Icon: FileText },
                { key: 'test', label: 'Test', Icon: ClipboardList },
              ]}
            />

            {tab === 'video' && chapterClasses.length > 0 && (
              <div className="tb-card flex items-center gap-3 px-3.5 py-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#FFB300]" style={{ width: `${chapterPct}%` }} />
                </div>
                <span className="text-xs text-(color:--muted) tabular-nums">{doneInChapter}/{chapterClasses.length}</span>
                {resumeLesson && (
                  <button
                    onClick={() => playClass(resumeLesson)}
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-[#FFD60A] text-[#111] text-xs font-bold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {doneInChapter > 0 || lastWatchedId === resumeLesson.id ? 'Continue' : 'Start'}
                  </button>
                )}
              </div>
            )}

            {viewingPdf && <PdfPanel pdf={viewingPdf} onClose={() => setViewingPdf(null)} />}

            {tab === 'video' && (() => {
              const list = chapterClasses.filter((c) => matches(c.title, q));
              return list.length > 0 ? (
                <div className="space-y-3">
                  {list.map((cls, idx) => (
                    <ClassCard
                      key={cls.id || idx}
                      lesson={cls}
                      index={chapterClasses.indexOf(cls)}
                      done={isLessonCompleted(course.id, cls.id)}
                      resume={cls.id === lastWatchedId}
                      onClick={() => playClass(cls)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyBox Icon={Video} text={q ? 'No video matches your search.' : 'No classes in this chapter yet. Check the PDF tab.'} />
              );
            })()}

            {tab === 'pdf' && (() => {
              const list = chapterNotes.filter((n) => matches(n.title, q));
              return list.length > 0 ? (
                <div className="space-y-3">
                  {list.map((note, idx) => (
                    <PdfListRow key={note.id || idx} note={note} onPreview={() => setViewingPdf(note)} />
                  ))}
                </div>
              ) : (
                <EmptyBox Icon={FileText} text={q ? 'No PDF matches your search.' : 'No notes in this chapter yet.'} />
              );
            })()}

            {tab === 'test' && (
              <EmptyBox Icon={ClipboardList} text="Chapter-wise tests will appear here. You can practise MCQ tests from the Tests section.">
                <button
                  onClick={() => navigate('/tests')}
                  className="tb-press px-5 h-11 rounded-2xl bg-[#111] text-white font-bold text-sm cursor-pointer"
                >
                  Open Tests
                </button>
              </EmptyBox>
            )}
          </>
        )}

        <p className="text-center text-[11px] text-(color:--muted) pt-4">{BRAND_NAME} · Free Study Portal</p>
      </div>
    </div>
  );
};
