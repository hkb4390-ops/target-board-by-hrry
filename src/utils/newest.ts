import { Course } from '../types';

/**
 * When a batch was created: the API's createdAt when it sends one, otherwise the time hidden
 * inside its Mongo id (the first 8 hex digits are the creation time in unix seconds).
 */
export const createdMs = (c: Course): number => {
  const t = c.createdAt ? Date.parse(c.createdAt) : NaN;
  if (!isNaN(t)) return t;
  return /^[0-9a-f]{24}$/i.test(c.id) ? parseInt(c.id.slice(0, 8), 16) * 1000 : 0;
};

/** Newest batch first (batches with the same time keep the API order) */
export const newestFirst = (list: Course[]): Course[] => [...list].sort((a, b) => createdMs(b) - createdMs(a));
