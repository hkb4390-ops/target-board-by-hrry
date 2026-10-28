import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Course } from '../types';
import { STREAMS, BOARDS, MEDIUMS, useClass, useBoard, useMedium, matchesClass, needsBoard } from '../utils/streams';
import { fetchCourses } from '../services/api';
import { CourseGrid } from '../components/CourseGrid';
import { ErrorState } from '../components/ErrorState';
import { Search, Filter, SlidersHorizontal, BookOpen, Layers } from 'lucide-react';

export const Courses: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useClass();
  const [board] = useBoard();
  const [medium] = useMedium();
  const [sortBy, setSortBy] = useState<'featured' | 'title' | 'lessons'>('featured');

  const loadData = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (err) {
      console.error('Courses page fetch error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync URL search query if changed from navbar
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const categories = ['all', ...STREAMS.map((s) => s.label)];

  const filteredCourses = useMemo(() => {
    let result = courses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(c => matchesClass(c, selectedCategory, board, medium));
    }

    if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'lessons') {
      result = [...result].sort((a, b) => (b.totalLectures || 0) - (a.totalLectures || 0));
    }

    return result;
  }, [courses, searchQuery, selectedCategory, board, medium, sortBy]);

  // "Bihar Board · Hindi Medium" note, so a short list is never a mystery
  const boardNote = needsBoard(selectedCategory)
    ? [BOARDS.find((b) => b.id === board)?.label, MEDIUMS.find((m) => m.id === medium)?.label].filter(Boolean).join(' · ')
    : '';

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-heading font-black text-(color:--ink) tracking-tight">
          Courses Available
        </h1>
        <p className="text-sm text-(color:--muted) max-w-2xl">
          Pick your class, then open a subject. Every video lecture and note is free.
        </p>
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="p-4 rounded-2xl bg-(--card) border border-(color:--line) space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-(color:--muted) absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batches, e.g. Class 11"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-(--card) text-sm text-(color:--ink) pl-10 pr-9 py-2.5 rounded-xl border border-(color:--line) focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 placeholder-zinc-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(color:--muted) hover:text-(color:--accent)"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-(color:--accent)" />
            <span className="text-xs text-(color:--muted)">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-(--card) text-xs font-semibold text-(color:--ink) px-3 py-2.5 rounded-xl border border-(color:--line) focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="featured">Featured Order</option>
              <option value="title">Course Title (A-Z)</option>
              <option value="lessons">Most Lessons</option>
            </select>
          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-(color:--line) scrollbar-none">
          
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-(--btn) text-(color:--btnink) font-bold'
                  : 'bg-(--card) text-(color:--muted) hover:text-(color:--accent) hover:bg-(--chip) border border-(color:--line)'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

      </div>

      {boardNote && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-(color:--muted)">Showing <span className="font-bold text-(color:--ink)">{boardNote}</span></span>
          <Link to="/streams" className="shrink-0 font-bold text-(color:--accent)">Change</Link>
        </div>
      )}

      {/* Results Count Indicator */}
      <div className="flex items-center justify-between text-xs text-(color:--muted)">
        <span>
          Showing <span className="font-bold text-(color:--ink)">{filteredCourses.length}</span> courses
        </span>
        {searchQuery && (
          <span>
            Search query: <span className="text-(color:--accent) font-bold">"{searchQuery}"</span>
          </span>
        )}
      </div>

      {/* Courses Grid */}
      {hasError ? (
        <ErrorState onRetry={loadData} />
      ) : (
        <CourseGrid 
          courses={filteredCourses} 
          isLoading={isLoading} 
        />
      )}

    </div>
  );
};
