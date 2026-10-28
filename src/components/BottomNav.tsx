import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, LayoutGrid, ClipboardList, Code2 } from 'lucide-react';

export const BottomNav: React.FC<{ enrolledCount?: number }> = ({ enrolledCount = 0 }) => {
  const path = useLocation().pathname;
  const items = [
    { to: '/', label: 'Home', Icon: Home, active: path === '/', badge: 0 },
    { to: '/my-courses', label: 'My Course', Icon: BookOpen, active: path === '/my-courses', badge: enrolledCount },
    { to: '/courses', label: 'All Courses', Icon: LayoutGrid, active: path === '/courses' || path.startsWith('/course/'), badge: 0 },
    { to: '/tests', label: 'Tests', Icon: ClipboardList, active: path === '/tests', badge: 0 },
    { to: '/developer', label: 'Developer', Icon: Code2, active: path === '/developer' || path === '/social', badge: 0 },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-(--card) border-t border-(color:--line) safe-bottom">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {items.map(({ to, label, Icon, active, badge }) => (
          <Link key={to} to={to} className={`flex flex-col items-center gap-1 pb-2 text-[11px] font-semibold ${active ? 'text-(color:--ink)' : 'text-(color:--muted)'}`}>
            <span className={`relative flex items-center justify-center transition-all ${active ? '-mt-6 w-14 h-14 rounded-full bg-[#111] text-[#FFD60A] ring-4 ring-(--card) shadow-lg' : 'mt-2.5 w-7 h-7'}`}>
              <Icon className="w-[22px] h-[22px]" />
              {badge > 0 && <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{badge}</span>}
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
