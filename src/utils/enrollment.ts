import { useEffect, useState } from 'react';
import { Course } from '../types';

const KEY = 'tb_enrolled_batches';
const EVENT = 'tb-enrollment-change';

export interface EnrolledBatch {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  totalLectures: number;
  enrolledAt: number;
}

function read(): Record<string, EnrolledBatch> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function write(data: Record<string, EnrolledBatch>) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export const getEnrolled = (): EnrolledBatch[] =>
  Object.values(read()).sort((a, b) => b.enrolledAt - a.enrolledAt);

export const isEnrolled = (id: string): boolean => !!read()[id];

export function enroll(c: Course) {
  const all = read();
  all[c.id] = { id: c.id, title: c.title, thumbnail: c.thumbnail, category: c.category, totalLectures: c.totalLectures, enrolledAt: Date.now() };
  write(all);
}

export function unenroll(id: string) {
  const all = read();
  delete all[id];
  write(all);
}

export const onEnrollmentChange = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** Live count of enrolled batches (updates when the person enrolls / removes a batch). */
export function useEnrolledCount(): number {
  const [count, setCount] = useState(() => getEnrolled().length);
  useEffect(() => {
    const update = () => setCount(getEnrolled().length);
    update();
    return onEnrollmentChange(update);
  }, []);
  return count;
}
