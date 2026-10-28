import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Instagram, Send, MessageCircle } from 'lucide-react';
import { OFFICIAL_LOGO, SOCIAL_LINKS } from '../branding';

const socials = [
  { href: SOCIAL_LINKS.youtube, label: 'YouTube', Icon: Youtube },
  { href: SOCIAL_LINKS.instagram, label: 'Instagram', Icon: Instagram },
  { href: SOCIAL_LINKS.telegram, label: 'Telegram', Icon: Send },
  { href: SOCIAL_LINKS.whatsappChannel, label: 'WhatsApp Channel', Icon: MessageCircle },
];

export const Footer: React.FC = () => (
  <footer className="w-full border-t border-(color:--line) bg-(--page) mt-auto pb-20 md:pb-0">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg overflow-hidden border border-(color:--line) bg-black">
            <img src={OFFICIAL_LOGO} alt="STUDYMODSHRRY" className="w-full h-full object-cover" />
          </span>
          <span>
            <span className="block font-heading font-bold text-(color:--ink)">STUDYMODSHRRY</span>
            <span className="block text-xs text-(color:--muted)">Free board exam batches, lectures and notes</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-(color:--muted)">
          <Link to="/" className="hover:text-(color:--accent) transition-colors">Home</Link>
          <Link to="/tests" className="hover:text-(color:--accent) transition-colors">Tests</Link>
          <Link to="/courses" className="hover:text-(color:--accent) transition-colors">Courses</Link>
          <Link to="/about" className="hover:text-(color:--accent) transition-colors">About</Link>
          <Link to="/developer" className="hover:text-(color:--accent) transition-colors">Developer Info</Link>
        </nav>

        <div className="flex items-center gap-2">
          {socials.map(({ href, label, Icon }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
               className="w-9 h-9 rounded-lg border border-(color:--line) flex items-center justify-center text-(color:--ink) hover:text-(color:--accent) hover:bg-(--chip) transition-colors">
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-(color:--line) flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-(color:--muted)">
        <span>&copy; {new Date().getFullYear()} STUDYMODSHRRY. All rights reserved.</span>
        <span>Crafted by <Link to="/developer" className="text-(color:--ink) hover:text-(color:--accent)">@studumodshrry</Link></span>
      </div>
    </div>
  </footer>
);
