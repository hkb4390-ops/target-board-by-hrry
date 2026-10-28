import React, { useEffect, useRef, useState } from 'react';

interface CarouselProps {
  items: React.ReactNode[];
  /** width classes for one slide, e.g. "w-[90%] md:w-[48%]" */
  itemClass: string;
  interval?: number;
  dots?: boolean;
}

/** Swipeable row that slides to the next item by itself, loops back to the start, and waits while the student is touching it */
export const Carousel: React.FC<CarouselProps> = ({ items, itemClass, interval = 3500, dots }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const current = useRef(0);
  const [index, setIndex] = useState(0);
  const n = items.length;

  const atEnd = (el: HTMLElement) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;

  const animating = useRef(false);

  const goTo = (i: number) => {
    const el = ref.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (!el || !kid || animating.current) return;
    const first = el.children[0] as HTMLElement;
    const from = el.scrollLeft;
    const to = Math.min(kid.offsetLeft - first.offsetLeft, el.scrollWidth - el.clientWidth);
    const t0 = performance.now();
    const dur = 550;
    animating.current = true;
    el.style.scrollSnapType = 'none'; // snap would fight the animation
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      el.scrollLeft = from + (to - from) * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
      else { animating.current = false; el.style.scrollSnapType = ''; }
    };
    requestAnimationFrame(step);
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el || n === 0) return;
    let best = 0;
    if (atEnd(el)) best = n - 1;
    else {
      const first = el.children[0] as HTMLElement;
      let dist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const d = Math.abs((c as HTMLElement).offsetLeft - first.offsetLeft - el.scrollLeft);
        if (d < dist) { dist = d; best = i; }
      });
    }
    current.current = best;
    setIndex(best);
  };

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || Date.now() < pausedUntil.current || document.hidden) return;
      if (el.scrollWidth <= el.clientWidth + 4) return;
      goTo(atEnd(el) || current.current >= n - 1 ? 0 : current.current + 1);
    }, interval);
    return () => clearInterval(t);
  }, [n, interval]);

  const pause = () => { pausedUntil.current = Date.now() + 6000; };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        onTouchStart={pause}
        onMouseDown={pause}
        onWheel={pause}
        className="relative flex items-start gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none"
      >
        {items.map((it, i) => (
          <div key={i} className={`snap-start shrink-0 ${itemClass}`}>{it}</div>
        ))}
      </div>
      {dots && n > 1 && (
        <div className="flex justify-center gap-2 mt-3.5">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => { pause(); goTo(i); }}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${i === index ? 'w-7 bg-(--dot-on)' : 'w-2.5 bg-(--dot-off)'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
