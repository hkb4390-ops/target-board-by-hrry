import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { MyCourses } from './pages/MyCourses';
import { Tests, TestsFrame } from './pages/Tests';
import { resolveThumb } from './utils/thumb';
import { SelectStreams } from './pages/SelectStreams';
import { Notes } from './pages/Notes';
import { Social } from './pages/Social';
import { NoteEditor } from './pages/NoteEditor';
import { Splash } from './components/Splash';
import { useLocalPref } from './utils/prefs';
import { Courses } from './pages/Courses';
import { CourseDetails } from './pages/CourseDetails';
import { Player } from './pages/Player';
import { PlayerQuery } from './pages/PlayerQuery';
import { About } from './pages/About';
import { Developer } from './pages/Developer';
import { NotFound } from './pages/NotFound';
import { useEnrolledCount } from './utils/enrollment';

// Automatically scroll to top on page navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const enrolledCount = useEnrolledCount();
  const { pathname } = useLocation();
  useEffect(() => { resolveThumb(); }, []);
  // Welcome screen: once per browser session
  const [splash, setSplash] = useState(() => sessionStorage.getItem('tb_splash') !== '1');
  const endSplash = () => { try { sessionStorage.setItem('tb_splash', '1'); } catch { /* private mode */ } setSplash(false); };
  // Course + player pages draw their own yellow header, so the global navbar / tabs / footer are hidden there
  const tbPage = pathname.startsWith('/course/') || pathname.startsWith('/player/');
  const bare = pathname.startsWith('/notes') || tbPage; // full-screen pages: no navbar / tabs
  const [dark] = useLocalPref<boolean>('tb_dark', false);
  // Yellow app look on the main tabs; course pages and the player stay dark
  const yellow = !dark && (bare || ['/', '/courses', '/my-courses', '/tests', '/streams', '/developer', '/social', '/about'].includes(pathname));
  useEffect(() => { document.documentElement.classList.toggle('theme-yellow', yellow); }, [yellow]);
  useEffect(() => { document.documentElement.classList.toggle('tb-grad', tbPage && yellow); }, [tbPage, yellow]);

  return (
    <>
      {splash && <Splash onDone={endSplash} />}
      <ScrollToTop />
      <div className={`min-h-screen flex flex-col bg-(--page) text-(color:--ink) font-sans selection:bg-blue-500 selection:text-white ${bare ? '' : 'pb-16 md:pb-0'}`}>
        
        {/* Top Navbar */}
        {pathname !== '/streams' && !bare && <Navbar enrolledCount={enrolledCount} />}

        {/* Main Content View with Dynamic Routes */}
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/streams" element={<SelectStreams />} />
            <Route path="/social" element={<Social />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:id" element={<NoteEditor />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:id" element={<CourseDetails />} />
            <Route path="/player" element={<PlayerQuery />} />
            <Route path="/player/:courseId/:lessonId" element={<Player />} />
            <Route path="/my-learning" element={<Navigate to="/my-courses" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/developer" element={<Developer />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <TestsFrame active={pathname === '/tests'} />
        </main>

        {/* Footer */}
        {pathname !== '/tests' && pathname !== '/streams' && !bare && <Footer />}

        {/* Bottom Navigation Bar (Courses, Enrolled Batches, Developer Info) */}
        {!bare && <BottomNav enrolledCount={enrolledCount} />}

      </div>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

export default App;
