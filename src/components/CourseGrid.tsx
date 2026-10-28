import React from 'react';
import { Course } from '../types';
import { CourseCard } from './CourseCard';
import { BookOpen } from 'lucide-react';

interface CourseGridProps {
  courses: Course[];
  isLoading?: boolean;
}

export const CourseGrid: React.FC<CourseGridProps> = ({ courses, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-(--card) border border-(color:--line) overflow-hidden animate-pulse flex flex-col"
          >
            <div className="aspect-video w-full bg-(--chip)" />
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-(--chip) rounded w-3/4" />
                <div className="h-3 bg-(--chip) rounded w-full" />
                <div className="h-3 bg-(--chip) rounded w-2/3" />
              </div>
              <div className="pt-3 border-t border-(color:--line) flex justify-between items-center">
                <div className="h-3 bg-(--chip) rounded w-16" />
                <div className="h-8 bg-(--chip) rounded-xl w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="py-16 text-center bg-(--card) rounded-3xl border border-dashed border-(color:--line) p-8">
        <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-(color:--ink)">No Courses Found</h3>
        <p className="text-xs text-(color:--muted) mt-1 max-w-sm mx-auto">
          We couldn't find any courses matching your criteria. Try adjusting your search query or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
};
