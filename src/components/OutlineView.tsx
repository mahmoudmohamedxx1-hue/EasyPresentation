/* ------------------------------------------------------------------ */
/*  Outline — Gamma-style editable checklist before themes.            */
/* ------------------------------------------------------------------ */

import { useState } from "react";
import { Deck, LAYOUTS, SlideData } from "../lib/types";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconFile,
  IconPencil,
  IconPlus,
  IconTrash,
} from "./icons";

interface Props {
  deck: Deck;
  disabledIds: Set<string>;
  sourceName: string;
  onToggle: (id: string) => void;
  onPatchSlide: (id: string, patch: Partial<SlideData>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function OutlineView({
  deck,
  disabledIds,
  sourceName,
  onToggle,
  onPatchSlide,
  onRemove,
  onAdd,
  onBack,
  onContinue,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const enabled = deck.slides.filter((s) => !disabledIds.has(s.id)).length;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[880px] items-center gap-3 px-5">
          <button onClick={onBack} className="btn btn-ghost px-2.5 py-2" aria-label="Back">
            <IconArrowLeft size={16} />
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-moss-deep">Outline</span>
          {sourceName && (
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-3 sm:flex">
              <IconFile size={13} /> <span className="max-w-[220px] truncate">{sourceName}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[12px] text-mist">
              <b className="text-ink-2">{enabled}</b>/{deck.slides.length} cards
            </span>
            <button onClick={onContinue} disabled={enabled < 2} className="btn btn-primary h-[38px]">
              Pick a theme <IconArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* body */}
      <main className="dot-grid flex-1">
        <div className="mx-auto max-w-[880px] px-5 pb-28 pt-8">
          <div className="fade-up">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-moss-deep">// Step 1 of 2</div>
            <h1 className="font-display mt-2 text-[32px] font-extrabold tracking-tight">
              Shape the story.
            </h1>
            <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-mist">
              SlideForge drafted this outline from your source. Untick cards to drop them, click
              the pencil to rewrite titles and points — nothing here is precious.
            </p>
          </div>

          <div className="mt-7 space-y-2.5">
            {deck.slides.map((s, i) => {
              const off = disabledIds.has(s.id);
              const editing = editingId === s.id;
              return (
                <div
                  key={s.id}
                  className={`fade-up group rounded-xl border bg-white px-4 py-3.5 transition-all ${
                    off ? "border-line opacity-55" : "border-line hover:border-moss/50 hover:shadow-lift"
                  }`}
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                >
                  <div className="flex items-start gap-3.5">
                    {/* toggle */}
                    <button
                      onClick={() => onToggle(s.id)}
                      className={`mt-0.5 grid h-[20px] w-[20px] shrink-0 place-items-center rounded-md border-2 transition-colors ${
                        off ? "border-line bg-paper" : "border-moss bg-moss text-white"
                      }`}
                      aria-label={off ? "Include card" : "Exclude card"}
                      title={off ? "Include this card" : "Exclude this card"}
                    >
                      {!off && <IconCheck size={12} strokeWidth={3} />}
                    </button>

                    <span className="mt-0.5 w-6 shrink-0 font-mono text-[12px] text-mist">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`truncate text-[15px] font-semibold ${s.layout === "title" ? "text-moss-deep" : "text-ink-2"}`}>
                          {s.title || "Untitled card"}
                        </h3>
                        <span className="hidden shrink-0 rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mist sm:inline">
                          {LAYOUTS.find((l) => l.id === s.layout)?.label ?? s.layout}
                        </span>
                      </div>
                      {s.bullets.length > 0 && !editing && (
                        <p className="mt-1 truncate text-[12.5px] text-mist">
                          {s.bullets.slice(0, 2).join("  ·  ")}
                          {s.bullets.length > 2 && `  ·  +${s.bullets.length - 2} more`}
                        </p>
                      )}

                      {editing && (
                        <div className="mt-3 space-y-2.5 border-t border-line pt-3">
                          <input
                            value={s.title}
                            onChange={(e) => onPatchSlide(s.id, { title: e.target.value })}
                            className="field h-[38px] text-[14px] font-semibold"
                            placeholder="Card title"
                          />
                          <textarea
                            defaultValue={s.bullets.join("\n")}
                            onBlur={(e) =>
                              onPatchSlide(s.id, {
                                bullets: e.target.value
                                  .split("\n")
                                  .map((b) => b.trim())
                                  .filter(Boolean)
                                  .slice(0, 6),
                              })
                            }
                            rows={Math.min(6, Math.max(3, s.bullets.length + 1))}
                            className="field resize-none font-mono text-[12.5px] leading-relaxed"
                            placeholder={"One point per line…"}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-mist">Layout</span>
                            <div className="flex flex-wrap gap-1.5">
                              {LAYOUTS.filter((l) => l.id !== "title" || s.layout === "title").map((l) => (
                                <button
                                  key={l.id}
                                  onClick={() => onPatchSlide(s.id, { layout: l.id })}
                                  className={`rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors ${
                                    s.layout === l.id
                                      ? "border-moss bg-moss-soft text-moss-deep"
                                      : "border-line text-mist hover:border-moss/50"
                                  }`}
                                >
                                  {l.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setEditingId(editing ? null : s.id)}
                        className={`rounded-md p-1.5 transition-colors ${
                          editing ? "bg-moss-soft text-moss-deep" : "text-mist hover:bg-paper-2 hover:text-ink"
                        }`}
                        title="Edit card"
                        aria-label="Edit card"
                      >
                        {editing ? <IconChevronDown size={15} /> : <IconPencil size={15} />}
                      </button>
                      {s.layout !== "title" && (
                        <button
                          onClick={() => onRemove(s.id)}
                          className="rounded-md p-1.5 text-mist transition-colors hover:bg-ember/10 hover:text-ember"
                          title="Delete card"
                          aria-label="Delete card"
                        >
                          <IconTrash size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={onAdd}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3.5 text-[13.5px] font-semibold text-mist transition-colors hover:border-moss hover:bg-moss-soft/40 hover:text-moss-deep"
            >
              <IconPlus size={15} /> Add a card
            </button>
          </div>
        </div>
      </main>

      {/* sticky footer */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/92 backdrop-blur">
        <div className="mx-auto flex h-[64px] max-w-[880px] items-center justify-between px-5">
          <p className="text-[13px] text-mist">
            <b className="text-ink-2">{enabled} cards</b> will be styled — unticked cards are left out.
          </p>
          <button onClick={onContinue} disabled={enabled < 2} className="btn btn-moss h-[42px] px-6">
            Choose a theme <IconArrowRight size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
