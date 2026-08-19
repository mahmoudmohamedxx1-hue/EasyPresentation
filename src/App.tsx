import { useEffect, useRef, useState } from "react";
import {
  Deck,
  DEFAULT_SETTINGS,
  EngineSettings,
  PipelineStage,
  uid,
  wordCount,
} from "./lib/types";
import { buildDeckFromText } from "./lib/engine";
import { generateWithLLM } from "./lib/llm";
import BlueprintDrawer from "./components/BlueprintDrawer";
import InputStep from "./components/InputStep";
import OutlineStep from "./components/OutlineStep";
import StudioStep from "./components/StudioStep";
import { IconAlert, IconBolt, IconCheck, IconCode, IconInfo, IconRefresh, IconX } from "./components/icons";

/* ------------------------------ persistence ------------------------------ */

const STORE_KEY = "slideforge.v1";

interface Persisted {
  rawText: string;
  sourceName: string;
  settings: EngineSettings;
  deck: Deck | null;
  step: number;
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

const persisted = loadPersisted();

/* --------------------------------- toasts -------------------------------- */

interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  msg: string;
}

/* ---------------------------------- app ---------------------------------- */

const STAGES = [
  "Reading source text",
  "Detecting sections & headings",
  "Condensing into bullet points",
  "Assigning slide layouts",
  "Composing your deck",
];

const STEPS = [
  { n: 1, label: "Source", desc: "Paste or upload" },
  { n: 2, label: "Outline", desc: "Structure & edit" },
  { n: 3, label: "Studio", desc: "Design & export" },
];

