import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VideoPlayer } from '../components/VideoPlayer';
import { Lesson } from '../types';

// Direct player link: /player?type=video&title=...&assetId=...&id=...&url=...&courseId=...
export const PlayerQuery: React.FC = () => {
  const [p] = useSearchParams();
  const courseId = p.get('courseId') || '';
  const assetId = p.get('assetId') || '';
  const url = p.get('url') || '';
  const title = p.get('title') || 'Class';

  if (!assetId && !url) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center p-8">
        <p className="text-slate-300">This player link is missing a video.</p>
        <Link to="/courses" className="text-blue-400 hover:underline">Browse courses</Link>
      </div>
    );
  }

  const lesson: Lesson = {
    id: p.get('id') || assetId,
    title,
    type: 'video',
    duration: '',
    assetId,
    playerUrl: url,
    isFree: true,
    order: 1,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <Link to={courseId ? `/course/${courseId}` : '/courses'} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <VideoPlayer lesson={lesson} courseId={courseId} courseTitle={title} />
    </div>
  );
};
