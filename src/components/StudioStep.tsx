import { useState } from "react";
import { Deck, LAYOUTS, SlideData, uid } from "../lib/types";
import { THEMES, getTheme } from "../lib/themes";
import { exportDeckJson, exportDeckPptx } from "../lib/pptx";
import SlideCard from "./SlideCard";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDownload,
  IconFile,
  IconPalette,
  IconPlus,
  IconSpinner,
  IconTrash,
  IconWand,
} from "./icons";

interface Props {
  deck: Deck;
  updateDeck: (fn: (d: Deck) => Deck) => void;
  onBack: () => void;
  notify: (kind: "success" | "error" | "info", msg: string) => void;
}

export default function StudioStep({ deck, updateDeck, onBack, notify }: Props) {
  const [selectedId, setSelectedId] = useState<string>(deck.slides[0]?.id ?? "");
  const [exporting, setExporting] = useState(false);

  const theme = getTheme(deck.themeId);
  const selected = deck.slides.find((s) => s.id === selectedId) ?? deck.slides[0];

  const updateSlide = (id: string, patch: Partial<SlideData>) =>
    updateDeck((d) => ({ ...d, slides: d.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const changeLayout = (id: string, layout: SlideData["layout"]) => {
    updateDeck((d) => ({
      ...d,
      slides: d.slides.map((s) => {
        if (s.id !== id) return s;
        const next: SlideData = { ...s, layout };
        if (layout === "quote" && !s.quote)
          next.quote = { text: s.bullets[0] || "A line worth repeating", attribution: "" };
        if (layout === "stats" && (!s.stats || !s.stats.length))
          next.stats = [
            { value: "2×", label: "first stat" },
            { value: "87%", label: "second stat" },
            { value: "12k", label: "third stat" },
          ];
        return next;
      }),
    }));
  };

  const move = (id: string, dir: -1 | 1) =>
    updateDeck((d) => {
      const idx = d.slides.findIndex((s) => s.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= d.slides.length) return d;
      const slides = [...d.slides];
      [slides[idx], slides[to]] = [slides[to], slides[idx]];
      return { ...d, slides: slides.map((s, i) => ({ ...s, slide_number: i + 1 })) };
    });

  const duplicate = (id: string) =>
    updateDeck((d) => {
      const idx = d.slides.findIndex((s) => s.id === id);
      if (idx < 0) return d;
      const copy: SlideData = { ...d.slides[idx], id: uid() };
      const slides = [...d.slides.slice(0, idx + 1), copy, ...d.slides.slice(idx + 1)];
      setSelectedId(copy.id);
      return { ...d, slides: slides.map((s, i) => ({ ...s, slide_number: i + 1 })) };
    });

  const remove = (id: string) => {
    updateDeck((d) => {
      const slides = d.slides.filter((s) => s.id !== id).map((s, i) => ({ ...s, slide_number: i + 1 }));
      if (selectedId === id) setSelectedId(slides[0]?.id ?? "");
      return { ...d, slides };
    });
    notify("info", "Slide deleted.");
  };

  const add = () =>
    updateDeck((d) => {
      const slide: SlideData = {
        id: uid(),
        slide_number: d.slides.length + 1,
        title: "New slide",
        bullets: ["Make a point", "Back it up"],
        layout: "bullets",
        notes: "",
      };
      setSelectedId(slide.id);
      return { ...d, slides: [...d.slides, slide] };
    });

  async function onExportPptx() {
    setExporting(true);
    try {
      await exportDeckPptx(deck);
      notify("success", `Exported ${deck.slides.length} slides to ${deck.title.slice(0, 32)}.pptx`);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Export failed — try again.");
    } finally {
      setExporting(false);
    }
  }

  if (!deck.slides.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-line bg-[#fbfcfa] py-24 text-center">
        <div>
          <p className="font-display text-xl font-bold">No slides yet</p>
          <p className="mt-1 text-sm text-mist">Generate a deck from the source step first.</p>
          <button onClick={onBack} className="btn btn-primary mt-5">
            <IconArrowLeft size={15} /> Back to source
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-3 bg-ink-2 p-3 shadow-lift">
        <button onClick={onBack} className="btn btn-ghost-dark px-3 py-2">
          <IconArrowLeft size={15} /> Outline
        </button>
        <input
          value={deck.title}
          onChange={(e) => updateDeck((d) => ({ ...d, title: e.target.value }))}
          aria-label="Deck title"
          className="field field-dark w-56 font-display text-[14px] font-bold"
        />
        <span className="hidden font-mono text-[11.5px] text-mist sm:block">
          {deck.slides.length} slides · 16:9
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-ink-3 bg-ink p-1">
            <IconPalette size={14} className="ml-1.5 text-mist" />
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => {
                  updateDeck((d) => ({ ...d, themeId: th.id }));
                }}
                title={`${th.name} — ${th.mood}`}
                aria-label={`Theme ${th.name}`}
                className={`h-7 w-7 overflow-hidden rounded-md border-2 transition-transform hover:scale-110 ${
                  deck.themeId === th.id ? "border-hon" : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                <span className="flex h-full">
                  <span className="flex-1" style={{ background: th.bg }} />
                  <span className="flex-1" style={{ background: th.accent }} />
                  <span className="flex-1" style={{ background: th.accent2 }} />
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => exportDeckJson(deck)} className="btn btn-ghost-dark px-3 py-2 text-[13px]">
            <IconFile size={14} /> .json
          </button>
          <button onClick={onExportPptx} disabled={exporting} className="btn btn-moss px-4 py-2">
            {exporting ? <IconSpinner size={15} /> : <IconDownload size={15} />}
            Export .pptx
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* canvas */}
        <div className="dot-grid-dark rounded-2xl border border-ink-3 bg-ink p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            {deck.slides.map((slide, i) => (
              <div key={slide.id} className="fade-up relative" style={{ animationDelay: `${Math.min(i * 50, 450)}ms` }}>
                <SlideCard
                  slide={slide}
                  deckTitle={deck.title}
                  theme={theme}
                  index={i}
                  total={deck.slides.length}
                  selected={selected?.id === slide.id}
                  onSelect={() => setSelectedId(slide.id)}
                />
              </div>
            ))}
            <button
              onClick={add}
              className="grid aspect-video place-items-center rounded-xl border-2 border-dashed border-ink-3 text-mist transition-all hover:border-[#2fd4b5]/60 hover:text-[#2fd4b5]"
            >
              <span className="flex flex-col items-center gap-2 text-sm font-semibold">
                <IconPlus size={20} /> New slide
              </span>
            </button>
          </div>
        </div>

        {/* editor */}
        {selected && (
          <aside className="h-fit rounded-xl border border-ink-3 bg-ink-2 p-5 shadow-lift xl:sticky xl:top-24">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-hon">
                SLIDE {String(selected.slide_number).padStart(2, "0")} — EDIT
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => move(selected.id, -1)}
                  disabled={selected.slide_number === 1}
                  className="btn btn-ghost-dark px-2 py-1.5 disabled:opacity-30"
                  aria-label="Move earlier"
                >
                  <IconChevronUp size={14} />
                </button>
                <button
                  onClick={() => move(selected.id, 1)}
                  disabled={selected.slide_number === deck.slides.length}
                  className="btn btn-ghost-dark px-2 py-1.5 disabled:opacity-30"
                  aria-label="Move later"
                >
                  <IconChevronDown size={14} />
                </button>
                <button onClick={() => duplicate(selected.id)} className="btn btn-ghost-dark px-2 py-1.5" aria-label="Duplicate slide">
                  <IconCopy size={14} />
                </button>
                <button
                  onClick={() => remove(selected.id)}
                  disabled={deck.slides.length <= 1}
                  className="btn btn-ghost-dark px-2 py-1.5 text-[#ff8a6b] hover:border-[#ff8a6b] disabled:opacity-30"
                  aria-label="Delete slide"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-ink-3 bg-ink p-1">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => changeLayout(selected.id, l.id)}
                  className={`rounded-md py-1.5 text-[11.5px] font-semibold transition-all ${
                    selected.layout === l.id
                      ? "bg-moss text-paper shadow-sm"
                      : "text-mist hover:bg-ink-2 hover:text-paper"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3.5">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-mist">Title</span>
                <input
                  value={selected.title}
                  onChange={(e) => updateSlide(selected.id, { title: e.target.value })}
                  className="field field-dark font-display font-bold"
                />
              </label>

              {selected.layout === "title" && (
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-mist">Subtitle</span>
                  <textarea
                    value={selected.subtitle ?? ""}
                    onChange={(e) => updateSlide(selected.id, { subtitle: e.target.value })}
                    rows={2}
                    className="field field-dark text-[13px]"
                  />
                </label>
              )}

              {selected.layout === "quote" && selected.quote && (
                <>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-mist">Quote</span>
                    <textarea
                      value={selected.quote.text}
                      onChange={(e) =>
                        updateSlide(selected.id, { quote: { ...selected.quote!, text: e.target.value } })
                      }
                      rows={3}
                      className="field field-dark text-[13px] italic"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-mist">Attribution</span>
                    <input
                      value={selected.quote.attribution}
                      onChange={(e) =>
                        updateSlide(selected.id, { quote: { ...selected.quote!, attribution: e.target.value } })
                      }
                      className="field field-dark text-[13px]"
                      placeholder="Who said it"
                    />
                  </label>
                </>
              )}

              {selected.layout === "stats" && (
                <div className="space-y-2">
                  <span className="block text-[11.5px] font-semibold text-mist">Stats (up to 3)</span>
                  {(selected.stats ?? []).slice(0, 3).map((st, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={st.value}
                        onChange={(e) =>
                          updateSlide(selected.id, {
                            stats: (selected.stats ?? []).map((x, xi) => (xi === i ? { ...x, value: e.target.value } : x)),
                          })
                        }
                        className="field field-dark w-24 font-mono text-[13px]"
                        placeholder="87%"
                      />
                      <input
                        value={st.label}
                        onChange={(e) =>
                          updateSlide(selected.id, {
                            stats: (selected.stats ?? []).map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)),
                          })
                        }
                        className="field field-dark flex-1 text-[13px]"
                        placeholder="label"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selected.layout !== "title" && selected.layout !== "quote" && selected.layout !== "stats" && (
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-mist">
                    Bullet points — one per line
                  </span>
                  <textarea
                    value={selected.bullets.join("\n")}
                    onChange={(e) => updateSlide(selected.id, { bullets: e.target.value.split("\n") })}
                    rows={5}
                    className="field field-dark text-[13px] leading-relaxed"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-mist">Speaker notes</span>
                <textarea
                  value={selected.notes}
                  onChange={(e) => updateSlide(selected.id, { notes: e.target.value })}
                  rows={3}
                  placeholder="What you'll say on this slide…"
                  className="field field-dark text-[13px]"
                />
              </label>
            </div>

            <p className="mt-4 flex items-start gap-2 border-t border-ink-3 pt-3.5 text-[11.5px] leading-snug text-mist">
              <IconWand size={13} className="mt-0.5 shrink-0 text-hon" />
              Edits render live on the canvas and flow straight into the .pptx export.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
