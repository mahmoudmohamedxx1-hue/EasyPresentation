/* ------------------------------------------------------------------ */
/*  Present — full-screen show: keyboard nav, progress, speaker notes, */
/*  and a presenter thumbnail strip along the bottom.                  */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";
import { Deck } from "../lib/types";
import { getTheme } from "../lib/themes";
import { wordCount } from "../lib/types";
import SlideCard from "./SlideCard";
import { useWidth } from "./useWidth";
import { IconChevronDown, IconNote, IconX } from "./icons";

interface Props {
  deck: Deck;
  onExit: () => void;
}

export default function PresentView({ deck, onExit }: Props) {
  const [i, setI] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [hideStrip, setHideStrip] = useState(false);
  const [stageRef, stageW] = useWidth<HTMLDivElement>();
  const [stripRef, stripW] = useWidth<HTMLDivElement>();

  const n = deck.slides.length;
  const idx = Math.min(i, n - 1);
  const slide = deck.slides[idx];
  const theme = getTheme(deck.themeId);

  const next = useCallback(() => setI((v) => Math.min(v + 1, n - 1)), [n]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key.toLowerCase() === "n") setShowNotes((s) => !s);
      else if (e.key.toLowerCase() === "t") setHideStrip((s) => !s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit]);

  const stageH = stageW > 0 ? (stageW * 9) / 16 : 0;
  const words = wordCount([slide.title, ...slide.bullets].join(" "));

  const stripVisible = n > 1 && !hideStrip;
  const thumbW = stripW > 0 ? Math.max(84, Math.min(148, (stripW - 24) / Math.min(n, 8) - 10)) : 120;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0f0f]">
      {/* progress bar */}
      <div className="absolute left-0 top-0 z-20 h-[3px] w-full bg-white/10">
        <div
          className="h-full bg-moss transition-all duration-300 ease-out"
          style={{ width: `${((idx + 1) / n) * 100}%` }}
        />
      </div>

      {/* top-right controls */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[11.5px] font-semibold text-white/80">
          {idx + 1} / {n}
        </span>
        <button
          onClick={() => setShowNotes((s) => !s)}
          className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
            showNotes ? "bg-moss text-white" : "bg-white/10 text-white/80 hover:bg-white/20"
          }`}
          title="Speaker notes (N)"
        >
          <IconNote size={16} />
        </button>
        {n > 1 && (
          <button
            onClick={() => setHideStrip((s) => !s)}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
            title="Toggle film strip (T)"
          >
            <IconChevronDown size={16} className={hideStrip ? "rotate-180" : ""} />
          </button>
        )}
        <button
          onClick={onExit}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-ember hover:text-white"
          title="Exit (Esc)"
        >
          <IconX size={16} />
        </button>
      </div>

      {/* stage */}
      <div ref={stageRef} className="flex min-h-0 flex-1 items-center justify-center px-6 pb-2 pt-10">
        {stageW > 10 && (
          <div className="pop-in" key={slide.id} style={{ width: stageW, maxWidth: 1180 }}>
            <SlideCard slide={slide} deckTitle={deck.title} theme={theme} width={Math.min(stageW, 1180)} showNumber={false} />
          </div>
        )}
      </div>

      {/* speaker notes */}
      {showNotes && (
        <div className="toast-in absolute bottom-[132px] left-1/2 z-20 w-full max-w-[620px] -translate-x-1/2 px-6">
          <div className="rounded-xl border border-white/15 bg-[#161b1b]/95 px-4 py-3 shadow-lift backdrop-blur">
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-moss">
              Speaker notes · {words} words on card
            </div>
            <p className="text-[13px] leading-relaxed text-white/85">
              {slide.notes?.trim() || "No notes for this card — add them in the editor's AI panel or outline."}
            </p>
          </div>
        </div>
      )}

      {/* click zones for navigation */}
      <button className="absolute left-0 top-0 z-10 h-full w-1/4 cursor-w-resize" onClick={prev} aria-label="Previous card" />
      <button className="absolute right-0 top-0 z-10 h-full w-1/4 cursor-e-resize" onClick={next} aria-label="Next card" />

      {/* presenter film strip */}
      {stripVisible && (
        <div ref={stripRef} className="relative z-20 shrink-0 border-t border-white/10 bg-[#101414]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-0.5">
            {deck.slides.map((s, j) => (
              <button
                key={s.id}
                onClick={() => setI(j)}
                className={`group relative shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  j === idx
                    ? "border-moss shadow-[0_0_0_3px_rgba(14,133,119,0.35)]"
                    : "border-white/15 opacity-65 hover:opacity-100"
                }`}
                title={s.layout === "title" ? "Cover" : s.title}
              >
                <div style={{ width: thumbW }}>
                  <SlideCard slide={s} deckTitle={deck.title} theme={theme} width={thumbW} showNumber={false} />
                </div>
                <span
                  className={`absolute bottom-1 left-1 rounded px-1 font-mono text-[9px] font-bold ${
                    j === idx ? "bg-moss text-white" : "bg-black/60 text-white/80"
                  }`}
                >
                  {j + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* bottom hint */}
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 font-mono text-[10px] tracking-wide text-white/35">
        ← → navigate · N notes · T strip · Esc exit
      </div>
    </div>
  );
}
