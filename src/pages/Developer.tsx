import React from 'react';
import { OFFICIAL_LOGO, SOCIAL_LINKS } from '../branding';
import { 
  User, MapPin, Code2, Palette, Smartphone, 
  Globe, Youtube, Instagram, Send, MessageSquare, 
  Sparkles, CheckCircle2, ShieldCheck, Mail 
} from 'lucide-react';

export const Developer: React.FC = () => {
  const skills = [
    { name: 'Web Development', desc: 'React, Next.js, TypeScript, Cloudflare & Edge APIs' },
    { name: 'App Development', desc: 'Mobile-first progressive applications, Android & iOS architecture' },
    { name: 'UI/UX Design', desc: 'Clean interfaces, clear navigation & responsive typography' },
    { name: 'Graphic Design', desc: 'Brand identity systems, media streaming visuals & vector assets' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 animate-fade-in">
      
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--chip) border border-(color:--line) text-(color:--accent) text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-(color:--accent)" />
          <span>Architect & Creator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-(color:--ink) tracking-tight">
          Developer Info
        </h1>
        <p className="text-sm text-(color:--muted) max-w-lg mx-auto">
          Get to know the developer, architect, and designer behind the STUDYMODSHRRY digital learning ecosystem.
        </p>
      </div>

      {/* Main Developer Profile Card */}
      <div className="relative rounded-3xl overflow-hidden bg-(--card) border border-(color:--line) p-6 sm:p-10 shadow-2xl space-y-8">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-(--btn)/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10 text-center sm:text-left">
          
          {/* Animated logo: spinning gold ring, soft pulses, gentle float */}
          <div className="relative shrink-0 tb-float">
            {/* expanding pulse rings */}
            <span className="tb-ping absolute inset-0 rounded-[2rem] border border-blue-400/50 pointer-events-none" />
            <span className="tb-ping tb-ping-2 absolute inset-0 rounded-[2rem] border border-blue-400/40 pointer-events-none" />

            {/* soft glow */}
            <div className="tb-glow absolute -inset-4 rounded-[2.5rem] bg-(--btn)/40 blur-2xl pointer-events-none" />

            {/* rotating ring: a spinning gradient clipped to a thin border */}
            <div className="relative p-[3px] rounded-[2rem] overflow-hidden">
              <span
                aria-hidden="true"
                className="tb-ring-spin absolute -inset-[70%]"
                style={{ background: 'conic-gradient(from 0deg, rgba(244,188,74,0) 0deg, rgba(244,188,74,0) 200deg, #F4BC4A 300deg, #FBDC8E 340deg, rgba(244,188,74,0) 360deg)' }}
              />
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[1.8rem] overflow-hidden bg-black border border-(color:--line)">
                <img
                  src={OFFICIAL_LOGO}
                  alt="@studumodshrry - STUDYMODSHRRY"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Core Info */}
          <div className="space-y-3 min-w-0 flex-1">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl sm:text-3xl font-heading font-black text-(color:--ink)">
                  @studumodshrry
                </h2>
                <span className="tb-glow p-1 rounded-full bg-(--chip) text-(color:--accent)">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              
              <p className="text-sm font-bold text-(color:--accent) mt-0.5">
                Brand: <span className="text-(color:--ink) font-extrabold">STUDYMODSHRRY</span>
              </p>
              
              <p className="text-xs text-(color:--ink) font-semibold mt-1">
                Developer & Designer
              </p>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-(color:--muted)">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Champaran, Bihar, India</span>
            </div>

            <p className="text-xs sm:text-sm text-(color:--ink) leading-relaxed pt-1">
              Passionate full-stack developer and UI/UX designer building high-performance educational platforms, video streaming pipelines, and clean mobile interfaces for students.
            </p>
          </div>

        </div>

        {/* Skills Section */}
        <div className="pt-6 border-t border-(color:--line) space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-(color:--accent) flex items-center gap-2 font-heading">
            <Code2 className="w-4 h-4" />
            <span>Core Expertise & Skills</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {skills.map((s) => (
              <div
                key={s.name}
                className="p-4 rounded-2xl bg-(--chip) border border-(color:--line) space-y-1 hover:border-(color:--line) transition-colors"
              >
                <h4 className="text-sm font-bold text-(color:--ink) flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-(--accent)" />
                  <span>{s.name}</span>
                </h4>
                <p className="text-xs text-(color:--muted) pl-3">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Official Social Links & Contact Grid */}
        <div className="pt-6 border-t border-(color:--line) space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-(color:--accent) flex items-center gap-2 font-heading">
            <Globe className="w-4 h-4" />
            <span>Official Channels</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
            <a
              href={SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-(--chip) hover:bg-(--chip) text-(color:--ink) border border-(color:--line) transition-all shadow-md group"
            >
              <div className="flex items-center gap-3">
                <Youtube className="w-5 h-5 text-(color:--accent)" />
                <span>YouTube Channel</span>
              </div>
              <span className="text-[10px] text-(color:--muted) group-hover:translate-x-1 transition-transform">Visit &rarr;</span>
            </a>

            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-(--chip) hover:bg-(--chip) text-(color:--ink) border border-(color:--line) transition-all shadow-md group"
            >
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-(color:--accent)" />
                <span>Instagram Profile</span>
              </div>
              <span className="text-[10px] text-(color:--muted) group-hover:translate-x-1 transition-transform">Visit &rarr;</span>
            </a>

            <a
              href={SOCIAL_LINKS.telegram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-(--chip) hover:bg-(--chip) text-(color:--ink) border border-(color:--line) transition-all shadow-md group"
            >
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-(color:--accent)" />
                <span>Telegram Community</span>
              </div>
              <span className="text-[10px] text-(color:--muted) group-hover:translate-x-1 transition-transform">Join &rarr;</span>
            </a>

            <a
              href={SOCIAL_LINKS.whatsappChannel}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-(--chip) hover:bg-(--chip) text-(color:--ink) border border-(color:--line) transition-all shadow-md group"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-(color:--accent)" />
                <span>WhatsApp Channel</span>
              </div>
              <span className="text-[10px] text-(color:--muted) group-hover:translate-x-1 transition-transform">Follow &rarr;</span>
            </a>
          </div>
        </div>

      </div>

    </div>
  );
};
