/* ------------------------------------------------------------------ */
/*  Present — full-screen slide show with keyboard nav + notes (N).    */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { Deck } from "../lib/types";
import { getTheme } from "../lib/themes";
import SlideCard from "./SlideCard";
import { useWidth } from "./useWidth";
import { IconArrowLeft, IconArrowRight, IconNote, IconX } from "./icons";

interface Props {
  deck: Deck;
  onExit: () => void;
}

export default function PresentView({ deck, onExit }: Props) {
  const [i, setI] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [vh, setVh] = useState(() => window.innerHeight);
  const [stageRef, stageW] = useWidth<HTMLDivElement>();

  const n = deck.slides.length;
  const slide = deck.slides[Math.min(i, n - 1)];
  const theme = getTheme(deck.themeId);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setI((v) => Math.min(n - 1, v + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setI((v) => Math.max(0, v - 1));
      } else if (e.key.toLowerCase() === "n") setShowNotes((v) => !v);
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(n - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [n, onExit]);

  const cardW = Math.max(300, Math.min(stageW - 32, ((vh - (showNotes ? 230 : 150)) * 16) / 9));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="dot-grid-dark pointer-events-none absolute inset-0 opacity-70" />
      {/* progress */}
      <div className="absolute left-0 top-0 z-20 h-[4px] w-full bg-white/10">
        <div
          className="h-full rounded-r-full transition-all duration-500 ease-out"
          style={{ width: `${((i + 1) / n) * 100}%`, background: theme.accent }}
        />
      </div>

      {/* exit */}
      <button
        onClick={onExit}
        className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12.5px] font-medium text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white"
      >
        <IconX size={14} /> Exit <span className="kbd opacity-70">Esc</span>
      </button>

      {/* stage */}
      <div ref={stageRef} className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
        <div key={slide.id} className="present-in">
          <SlideCard
            slide={slide}
            deckTitle={deck.title}
            theme={theme}
            width={cardW}
            className="text-shadow-soft"
          />
        </div>
      </div>

      {/* notes */}
      {showNotes && (
        <div className="relative z-10 mx-auto w-full max-w-[860px] px-6 pb-3">
          <div className="scale-in rounded-xl border border-white/12 bg-white/6 px-4 py-3 backdrop-blur">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: theme.accent }}>
              Speaker notes
            </div>
            <p className="mt-1 min-h-[38px] text-[13.5px] leading-relaxed text-white/80">
              {slide.notes || "No notes on this card — add some from the editor's AI panel."}
            </p>
          </div>
        </div>
      )}

      {/* controls */}
      <div className="relative z-10 flex items-center justify-center gap-4 pb-6 pt-2">
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white/85 transition-all hover:bg-white/15 disabled:opacity-30"
          aria-label="Previous slide"
        >
          <IconArrowLeft size={17} />
        </button>
        <div className="min-w-[120px] text-center">
          <span className="font-mono text-[13px] text-white/90">
            {i + 1} <span className="text-white/40">/ {n}</span>
          </span>
          <div className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-white/40">{deck.title}</div>
        </div>
        <button
          onClick={() => setI((v) => Math.min(n - 1, v + 1))}
          disabled={i === n - 1}
          className="grid h-10 w-10 place-items-center rounded-full bg-moss text-white shadow-lift transition-all hover:brightness-110 disabled:opacity-30"
          aria-label="Next slide"
        >
          <IconArrowRight size={17} />
        </button>
        <button
          onClick={() => setShowNotes((v) => !v)}
          className={`ml-2 flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors ${
            showNotes ? "border-moss bg-moss/20 text-white" : "border-white/15 text-white/60 hover:text-white"
          }`}
          title="Toggle speaker notes"
        >
          <IconNote size={13} /> Notes <span className="kbd opacity-70">N</span>
        </button>
      </div>
    </div>
  );
}
