import React from 'react';
import { OFFICIAL_LOGO } from '../branding';
import { 
  Sparkles, ShieldCheck, BookOpen, Layers, 
  Smartphone, Award, Heart, Globe, Code 
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16 animate-fade-in">
      
      {/* Brand Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-(--card) border border-(color:--line) p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl overflow-hidden border border-white/15 bg-black shadow-xl">
          <img
            src={OFFICIAL_LOGO}
            alt="STUDYMODSHRRY Official Logo"
            className="w-full h-full object-cover object-top"
          />
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--btn)/20 border border-blue-500/20 text-(color:--accent) text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Platform Overview</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-black text-(color:--ink) tracking-tight">
            About STUDYMODSHRRY
          </h1>
          <p className="text-sm sm:text-base text-(color:--ink) leading-relaxed font-sans">
            STUDYMODSHRRY is a modern educational technology initiative developed to democratize high-quality board exam preparation, skill-building, and digital learning for students across India.
          </p>
        </div>
      </div>

      {/* Platform Features Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-(color:--accent) uppercase tracking-wider">
            Architecture & Vision
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-(color:--ink)">
            What Sets Us Apart
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-(--card)/80 border border-(color:--line) space-y-3 shadow-xl">
            <div className="p-3 w-fit rounded-xl bg-(--btn)/20 text-(color:--accent)">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-(color:--ink)">100% Free & Open</h3>
            <p className="text-xs text-(color:--muted) leading-relaxed">
              No hidden fees, subscription models, or payment gateways. Every course, test session, and chapter PDF is unlocked and accessible to all students.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-(--card)/80 border border-(color:--line) space-y-3 shadow-xl">
            <div className="p-3 w-fit rounded-xl bg-(--btn)/20 text-(color:--accent)">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-(color:--ink)">Structured Curriculums</h3>
            <p className="text-xs text-(color:--muted) leading-relaxed">
              Courses are organized section-by-section with clear module outlines, sequential lesson tracking, and separated video classes and handwritten documents.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-(--card)/80 border border-(color:--line) space-y-3 shadow-xl">
            <div className="p-3 w-fit rounded-xl bg-sky-500/10 text-sky-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-(color:--ink)">Mobile-First Experience</h3>
            <p className="text-xs text-(color:--muted) leading-relaxed">
              Built from the ground up for phones and low-bandwidth connections with high-performance adaptive HLS streaming and minimal battery drain.
            </p>
          </div>
        </div>
      </div>

      {/* Mission & Values */}
      <div className="p-8 rounded-3xl bg-(--card)/90 border border-(color:--line) space-y-4 shadow-xl">
        <h3 className="text-xl font-heading font-black text-(color:--ink) flex items-center gap-2">
          <Award className="w-5 h-5 text-(color:--accent)" />
          <span>Our Mission</span>
        </h3>
        <p className="text-sm text-(color:--ink) leading-relaxed">
          Education should be empowering, accessible, and free of artificial friction. At STUDYMODSHRRY, we believe every student deserves access to the finest teachers, well-indexed revision materials, and uninterrupted video lectures regardless of their geographical location or financial background.
        </p>
      </div>

    </div>
  );
};
