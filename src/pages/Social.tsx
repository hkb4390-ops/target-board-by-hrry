import React from 'react';
import { ExternalLink, Youtube, Instagram, Send, MessageCircle } from 'lucide-react';
import { SOCIAL_LINKS, OFFICIAL_LOGO } from '../branding';

const ITEMS = [
  { label: 'Subscribe on YouTube', hint: 'Watch free lectures', href: SOCIAL_LINKS.youtube, Icon: Youtube, tint: '#FF0000' },
  { label: 'Follow on Instagram', hint: '@studumodshrry', href: SOCIAL_LINKS.instagram, Icon: Instagram, tint: '#E1306C' },
  { label: 'Join Telegram Channel', hint: 'Stay in the community', href: SOCIAL_LINKS.telegram, Icon: Send, tint: '#229ED9' },
  { label: 'Join WhatsApp Channel', hint: 'Get instant updates', href: SOCIAL_LINKS.whatsappChannel, Icon: MessageCircle, tint: '#25D366' },
];

export const Social: React.FC = () => (
  <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
    <div className="flex items-center gap-4">
      <img src={OFFICIAL_LOGO} alt="" className="w-16 h-16 rounded-2xl object-cover border border-(color:--line)" />
      <div>
        <h1 className="font-heading font-bold text-2xl text-(color:--ink) leading-tight">Social Media</h1>
        <p className="text-sm text-(color:--muted)">Follow STUDYMODSHRRY everywhere</p>
      </div>
    </div>

    <section>
      <p className="px-1 mb-2 text-xs font-bold tracking-[0.2em] text-(color:--muted)">COMMUNITY</p>
      <div className="rounded-3xl bg-(--card) border border-(color:--line) overflow-hidden divide-y divide-(color:--line)">
        {ITEMS.map(({ label, hint, href, Icon, tint }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-4 px-4 py-4 hover:bg-(--chip) transition-colors">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${tint}1F`, color: tint }}>
              <Icon className="w-6 h-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading font-bold text-[16px] text-(color:--ink)">{label}</span>
              <span className="block text-sm text-(color:--muted) truncate">{hint}</span>
            </span>
            <ExternalLink className="w-5 h-5 text-(color:--muted) shrink-0" />
          </a>
        ))}
      </div>
    </section>
  </div>
);
