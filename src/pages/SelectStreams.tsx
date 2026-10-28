import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { STREAMS, BOARDS, MEDIUMS, useClass, useBoard, useMedium, needsBoard } from '../utils/streams';

export const SelectStreams: React.FC = () => {
  const navigate = useNavigate();
  const [cls, setCls] = useClass();
  const [board, setBoard] = useBoard();
  const [medium, setMedium] = useMedium();
  const [sheetBoard, setSheetBoard] = useState<string | null>(null); // board whose medium sheet is open

  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  // Class 9 to 12 go on to board + medium; the other streams have none, so they finish right away
  const pick = (label: string) => {
    setCls(label);
    if (!needsBoard(label)) setTimeout(leave, 180);
  };

  const chooseMedium = (mediumId: string) => {
    if (!sheetBoard) return;
    setBoard(sheetBoard);
    setMedium(mediumId);
    setSheetBoard(null);
    setTimeout(leave, 180);
  };

  const reset = () => {
    setCls('all');
    setBoard('all');
    setMedium('all');
    setTimeout(leave, 120);
  };

  useEffect(() => {
    if (!sheetBoard) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetBoard(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetBoard]);

  const sheet = BOARDS.find((b) => b.id === sheetBoard) || null;
  const mediumLabel = MEDIUMS.find((m) => m.id === medium)?.label;

  return (
    <div className="min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-5rem)] bg-[linear-gradient(to_bottom,var(--head),var(--page))] animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-10">
        <div className="relative flex items-center justify-center h-12">
          <button onClick={leave} aria-label="Back" className="absolute left-0 w-11 h-11 rounded-full flex items-center justify-center text-(color:--ink) cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-bold text-xl text-(color:--ink)">Select Streams</h1>
        </div>

        <h2 className="mt-6 mb-4 text-xl font-heading font-semibold text-(color:--ink)">Select your class</h2>

        <div role="radiogroup" aria-label="Class" className="grid grid-cols-2 gap-3 sm:gap-4">
          {STREAMS.map(({ label }) => {
            const on = cls === label;
            return (
              <button
                key={label}
                role="radio"
                aria-checked={on}
                onClick={() => pick(label)}
                className={`flex items-center gap-3 px-4 py-5 rounded-2xl bg-(--card) text-left cursor-pointer border-2 transition-colors ${on ? 'border-(--btn)' : 'border-transparent'}`}
              >
                <span className={`w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center ${on ? 'border-(color:--ink)' : 'border-(color:--muted)'}`}>
                  {on && <span className="w-3.5 h-3.5 rounded-full bg-(--ink)" />}
                </span>
                <span className="text-[15px] sm:text-base font-medium text-(color:--ink) leading-snug">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Board: only for Class 9 to 12. Tapping a board opens the medium sheet. */}
        {needsBoard(cls) && (
          <>
            <h2 className="mt-10 mb-4 text-xl font-heading font-semibold text-(color:--ink)">Select your board</h2>
            <div className="space-y-4">
              {BOARDS.map((b) => {
                const on = board === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSheetBoard(b.id)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-(--card) text-left cursor-pointer border-2 transition-colors ${on ? 'border-(--btn)' : 'border-transparent'}`}
                  >
                    <img src={b.logo} alt="" referrerPolicy="no-referrer" className="w-[46px] h-[46px] rounded-full object-cover shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px] sm:text-lg font-medium text-(color:--ink) leading-snug">{b.label}</span>
                      {on && mediumLabel && <span className="block text-xs font-semibold text-(color:--muted)">{mediumLabel}</span>}
                    </span>
                    <ChevronRight className="w-6 h-6 text-(color:--muted) shrink-0" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {cls !== 'all' && (
          <button onClick={reset} className="mt-6 text-sm font-bold text-(color:--accent) cursor-pointer">
            Show all classes
          </button>
        )}
      </div>

      {/* "Please Select Your Medium" bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-[100] flex items-end" role="dialog" aria-modal="true" aria-label="Please select your medium">
          <button aria-label="Close" onClick={() => setSheetBoard(null)} className="absolute inset-0 bg-black/55 animate-fade-in cursor-default" />
          <div className="tb-sheet relative w-full max-w-3xl mx-auto rounded-t-[32px] bg-(--card) px-5 pt-8 pb-3 safe-bottom">
            <h3 className="text-center font-heading font-bold text-[22px] text-(color:--ink)">Please Select Your Medium</h3>

            <div className="mt-7 space-y-4">
              {MEDIUMS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => chooseMedium(m.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-(--card) border border-(color:--line) shadow-[0_2px_8px_rgba(0,0,0,.08)] text-left cursor-pointer active:scale-[0.985] transition-transform"
                >
                  <img src={sheet.logo} alt="" referrerPolicy="no-referrer" className="w-[46px] h-[46px] rounded-full object-cover shrink-0" />
                  <span className="flex-1 text-[17px] sm:text-lg font-medium text-(color:--ink)">{m.label}</span>
                  <ChevronRight className="w-6 h-6 text-(color:--muted) shrink-0" />
                </button>
              ))}
            </div>

            <button onClick={() => setSheetBoard(null)} className="mt-4 w-full py-4 text-lg text-(color:--muted) cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
