/* ------------------------------------------------------------------ */
/*  Theme gallery — Gamma-style visual theme picker with live minis.   */
/* ------------------------------------------------------------------ */

import { Deck, SlideData } from "../lib/types";
import { DeckTheme, THEMES } from "../lib/themes";
import SlideCard from "./SlideCard";
import { useWidth } from "./useWidth";
import { IconArrowLeft, IconArrowRight, IconBolt, IconCheck } from "./icons";

function ThemePreview({ slide, deck, theme }: { slide: SlideData; deck: Deck; theme: DeckTheme }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="w-full">
      {w > 10 && <SlideCard slide={slide} deckTitle={deck.title} theme={theme} width={w} showNumber={false} />}
    </div>
  );
}

interface Props {
  deck: Deck;
  onTheme: (id: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

export default function ThemeView({ deck, onTheme, onBack, onCreate }: Props) {
  const previewSlides = [deck.slides[0], deck.slides[1] ?? deck.slides[0]];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[980px] items-center gap-3 px-5">
          <button onClick={onBack} className="btn btn-ghost px-2.5 py-2" aria-label="Back to outline">
            <IconArrowLeft size={16} />
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-moss-deep">Theme</span>
          <span className="hidden text-[13px] text-mist sm:block">
            — applied live to all {deck.slides.length} cards
          </span>
          <button onClick={onCreate} className="btn btn-primary ml-auto h-[38px]">
            Open editor <IconArrowRight size={15} />
          </button>
        </div>
      </header>

      <main className="dot-grid flex-1">
        <div className="mx-auto max-w-[980px] px-5 pb-24 pt-8">
          <div className="fade-up">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-moss-deep">// Step 2 of 2</div>
            <h1 className="font-display mt-2 text-[32px] font-extrabold tracking-tight">Pick a look.</h1>
            <p className="mt-2 text-[14px] text-mist">
              “{deck.title}” · {deck.slides.length} cards. You can switch themes any time from the editor.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {THEMES.map((t, i) => {
              const active = deck.themeId === t.id;
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onTheme(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onTheme(t.id);
                    }
                  }}
                  className={`fade-up group relative cursor-pointer rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-1 hover:shadow-card ${
                    active ? "border-moss bg-moss-soft/50" : "border-line bg-white hover:border-moss/50"
                  }`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-[16px] font-bold text-ink-2">{t.name}</div>
                      <div className="mt-0.5 text-[12px] text-mist">{t.mood}</div>
                    </div>
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full transition-all ${
                        active ? "bg-moss text-white" : "border-2 border-line group-hover:border-moss"
                      }`}
                    >
                      {active && <IconCheck size={13} strokeWidth={3} />}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {previewSlides.map((s, j) => (
                      <div key={s.id + j} className="transition-transform duration-300 group-hover:scale-[1.015]">
                        <ThemePreview slide={s} deck={deck} theme={t} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3.5 flex items-center gap-1.5">
                    {[t.bg, t.accent, t.accent2, t.ink].map((c, j) => (
                      <span key={j} className="h-3.5 w-3.5 rounded-full border border-ink/10" style={{ background: c }} />
                    ))}
                    <span className="ml-2 font-mono text-[10.5px] uppercase tracking-wide text-mist">
                      {t.mode} canvas
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/92 backdrop-blur">
        <div className="mx-auto flex h-[64px] max-w-[980px] items-center justify-between px-5">
          <p className="flex items-center gap-2 text-[13px] text-mist">
            <IconBolt size={14} className="text-hon-deep" />
            Theme: <b className="text-ink-2">{THEMES.find((t) => t.id === deck.themeId)?.name}</b> — free to change later
          </p>
          <button onClick={onCreate} className="btn btn-moss h-[42px] px-6">
            Start editing <IconArrowRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
