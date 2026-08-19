import { Deck, LAYOUTS, SlideData, uid, wordCount } from "../lib/types";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconRefresh,
  IconSpinner,
  IconTrash,
  IconLayers,
} from "./icons";

interface Props {
  deck: Deck;
  updateDeck: (fn: (d: Deck) => Deck) => void;
  onBack: () => void;
  onOpenStudio: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}

export default function OutlineStep({ deck, updateDeck, onBack, onOpenStudio, onRegenerate, regenerating }: Props) {
  const updateSlide = (id: string, patch: Partial<SlideData>) =>
    updateDeck((d) => ({ ...d, slides: d.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const removeSlide = (id: string) =>
    updateDeck((d) => ({
      ...d,
      slides: d.slides.filter((s) => s.id !== id).map((s, i) => ({ ...s, slide_number: i + 1 })),
    }));

  const move = (id: string, dir: -1 | 1) =>
    updateDeck((d) => {
      const idx = d.slides.findIndex((s) => s.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= d.slides.length) return d;
      const slides = [...d.slides];
      [slides[idx], slides[to]] = [slides[to], slides[idx]];
      return { ...d, slides: slides.map((s, i) => ({ ...s, slide_number: i + 1 })) };
    });

  const addSlide = () =>
    updateDeck((d) => ({
      ...d,
      slides: [
        ...d.slides,
        {
          id: uid(),
          slide_number: d.slides.length + 1,
          title: "New slide",
          bullets: ["First point", "Second point"],
          layout: "bullets" as const,
          notes: "",
        },
      ],
    }));

  const totalWords = deck.slides.reduce((acc, s) => acc + wordCount(s.title + " " + s.bullets.join(" ")), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-moss">
            STEP 02 — OUTLINE
          </p>
          <input
            value={deck.title}
            onChange={(e) => updateDeck((d) => ({ ...d, title: e.target.value }))}
            aria-label="Deck title"
            className="mt-2 w-full max-w-xl border-b-2 border-transparent bg-transparent font-display text-[clamp(1.4rem,3vw,2rem)] font-extrabold tracking-tight transition-colors hover:border-line focus:border-moss focus:outline-none"
          />
          <p className="mt-1.5 font-mono text-[12px] text-mist">
            {deck.slides.length} slides · {totalWords.toLocaleString()} words on slides · edit
            anything, the studio stays in sync
          </p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onBack} className="btn btn-ghost">
            <IconArrowLeft size={15} /> Source
          </button>
          <button onClick={onRegenerate} disabled={regenerating} className="btn btn-ghost">
            {regenerating ? <IconSpinner size={15} /> : <IconRefresh size={15} />} Regenerate
          </button>
          <button onClick={onOpenStudio} className="btn btn-moss px-5">
            Open studio <IconArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {deck.slides.map((slide, idx) => (
          <article
            key={slide.id}
            className="fade-up group flex gap-4 rounded-xl border border-line bg-[#fbfcfa] p-4 shadow-lift transition-all hover:border-moss/45 hover:shadow-card"
            style={{ animationDelay: `${Math.min(idx * 45, 400)}ms` }}
          >
            <div className="flex w-9 shrink-0 flex-col items-center gap-1.5 pt-1">
              <span className="font-mono text-[13px] font-bold text-moss-deep">
                {String(slide.slide_number).padStart(2, "0")}
              </span>
              <span className="h-full w-px bg-line" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={slide.title}
                  onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                  aria-label={`Slide ${slide.slide_number} title`}
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 font-display text-[16px] font-bold tracking-tight transition-colors hover:border-line focus:border-moss focus:bg-white focus:outline-none"
                />
                <label className="flex items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1">
                  <IconLayers size={13} className="text-mist" />
                  <select
                    value={slide.layout}
                    onChange={(e) => updateSlide(slide.id, { layout: e.target.value as SlideData["layout"] })}
                    className="bg-transparent text-[12.5px] font-semibold text-ink-2 focus:outline-none"
                  >
                    {LAYOUTS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => move(slide.id, -1)} disabled={idx === 0} className="btn btn-ghost px-2 py-1.5 disabled:opacity-30" aria-label="Move up">
                    <IconChevronUp size={14} />
                  </button>
                  <button onClick={() => move(slide.id, 1)} disabled={idx === deck.slides.length - 1} className="btn btn-ghost px-2 py-1.5 disabled:opacity-30" aria-label="Move down">
                    <IconChevronDown size={14} />
                  </button>
                  <button onClick={() => removeSlide(slide.id)} className="btn btn-ghost px-2 py-1.5 text-ember hover:border-ember" aria-label="Delete slide">
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>

              {slide.layout === "quote" && slide.quote ? (
                <textarea
                  value={slide.quote.text}
                  onChange={(e) => updateSlide(slide.id, { quote: { text: e.target.value, attribution: slide.quote?.attribution ?? "" } })}
                  rows={2}
                  aria-label="Quote text"
                  className="field mt-2 italic"
                />
              ) : slide.layout !== "title" ? (
                <textarea
                  value={slide.bullets.join("\n")}
                  onChange={(e) =>
                    updateSlide(slide.id, {
                      bullets: e.target.value.split("\n").filter((l, i, arr) => l.trim() || i < arr.length - 1),
                    })
                  }
                  rows={Math.min(6, Math.max(2, slide.bullets.length))}
                  aria-label={`Slide ${slide.slide_number} bullets`}
                  placeholder="One bullet per line — max ~12 words each reads best"
                  className="field mt-2 text-[13.5px] leading-relaxed"
                />
              ) : (
                <input
                  value={slide.subtitle ?? ""}
                  onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })}
                  placeholder="Subtitle"
                  aria-label="Subtitle"
                  className="field mt-2 text-[13.5px]"
                />
              )}
            </div>
          </article>
        ))}

        <button
          onClick={addSlide}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3.5 text-sm font-semibold text-mist transition-all hover:border-moss hover:bg-moss-soft/40 hover:text-moss-deep"
        >
          <IconPlus size={16} /> Add slide
        </button>
      </div>
    </div>
  );
}
