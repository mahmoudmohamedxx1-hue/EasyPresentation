/* ------------------------------------------------------------------ */
/*  Home — Gamma-style launchpad: Generate / Paste / Import + Recents. */
/* ------------------------------------------------------------------ */

import { useRef, useState } from "react";
import { Deck } from "../lib/types";
import { getTheme } from "../lib/themes";
import { SAMPLES } from "../lib/samples";
import SlideCard from "./SlideCard";

const supportedFile = (name: string) => /\.(pdf|docx|txt|md)$/i.test(name);
import { useWidth } from "./useWidth";
import {
  IconArrowRight,
  IconBolt,
  IconClock,
  IconCode,
  IconCopy,
  IconFile,
  IconLayers,
  IconSpinner,
  IconTrash,
  IconUpload,
  IconWand,
} from "./icons";

export interface RecentDeck {
  id: string;
  savedAt: number;
  deck: Deck;
}

interface Props {
  recents: RecentDeck[];
  importing: boolean;
  importLabel: string;
  onTopic: (topic: string, count: number) => void;
  onText: (text: string, name: string) => void;
  onImport: (file: File) => void;
  onOpen: (r: RecentDeck) => void;
  onDuplicateRecent: (id: string) => void;
  onDeleteRecent: (id: string) => void;
  onBlueprint: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Thumb({ deck }: { deck: Deck }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="w-full">
      {w > 10 && (
        <SlideCard
          slide={deck.slides[0]}
          deckTitle={deck.title}
          theme={getTheme(deck.themeId)}
          width={w}
          showNumber={false}
        />
      )}
    </div>
  );
}

