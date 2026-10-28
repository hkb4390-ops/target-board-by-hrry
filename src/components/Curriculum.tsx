import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Lesson } from '../types';
import { 
  ChevronDown, ChevronRight, PlayCircle, FileText, 
  CheckCircle2, Circle, Unlock, Film, Layers, BookOpen
} from 'lucide-react';
import { isLessonCompleted } from '../utils/progress';

interface CurriculumProps {
  folders: Folder[];
  courseId: string;
  activeLessonId?: string;
  onSelectLesson?: (lesson: Lesson) => void;
}

export const Curriculum: React.FC<CurriculumProps> = ({
  folders,
  courseId,
  activeLessonId,
  onSelectLesson,
}) => {
  const navigate = useNavigate();

  // Keep track of which section IDs are expanded. By default, open the first 3 sections.
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>(() => {
    return folders.slice(0, 3).map(f => f.id);
  });

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const handleLessonClick = (lesson: Lesson) => {
    // Video lessons with an original provider URL open it directly, avoiding the extra in-site launch screen.
    if (lesson.type === 'video' && lesson.playerUrl) {
      try {
        const target = new URL(lesson.playerUrl, window.location.origin);
        if (target.origin !== window.location.origin) {
          window.open(target.href, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch { /* fall back to the normal player flow */ }
    }
    if (onSelectLesson) onSelectLesson(lesson);
    else navigate(`/player/${courseId}/${lesson.id}`);
  };

  if (!folders || folders.length === 0) {
    return (
      <div className="p-8 text-center bg-[#15171C]/50 rounded-2xl border border-white/5">
        <Layers className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-zinc-300">Curriculum will be added shortly.</p>
        <p className="text-xs text-zinc-500 mt-1">Check back later for updated chapters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {folders.map((folder, fIdx) => {
        const isExpanded = expandedFolderIds.includes(folder.id);
        const sectionNum = String(fIdx + 1).padStart(2, '0');
        const lessonCount = folder.lessons?.length || 0;
        const subfolderCount = folder.subfolders?.length || 0;

        return (
          <div
            key={folder.id || fIdx}
            className="rounded-2xl bg-[#15171C]/80 border border-white/10 overflow-hidden transition-all duration-200"
          >
            {/* Section Header Button */}
            <button
              onClick={() => toggleFolder(folder.id)}
              className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 shrink-0">
                  {sectionNum}
                </span>
                <div className="min-w-0">
                  <h4 className="font-heading font-bold text-sm sm:text-base text-white truncate">
                    {folder.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {lessonCount > 0 ? `${lessonCount} Lessons` : ''}
                    {lessonCount > 0 && subfolderCount > 0 ? ' · ' : ''}
                    {subfolderCount > 0 ? `${subfolderCount} Sub-chapters` : ''}
                  </p>
                </div>
              </div>

              <div className="text-zinc-400 shrink-0 p-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-blue-400" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Section Lessons & Subfolders */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-1.5 animate-fade-in">
                {/* Subfolders if any */}
                {folder.subfolders && folder.subfolders.length > 0 && (
                  <div className="pl-3 py-1 space-y-2">
                    {folder.subfolders.map((sub, sIdx) => (
                      <div key={sub.id || sIdx} className="border-l-2 border-blue-500/30 pl-3 space-y-1">
                        <span className="text-xs font-bold text-zinc-400 block mb-1">
                          {sub.name}
                        </span>
                        {sub.lessons?.map((subLesson) => {
                          const isCompleted = isLessonCompleted(courseId, subLesson.id);
                          const isActive = subLesson.id === activeLessonId;

                          return (
                            <div
                              key={subLesson.id}
                              onClick={() => handleLessonClick(subLesson)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                                isActive
                                  ? 'bg-blue-600/30 text-white border border-blue-500/50 shadow-sm'
                                  : 'hover:bg-white/5 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {subLesson.type === 'video' ? (
                                  <Film className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                )}
                                <span className="truncate font-medium">{subLesson.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-zinc-500">{subLesson.duration}</span>
                                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* Direct Lessons */}
                {folder.lessons && folder.lessons.map((lesson, lIdx) => {
                  const isCompleted = isLessonCompleted(courseId, lesson.id);
                  const isActive = lesson.id === activeLessonId;
                  const isVideo = lesson.type === 'video';

                  return (
                    <div
                      key={lesson.id || lIdx}
                      onClick={() => handleLessonClick(lesson)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600/25 text-white border border-blue-500/40 shadow-md'
                          : 'hover:bg-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg ${
                          isActive 
                            ? 'bg-blue-500 text-[#1A1405]' 
                            : isVideo 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {isVideo ? (
                            <PlayCircle className="w-4 h-4 fill-current/20" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${
                            isActive ? 'text-white' : 'text-zinc-200'
                          }`}>
                            {lesson.title}
                          </p>
                          <span className="text-[10px] text-zinc-500">
                            {lesson.duration || (isVideo ? 'Video Lecture' : 'PDF Document')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Completed</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                            <Circle className="w-3 h-3 text-zinc-600" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* If empty */}
                {(!folder.lessons || folder.lessons.length === 0) && (!folder.subfolders || folder.subfolders.length === 0) && (
                  <p className="text-xs text-zinc-500 italic p-3 text-center">
                    No items in this section.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