export default function App() {
  const [step, setStep] = useState<number>(persisted?.deck ? Math.min(persisted.step, 3) || 2 : 1);
  const [rawText, setRawText] = useState(persisted?.rawText ?? "");
  const [sourceName, setSourceName] = useState(persisted?.sourceName ?? "");
  const [settings, setSettings] = useState<EngineSettings>(persisted?.settings ?? DEFAULT_SETTINGS);
  const [deck, setDeck] = useState<Deck | null>(persisted?.deck ?? null);
  const [pipeline, setPipeline] = useState<PipelineStage[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const timers = useRef<number[]>([]);

  /* persist (debounced) */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          STORE_KEY,
          JSON.stringify({ rawText, sourceName, settings, deck, step } satisfies Persisted)
        );
      } catch {
        /* storage full / unavailable */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [rawText, sourceName, settings, deck, step]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function notify(kind: Toast["kind"], msg: string) {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { id, kind, msg }]);
    timers.current.push(window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500));
  }

  function reset() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* noop */
    }
    setRawText("");
    setSourceName("");
    setSettings(DEFAULT_SETTINGS);
    setDeck(null);
    setStep(1);
    setPipeline(null);
    notify("info", "Cleared — fresh canvas.");
  }

  /* --------------------------- generation pipeline --------------------------- */

  async function handleGenerate() {
    if (wordCount(rawText) < 40) {
      notify("error", "Add at least 40 words of source text before forging.");
      return;
    }
    setPipeline(STAGES.map((label) => ({ label, done: false })));
    let advanced = 0;
    const timer = window.setInterval(() => {
      advanced += 1;
      setPipeline((prev) => (prev ? prev.map((s, idx) => ({ ...s, done: idx < advanced })) : prev));
      if (advanced >= STAGES.length) window.clearInterval(timer);
    }, 380);

    const minWait = new Promise((r) => setTimeout(r, STAGES.length * 380 + 260));
    let result: Deck | null = null;
    let fellBack = false;

    if (settings.engine === "llm") {
      try {
        result = await generateWithLLM(rawText, sourceName || "pasted text", settings);
      } catch (err) {
        fellBack = true;
        notify(
          "error",
          `LLM call failed: ${err instanceof Error ? err.message : "unknown error"} — using the local engine instead.`
        );
        result = buildDeckFromText(rawText, sourceName, settings.targetSlides);
      }
    } else {
      await new Promise((r) => setTimeout(r, 420));
      result = buildDeckFromText(rawText, sourceName, settings.targetSlides);
    }

    await minWait;
    window.clearInterval(timer);
    setPipeline((prev) => (prev ? prev.map((s) => ({ ...s, done: true })) : prev));
    await new Promise((r) => setTimeout(r, 380));

    if (result) {
      setDeck(result);
      setStep(2);
      notify(
        "success",
        fellBack
          ? `Deck rebuilt locally — ${result.slides.length} slides.`
          : `Deck ready — ${result.slides.length} slides structured from your source.`
      );
    }
    setPipeline(null);
  }

  const canVisit = (n: number) => n === 1 || (n > 1 && deck !== null);

  return (
    <div className="min-h-screen">
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(85rem_52rem_at_50%_-12%,black,transparent_78%)]" />
        <div className="ambient-sheen absolute inset-0" />
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-hon shadow-lift">
            <IconBolt size={19} />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[17px] font-extrabold tracking-tight">SlideForge</p>
            <p className="font-mono text-[10.5px] tracking-[0.14em] text-mist">TEXT → DECK STUDIO</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setBlueprintOpen(true)} className="btn btn-ghost px-3.5 py-2 text-[13px]">
              <IconCode size={15} />
              <span className="hidden sm:inline">Backend blueprint</span>
              <span className="sm:hidden">Blueprint</span>
            </button>
            {(deck || rawText) && (
              <button onClick={reset} className="btn btn-ghost px-3.5 py-2 text-[13px] text-ember hover:border-ember">
                <IconRefresh size={14} />
                <span className="hidden sm:inline">Start over</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <div className="gap-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* stepper rail */}
          <nav className="mb-6 lg:sticky lg:top-24 lg:mb-0 lg:h-fit" aria-label="Workflow steps">
            <ol className="flex gap-2 lg:flex-col lg:gap-1">
              {STEPS.map((s, i) => {
                const done = (s.n === 1 && !!deck) || (s.n === 2 && step === 3);
                const active = step === s.n;
                const reachable = canVisit(s.n);
                return (
                  <li key={s.n} className="flex-1 lg:flex-none">
                    <button
                      onClick={() => reachable && setStep(s.n)}
                      disabled={!reachable}
                      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all lg:px-3.5 lg:py-3 ${
                        active
                          ? "border-ink bg-ink text-paper shadow-lift"
                          : reachable
                            ? "border-line bg-[#fbfcfa] hover:border-moss/60 hover:shadow-sm"
                            : "cursor-not-allowed border-transparent opacity-45"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-bold transition-colors ${
                          active
                            ? "bg-hon text-ink"
                            : done
                              ? "bg-moss text-paper"
                              : "bg-paper-2 text-mist"
                        }`}
                      >
                        {done && !active ? <IconCheck size={13} /> : `0${s.n}`}
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <span className={`block text-[13.5px] font-bold leading-tight ${active ? "text-paper" : "text-ink"}`}>
                          {s.label}
                        </span>
                        <span className={`block text-[11.5px] leading-tight ${active ? "text-paper/60" : "text-mist"}`}>
                          {s.desc}
                        </span>
                      </span>
                      {i < STEPS.length - 1 && (
                        <span className="ml-auto hidden h-px w-4 bg-line group-hover:bg-moss/50 lg:block" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 hidden rounded-xl border border-line bg-moss-soft/50 p-3.5 lg:block">
              <p className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold tracking-[0.16em] text-moss-deep">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-moss" /> ENGINE STATUS
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-2">
                {settings.engine === "local"
                  ? "Local heuristic — instant, fully private."
                  : `LLM · ${settings.model || "gpt-4o-mini"}`}
              </p>
            </div>
          </nav>

          {/* step content */}
          <div key={step} className="fade-up min-w-0">
            {step === 1 && (
              <InputStep
                rawText={rawText}
                setRawText={setRawText}
                sourceName={sourceName}
                setSourceName={setSourceName}
                settings={settings}
                setSettings={setSettings}
                pipeline={pipeline}
                onGenerate={() => handleGenerate()}
                notify={notify}
              />
            )}
            {step === 2 && deck && (
              <OutlineStep
                deck={deck}
                updateDeck={(fn) => setDeck((d) => (d ? fn(d) : d))}
                onBack={() => setStep(1)}
                onOpenStudio={() => setStep(3)}
                onRegenerate={() => handleGenerate()}
                regenerating={pipeline !== null}
              />
            )}
            {step === 3 && deck && (
              <StudioStep
                deck={deck}
                updateDeck={(fn) => setDeck((d) => (d ? fn(d) : d))}
                onBack={() => setStep(2)}
                notify={notify}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-line/80 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-[11.5px] text-mist sm:px-6">
          <p>
            <span className="font-semibold text-ink-2">SlideForge</span> — parsing with pdfjs-dist &
            mammoth · export with pptxgenjs · runs entirely in your browser
          </p>
          <p className="font-mono">
            FastAPI twin → <button onClick={() => setBlueprintOpen(true)} className="font-semibold text-moss-deep underline decoration-moss/40 underline-offset-2 hover:decoration-moss">open blueprint</button>
          </p>
        </div>
      </footer>

      <BlueprintDrawer open={blueprintOpen} onClose={() => setBlueprintOpen(false)} />

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border-l-4 bg-ink px-4 py-3 text-[13px] font-medium text-paper shadow-lift ${
              t.kind === "success" ? "border-[#2fd4b5]" : t.kind === "error" ? "border-[#ff8a6b]" : "border-hon"
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${t.kind === "success" ? "text-[#2fd4b5]" : t.kind === "error" ? "text-[#ff8a6b]" : "text-hon"}`}>
              {t.kind === "success" ? <IconCheck size={15} /> : t.kind === "error" ? <IconAlert size={15} /> : <IconInfo size={15} />}
            </span>
            <span className="min-w-0 flex-1 leading-snug">{t.msg}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 text-mist transition-colors hover:text-paper"
              aria-label="Dismiss"
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
