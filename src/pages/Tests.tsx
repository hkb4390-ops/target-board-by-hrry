import React, { useEffect, useState } from 'react';

/**
 * The MCQ test app (public/tests.html) is loaded quietly in the background a moment after the site opens,
 * so by the time the student taps Tests it is already ready. Switching tabs also keeps their place.
 */
export const TestsFrame: React.FC<{ active: boolean }> = ({ active }) => {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { if (active) setMounted(true); }, [active]);

  if (!mounted) {
    return active ? <TestsLoader /> : null;
  }
  return (
    <>
      {active && !loaded && <TestsLoader />}
      <iframe
        src="/tests.html"
        title="Tests"
        onLoad={() => setLoaded(true)}
        className={
          active
            ? 'block w-full border-0 h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4.5rem)]'
            : 'fixed w-px h-px opacity-0 pointer-events-none -z-10 border-0'
        }
        style={active && !loaded ? { height: 0 } : undefined}
      />
    </>
  );
};

const TestsLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 h-[calc(100dvh-10rem)] text-(color:--muted)">
    <div className="w-10 h-10 rounded-full border-4 border-(color:--line) border-t-(--btn) animate-spin" />
    <p className="text-sm font-semibold">Opening tests...</p>
  </div>
);

export const Tests: React.FC = () => null;
