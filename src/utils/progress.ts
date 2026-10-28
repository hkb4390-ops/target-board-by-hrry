/**
 * LocalStorage Learning Progress Tracking Utility
 * Stores course progress, lesson completions, and last-watched states
 */

export interface SavedCourseProgress {
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  category?: string;
  totalLessons: number;
  completedLessonIds: string[];
  lastWatchedLessonId?: string;
  lastWatchedLessonTitle?: string;
  lastWatchedAt: string;
}

const STORAGE_KEY = 'ashraf_cyberx_learning_progress';

export function getAllProgress(): Record<string, SavedCourseProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read learning progress:', err);
    return {};
  }
}

export function saveProgressRecord(progress: SavedCourseProgress): void {
  try {
    const all = getAllProgress();
    all[progress.courseId] = progress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save learning progress:', err);
  }
}

export function getCourseProgress(courseId: string): SavedCourseProgress | null {
  const all = getAllProgress();
  return all[courseId] || null;
}

export function isLessonCompleted(courseId: string, lessonId: string): boolean {
  const course = getCourseProgress(courseId);
  if (!course) return false;
  return course.completedLessonIds.includes(lessonId);
}

export function toggleLessonCompletion(
  courseId: string,
  lessonId: string,
  courseTitle: string = 'Course',
  courseThumbnail: string = '',
  totalLessons: number = 1
): boolean {
  const all = getAllProgress();
  const existing = all[courseId] || {
    courseId,
    courseTitle,
    courseThumbnail,
    totalLessons,
    completedLessonIds: [],
    lastWatchedAt: new Date().toISOString(),
  };

  const isCompleted = existing.completedLessonIds.includes(lessonId);
  let updatedIds: string[];

  if (isCompleted) {
    updatedIds = existing.completedLessonIds.filter(id => id !== lessonId);
  } else {
    updatedIds = [...existing.completedLessonIds, lessonId];
  }

  existing.completedLessonIds = updatedIds;
  existing.courseTitle = courseTitle || existing.courseTitle;
  existing.courseThumbnail = courseThumbnail || existing.courseThumbnail;
  existing.totalLessons = Math.max(existing.totalLessons, totalLessons);
  existing.lastWatchedAt = new Date().toISOString();

  all[courseId] = existing;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to update lesson completion:', e);
  }

  return !isCompleted;
}

export function recordLastWatched(
  courseId: string,
  lessonId: string,
  lessonTitle: string,
  courseTitle: string,
  courseThumbnail: string,
  totalLessons: number
): void {
  const all = getAllProgress();
  const existing = all[courseId] || {
    courseId,
    courseTitle,
    courseThumbnail,
    totalLessons,
    completedLessonIds: [],
    lastWatchedAt: new Date().toISOString(),
  };

  existing.lastWatchedLessonId = lessonId;
  existing.lastWatchedLessonTitle = lessonTitle;
  existing.courseTitle = courseTitle || existing.courseTitle;
  existing.courseThumbnail = courseThumbnail || existing.courseThumbnail;
  existing.totalLessons = Math.max(existing.totalLessons, totalLessons);
  existing.lastWatchedAt = new Date().toISOString();

  all[courseId] = existing;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to record last watched:', e);
  }
}