export default function HomeView({
  recents,
  importing,
  importLabel,
  onTopic,
  onText,
  onImport,
  onOpen,
  onDuplicateRecent,
  onDeleteRecent,
  onBlueprint,
}: Props) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [paste, setPaste] = useState("");
  const [drag, setDrag] = useState(false);
  const [fileErr, setFileErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const tryFile = (f: File | undefined) => {
    if (!f) return;
    if (!supportedFile(f.name)) {
      setFileErr(`"${f.name}" isn't supported — use .pdf, .docx, .txt or .md`);
      return;
    }
    setFileErr("");
    onImport(f);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* ---------------- sidebar ---------------- */}
      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-ink-3 bg-ink px-4 py-6 text-paper md:flex">
        <div className="flex items-center gap-2.5 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-moss text-paper shadow-lift">
            <IconBolt size={19} />
          </span>
          <div>
            <div className="font-display text-[15px] font-bold leading-none">SlideForge</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mist">AI deck studio</div>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          <div className="flex items-center gap-2.5 rounded-lg bg-ink-3/60 px-3 py-2.5 text-[13.5px] font-semibold">
            <IconLayers size={16} /> Home
          </div>
          <button
            onClick={onBlueprint}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-mist transition-colors hover:bg-ink-3/40 hover:text-paper"
          >
            <IconCode size={16} /> Backend blueprint
          </button>
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-ink-3 bg-ink-2 p-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-paper">
              <span className="pulse-dot h-2 w-2 rounded-full bg-moss" />
              Local engine ready
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist">
              Slides are forged on-device. Add an LLM key in the flow for AI-native outlines.
            </p>
          </div>
          <p className="px-1 font-mono text-[10.5px] leading-relaxed text-mist/70">
            paste → structure → present<br />pdf · docx · txt · md
          </p>
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <main className="dot-grid relative min-w-0 flex-1 overflow-y-auto">
        <div className="ambient-sheen pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-[1060px] px-6 py-10 lg:px-10">
          {/* header */}
          <header className="fade-up">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-moss-deep">
                  // {greeting}, ready to forge
                </div>
                <h1 className="font-display mt-2 text-[40px] font-extrabold leading-[1.05] tracking-tight lg:text-[50px]">
                  Turn raw words into
                  <br />
                  <span className="text-moss-deep">
                    presentation<em className="not-italic text-hon-deep">-</em>grade slides.
                  </span>
                </h1>
                <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-mist">
                  Drop a PDF or Word doc, paste lecture notes, or just name a topic — SlideForge
                  structures it into an editable deck you can present and export as PowerPoint.
                </p>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <span className="kbd">PDF</span>
                <span className="kbd">DOCX</span>
                <span className="kbd">TXT</span>
                <span className="ml-1 text-[12px] text-mist">→ .pptx</span>
              </div>
            </div>
          </header>

          {/* create grid */}
          <section className="mt-9 grid grid-cols-12 gap-5">
            {/* generate */}
            <div className="fade-up fade-up-1 relative col-span-12 overflow-hidden rounded-xl bg-ink p-6 text-paper shadow-lift lg:col-span-7 lg:p-7">
              <div className="dot-grid-dark pointer-events-none absolute inset-0 opacity-60" />
              <span className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-moss/25 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-moss text-paper">
                    <IconWand size={17} />
                  </span>
                  <div>
                    <div className="font-display text-[16px] font-bold leading-none">Generate</div>
                    <div className="mt-1 text-[12px] text-mist">Start from a topic — get a full outline</div>
                  </div>
                </div>
                <form
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (topic.trim().length >= 3) onTopic(topic.trim(), count);
                  }}
                >
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder='Try "Investor pitch for a coffee subscription"…'
                    className="field field-dark h-[46px] flex-1 text-[14.5px]"
                  />
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="field field-dark h-[46px] w-[112px] cursor-pointer"
                    aria-label="Number of cards"
                  >
                    {[5, 6, 7, 8, 9, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} cards
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={topic.trim().length < 3} className="btn btn-moss h-[46px] whitespace-nowrap">
                    Outline it <IconArrowRight size={15} />
                  </button>
                </form>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {["Onboarding guide", "Quarterly marketing plan", "Intro to neural networks"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className="rounded-full border border-ink-3 px-3 py-1 text-[12px] text-mist transition-colors hover:border-moss hover:text-paper"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* paste */}
            <div className="fade-up fade-up-2 col-span-12 rounded-xl border border-line bg-white p-6 lg:col-span-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper-2 text-ink">
                  <IconFile size={17} />
                </span>
                <div>
                  <div className="font-display text-[16px] font-bold leading-none">Paste text</div>
                  <div className="mt-1 text-[12px] text-mist">Lecture notes, reports, braindumps</div>
                </div>
              </div>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={"## What is a neural network?\nA neural network is a function made of layers…"}
                className="field mt-4 h-[124px] resize-none font-mono text-[12.5px] leading-relaxed"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className={`font-mono text-[11px] ${paste.trim().length >= 40 ? "text-moss-deep" : "text-mist"}`}>
                  {paste.trim() ? `${paste.trim().split(/\s+/).length} words` : "min ~40 words"}
                </span>
                <button disabled={paste.trim().length < 40} onClick={() => onText(paste, "Pasted notes")} className="btn btn-primary h-[40px]">
                  Structure it <IconArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* import */}
            <div className="fade-up fade-up-2 col-span-12 lg:col-span-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  tryFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex h-full min-h-[190px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-all ${
                  drag ? "scale-[1.01] border-moss bg-moss-soft" : "border-line bg-paper-2/60 hover:border-moss/60 hover:bg-moss-soft/40"
                }`}
              >
                {importing ? (
                  <>
                    <IconSpinner size={26} className="text-moss" />
                    <p className="mt-3 text-[14px] font-semibold text-ink-2">{importLabel}</p>
                    <p className="mt-1 text-[12px] text-mist">Pulling text out of the document…</p>
                  </>
                ) : (
                  <>
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-hon">
                      <IconUpload size={20} />
                    </span>
                    <p className="mt-3 text-[15px] font-semibold text-ink-2">Drop a PDF or Word file</p>
                    <p className="mt-1 text-[12.5px] text-mist">
                      or{" "}
                      <button onClick={() => fileRef.current?.click()} className="font-semibold text-moss-deep underline-offset-2 hover:underline">
                        browse your files
                      </button>
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => {
                        tryFile(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    {fileErr && <p className="mt-2 text-[12px] font-medium text-ember">{fileErr}</p>}
                  </>
                )}
              </div>
            </div>

            {/* samples */}
            <div className="fade-up fade-up-3 col-span-12 rounded-xl border border-line bg-white p-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div className="font-display text-[15px] font-bold">Start from a sample</div>
                <span className="font-mono text-[11px] text-mist">full pipeline, one click</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onText(s.text, s.name)}
                    className="group flex w-full items-center gap-4 rounded-lg border border-line bg-paper px-4 py-3 text-left transition-all hover:-translate-y-px hover:border-moss hover:shadow-lift"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-moss-soft text-moss-deep">
                      <IconFile size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink-2">{s.name}</span>
                      <span className="block text-[12px] text-mist">{s.hint}</span>
                    </span>
                    <span className="text-mist transition-transform group-hover:translate-x-0.5 group-hover:text-moss-deep">
                      <IconArrowRight size={16} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* recents */}
          <section className="mt-11 pb-16">
            <div className="flex items-center gap-2.5">
              <IconClock size={16} className="text-mist" />
              <h2 className="font-display text-[19px] font-bold">Recent decks</h2>
              <span className="rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[11px] text-mist">{recents.length}</span>
            </div>
            {recents.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line px-6 py-12 text-center">
                <IconLayers size={28} className="text-mist/60" />
                <p className="mt-3 text-[14.5px] font-semibold text-ink-3">Nothing forged yet</p>
                <p className="mt-1 max-w-[380px] text-[13px] text-mist">
                  Your decks autosave locally and show up here — try a sample above to see the whole pipeline in ~10 seconds.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {recents.map((r, i) => (
                  <div
                    key={r.id}
                    onClick={() => onOpen(r)}
                    className={`fade-up group relative cursor-pointer overflow-hidden rounded-xl border border-line bg-white transition-all hover:-translate-y-1 hover:shadow-card`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="border-b border-line bg-paper-2/70 p-3">
                      <Thumb deck={r.deck} />
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-ink-2">{r.deck.title}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-mist">
                          {r.deck.slides.length} cards · {timeAgo(r.savedAt)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateRecent(r.id);
                          }}
                          className="rounded-md p-1.5 text-mist opacity-0 transition-all hover:bg-moss/10 hover:text-moss-deep group-hover:opacity-100"
                          title="Duplicate deck"
                          aria-label="Duplicate deck"
                        >
                          <IconCopy size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecent(r.id);
                          }}
                          className="rounded-md p-1.5 text-mist opacity-0 transition-all hover:bg-ember/10 hover:text-ember group-hover:opacity-100"
                          title="Delete deck"
                          aria-label="Delete deck"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
