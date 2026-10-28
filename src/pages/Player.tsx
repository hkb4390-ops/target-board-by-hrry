import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, CourseContent, Lesson, Folder } from '../types';
import { fetchCourses, fetchCourseContent, extractAllLessons, getCachedContent, getCachedCourses } from '../services/api';
import { ClassCard } from '../components/ClassCard';
import { PdfPanel } from '../components/PdfPanel';
import { TbHeader, SegTabs, PdfListRow, EmptyBox } from '../components/tb';
import { findLessonPath, coursePathLink } from '../utils/tree';
import { VideoPlayer } from '../components/VideoPlayer';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import {
  toggleLessonCompletion, isLessonCompleted,
  recordLastWatched
} from '../utils/progress';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, FileText, Video } from 'lucide-react';

const cleanName = (raw: string) => (raw || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

export const Player: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(() => (courseId ? getCachedCourses()?.find((c) => c.id === courseId) || null : null));
  const [content, setContent] = useState<CourseContent | null>(() => (courseId ? getCachedContent(courseId) : null));
  const [isLoading, setIsLoading] = useState(() => !(courseId && getCachedContent(courseId)));
  const [hasError, setHasError] = useState(false);
  const [isCompletedState, setIsCompletedState] = useState(false);

  // Sidebar Tab: 'classes' vs 'notes'
  const [sidebarTab, setSidebarTab] = useState<'classes' | 'notes'>('classes');

  // Inline PDF Viewer modal
  const [activePdf, setActivePdf] = useState<Lesson | null>(null);

  const loadData = async () => {
    if (!courseId) return;
    if (!getCachedContent(courseId)) setIsLoading(true);
    setHasError(false);

    try {
      const contentData = await fetchCourseContent(courseId);
      setContent(contentData);

      const coursesList = await fetchCourses();
      const matched = coursesList.find(c => c.id === courseId);
      if (matched) {
        setCourse(matched);
      } else {
        setCourse({
          id: courseId,
          title: contentData.title || 'Course Player',
          description: '',
          thumbnail: '',
          category: 'General',
          totalLectures: 50,
          rating: 4.9,
          instructor: 'STUDYMODSHRRY Faculty',
          badge: 'FREE',
          price: 0,
        });
      }

    } catch (err) {
      console.error('Player page fetch error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonId]);

  // Extract all lessons
  const allLessons = useMemo(() => {
    if (!content || !content.folders) return [];
    return extractAllLessons(content.folders);
  }, [content]);

  // All video lessons
  const allVideoLessons = useMemo(() => {
    return allLessons.filter(l => l.type === 'video');
  }, [allLessons]);

  // Find active lesson
  const currentLesson = useMemo(() => {
    if (!lessonId) return null;
    return allLessons.find(l => l.id === lessonId) || null;
  }, [allLessons, lessonId]);

  // Trail of folders holding this lesson (Subject > Section > Chapter), found at any depth
  const chapterContext = useMemo(() => {
    const trail = content && lessonId ? findLessonPath(content.folders, lessonId) : null;
    if (!trail) {
      return { trail: [] as Folder[], subjectName: '', chapterName: '', classes: allVideoLessons, notes: allLessons.filter(l => l.type === 'pdf') };
    }
    const chapter = trail[trail.length - 1];
    return {
      trail,
      subjectName: trail.slice(0, -1).map(f => cleanName(f.name)).join(' › '),
      chapterName: cleanName(chapter.name),
      classes: (chapter.lessons || []).filter(l => l.type === 'video'),
      notes: (chapter.lessons || []).filter(l => l.type === 'pdf'),
    };
  }, [content, lessonId, allVideoLessons, allLessons]);

  // Prev / Next move inside the current chapter first; fall back to the whole course
  const playlist = useMemo(() => {
    const inChapter = chapterContext?.classes || [];
    return inChapter.length > 1 ? inChapter : allVideoLessons;
  }, [chapterContext, allVideoLessons]);

  const currentVideoIndex = useMemo(() => {
    if (!currentLesson) return -1;
    return playlist.findIndex(l => l.id === currentLesson.id);
  }, [playlist, currentLesson]);

  const hasPrev = currentVideoIndex > 0;
  const hasNext = currentVideoIndex >= 0 && currentVideoIndex < playlist.length - 1;

  // Record progress
  useEffect(() => {
    if (courseId && currentLesson && course) {
      recordLastWatched(
        courseId,
        currentLesson.id,
        currentLesson.title,
        course.title,
        course.thumbnail,
        allLessons.length
      );
      setIsCompletedState(isLessonCompleted(courseId, currentLesson.id));
    }
  }, [courseId, currentLesson, course, allLessons.length]);

  const handleNext = () => {
    if (hasNext && courseId) {
      const nextLesson = playlist[currentVideoIndex + 1];
      navigate(`/player/${courseId}/${nextLesson.id}`);
    }
  };

  const handlePrev = () => {
    if (hasPrev && courseId) {
      const prevLesson = playlist[currentVideoIndex - 1];
      navigate(`/player/${courseId}/${prevLesson.id}`);
    }
  };

  const handleToggleComplete = () => {
    if (!courseId || !currentLesson) return;
    const isNowDone = toggleLessonCompletion(
      courseId,
      currentLesson.id,
      course?.title,
      course?.thumbnail,
      allLessons.length
    );
    setIsCompletedState(isNowDone);
  };

  if (isLoading) {
    return <Loading message="Opening your class..." />;
  }

  if (hasError || !currentLesson || !course) {
    return (
      <ErrorState 
        title="Class Not Available"
        message="This class isn't available. Please pick another class from the chapter."
        onRetry={loadData}
      />
    );
  }

  const classCount = chapterContext.classes.length;

  return (
    <div className="min-h-screen pb-10 animate-fade-in">
      {/* Yellow header: back to this exact chapter + class title */}
      <TbHeader
        title={currentLesson.title}
        onBack={() => navigate(coursePathLink(course.id, chapterContext.trail))}
      />

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-12 lg:gap-6 lg:px-6 lg:pt-5 items-start">

        {/* LEFT: video + class info */}
        <div className="lg:col-span-8">
          <VideoPlayer
            lesson={currentLesson}
            courseId={course.id}
            courseTitle={course.title}
            subtitle={[chapterContext.subjectName, chapterContext.chapterName].filter(Boolean).join(' · ')}
            position={currentVideoIndex >= 0 ? { index: currentVideoIndex + 1, total: playlist.length } : undefined}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={hasNext}
            hasPrev={hasPrev}
            isCompleted={isCompletedState}
            onToggleComplete={handleToggleComplete}
            hideDetails
            flush
          />

          <div className="px-4 lg:px-0 pt-4 space-y-3">
            <div>
              <h2 className="font-heading font-bold text-[18px] leading-snug text-(color:--ink)">{currentLesson.title}</h2>
              {chapterContext.chapterName && (
                <p className="text-[14px] text-(color:--ink) mt-2 leading-snug">{chapterContext.chapterName}</p>
              )}
              <p className="text-[12px] text-(color:--muted) mt-0.5">
                {classCount} {classCount === 1 ? 'video' : 'videos'}
                {currentVideoIndex >= 0 && ` · Class ${currentVideoIndex + 1} of ${playlist.length}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`tb-card tb-press h-10 px-3 flex items-center gap-1 text-xs font-bold text-(color:--ink) ${hasPrev ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={handleToggleComplete}
                className={`flex-1 h-10 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  isCompletedState ? 'bg-emerald-500/15 text-emerald-700 border-emerald-600/30' : 'tb-card text-(color:--ink)'
                }`}
              >
                {isCompletedState ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                {isCompletedState ? 'Completed' : 'Mark as complete'}
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`tb-press h-10 px-4 rounded-2xl flex items-center gap-1 text-xs font-bold bg-[#FFD60A] text-[#111] ${hasNext ? 'cursor-pointer shadow-sm' : 'opacity-40 cursor-not-allowed'}`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: this chapter's classes (and notes) */}
        <div className="lg:col-span-4 px-4 lg:px-0 pt-5 lg:pt-0 space-y-3 lg:sticky lg:top-20">
          <SegTabs<'classes' | 'notes'>
            active={sidebarTab}
            onChange={setSidebarTab}
            tabs={[
              { key: 'classes', label: `Video (${chapterContext.classes.length})`, Icon: Video },
              { key: 'notes', label: `PDF (${chapterContext.notes.length})`, Icon: FileText },
            ]}
          />

          {activePdf && <PdfPanel pdf={activePdf} onClose={() => setActivePdf(null)} />}

          {sidebarTab === 'classes' && (
            chapterContext.classes.length > 0 ? (
              <div className="space-y-2.5 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto scrollbar-none">
                {chapterContext.classes.map((cls, idx) => (
                  <ClassCard
                    key={cls.id || idx}
                    lesson={cls}
                    index={idx}
                    compact
                    active={cls.id === currentLesson.id}
                    done={isLessonCompleted(course.id, cls.id)}
                    onClick={() => { if (cls.id !== currentLesson.id) navigate(`/player/${course.id}/${cls.id}`); }}
                  />
                ))}
              </div>
            ) : (
              <EmptyBox Icon={Video} text="No classes in this chapter." />
            )
          )}

          {sidebarTab === 'notes' && (
            chapterContext.notes.length > 0 ? (
              <div className="space-y-2.5">
                {chapterContext.notes.map((note, idx) => (
                  <PdfListRow key={note.id || idx} note={note} onPreview={() => setActivePdf(note)} />
                ))}
              </div>
            ) : (
              <EmptyBox Icon={FileText} text="No notes have been added to this chapter yet." />
            )
          )}
        </div>
      </div>
    </div>
  );
};
