import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, ChevronDown } from 'lucide-react';
import { OFFICIAL_LOGO } from '../branding';
import { Drawer } from './Drawer';
import { useClass } from '../utils/streams';
export { OFFICIAL_LOGO, SOCIAL_LINKS } from '../branding';

const LINKS = [
  { name: 'Home', path: '/', end: true },
  { name: 'My Courses', path: '/my-courses', end: false },
  { name: 'All Courses', path: '/courses', end: false },
  { name: 'Notes', path: '/notes', end: false },
  { name: 'Tests', path: '/tests', end: false },
  { name: 'About', path: '/about', end: false },
  { name: 'Developer Info', path: '/developer', end: false },
  { name: 'Social', path: '/social', end: false },
];

export const Navbar: React.FC<{ enrolledCount?: number }> = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [cls] = useClass();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-(--card) text-(color:--ink)' : 'text-(color:--muted) hover:text-(color:--ink)'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-(color:--line) bg-(--head) backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[72px] flex items-center gap-3">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-(color:--ink) cursor-pointer">
          <Menu className="w-7 h-7" />
        </button>

        {/* Logo + class picker */}
        <button
          onClick={() => navigate('/streams')}
          aria-label="Choose class"
          className="inline-flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl bg-(--card) border border-(color:--line) cursor-pointer text-left min-w-0"
        >
          <img src={OFFICIAL_LOGO} alt="STUDYMODSHRRY" className="w-10 h-10 rounded-full object-cover shrink-0" />
          <span className="leading-tight min-w-0">
            <span className="block font-heading font-bold text-[15px] text-(color:--ink) truncate">{cls === 'all' ? 'Select class' : cls}</span>
            <span className="block text-xs text-(color:--muted) truncate">STUDYMODSHRRY</span>
          </span>
          <ChevronDown className="w-5 h-5 text-(color:--muted) shrink-0" />
        </button>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {LINKS.map((l) => <NavLink key={l.path} to={l.path} end={l.end} className={linkClass}>{l.name}</NavLink>)}
        </nav>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} />

    </header>
  );
};
