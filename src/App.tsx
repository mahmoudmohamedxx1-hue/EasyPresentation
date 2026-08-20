/* ------------------------------------------------------------------ */
/*  SlideForge — Gamma-style AI presentation studio.                   */
/*  Flow: Home → Outline → Theme → Editor ⇄ Present.                   */
/*  Undo/redo history, autosave, share links, staged generation.       */
/* ------------------------------------------------------------------ */

import { Component, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Deck, DEFAULT_SETTINGS, EngineSettings, renumber, SlideData, uid } from "./lib/types";
import { buildDeckFromText } from "./lib/engine";
import { buildTopicDeck } from "./lib/topicDeck";
import { applyInstruction } from "./lib/aiChat";
import { readDeckFromHash } from "./lib/share";
import HomeView, { RecentDeck } from "./components/HomeView";
import OutlineView from "./components/OutlineView";
import ThemeView from "./components/ThemeView";
import EditorView from "./components/EditorView";
import PresentView from "./components/PresentView";
import BlueprintDrawer from "./components/BlueprintDrawer";
import { IconBolt, IconCheck, IconSpinner } from "./components/icons";

type View = "home" | "outline" | "theme" | "editor" | "present";

const STAGES = ["Reading your source", "Mapping the structure", "Writing cards", "Polishing design"];

/* ------------------------------ error boundary ------------------------------ */

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[100dvh] place-items-center bg-paper p-6">
          <div className="w-full max-w-[440px] rounded-2xl border border-line bg-white p-7 text-center shadow-lift">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ember/10 text-ember">
              <IconBolt size={22} />
            </div>
            <h1 className="font-display mt-4 text-lg font-bold">Something broke in the studio</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-mist">
              Your deck is safe — it autosaves locally. Reload to pick up exactly where you left off.
            </p>
            <p className="mt-3 break-all rounded-lg bg-paper px-3 py-2 font-mono text-[11px] text-mist">
              {String(this.state.error)}
            </p>
            <button onClick={() => window.location.reload()} className="btn btn-primary mt-5 w-full">
              Reload SlideForge
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------ generation overlay ------------------------------ */

function GenOverlay({ stage }: { stage: number }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/70 p-6 backdrop-blur-sm">
      <div className="pop-in w-full max-w-[400px] rounded-2xl border border-ink-3 bg-ink-2 p-7 text-paper shadow-lift">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-moss text-paper">
            <IconBolt size={22} />
          </span>
          <div>
            <div className="font-display text-[17px] font-bold">Forging your deck</div>
            <div className="text-[12px] text-paper/60">The slide engine is working</div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {STAGES.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                  i < stage
                    ? "border-moss bg-moss text-white"
                    : i === stage
                    ? "border-hon text-hon"
                    : "border-ink-3 text-transparent"
                }`}
              >
                {i < stage ? (
                  <IconCheck size={13} />
                ) : i === stage ? (
                  <IconSpinner size={13} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
                )}
              </span>
              <span
                className={`text-[13.5px] font-medium transition-colors duration-300 ${
                  i <= stage ? "text-paper" : "text-paper/40"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink-3">
          <div
            className="h-full rounded-full bg-moss transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, ((stage + 1) / STAGES.length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface Toast {
  id: number;
  kind: "ok" | "err";
  msg: string;
}

/* ================================== APP ================================== */

function AppInner() {
  const [view, setView] = useState<View>("home");
  const [deck, setDeckState] = useState<Deck | null>(null);
  const [hist, setHist] = useState<{ past: Deck[]; future: Deck[] }>({ past: [], future: [] });
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
  const [sourceName, setSourceName] = useState("Pasted text");
  const [recents, setRecents] = useState<RecentDeck[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("slideforge:recents") ?? "[]");
    } catch {
      return [];
    }
  });
  const [settings, setSettings] = useState<EngineSettings>(() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("slideforge:settings") ?? "{}") };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [importing, setImporting] = useState(false);
  const [importLabel, setImportLabel] = useState("");
  const [genStage, setGenStage] = useState<number | null>(null);
  const [blueprint, setBlueprint] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recentIdRef = useRef<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((kind: "ok" | "err", msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /* ---------------- load a shared deck from the URL once ---------------- */
  useEffect(() => {
    const shared = readDeckFromHash();
    if (shared) {
      setDeckState(shared);
      setView("editor");
      toast("ok", "Shared deck loaded — it's yours to edit now");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("slideforge:settings", JSON.stringify(settings));
  }, [settings]);

  /* ---------------- autosave into Recents ---------------- */
  useEffect(() => {
    if (!deck) return;
    const id = recentIdRef.current ?? uid();
    recentIdRef.current = id;
    saveTimer.current = window.setTimeout(() => {
      try {
        setRecents((rs) => {
          const next = [{ id, savedAt: Date.now(), deck }, ...rs.filter((r) => r.id !== id)].slice(0, 12);
          localStorage.setItem("slideforge:recents", JSON.stringify(next));
          return next;
        });
      } catch {
        /* storage quota — the deck still lives in memory */
      }
    }, 600);
    return () => window.clearTimeout(saveTimer.current);
  }, [deck]);

  /* ---------------- deck mutation with undo history ---------------- */
  const mutate = (fn: (d: Deck) => Deck) => {
    if (!deck) return;
    const next = fn(deck);
    if (next === deck) return;
    setHist((h) => ({ past: [...h.past.slice(-39), deck], future: [] }));
    setDeckState(next);
  };

  const undo = () => {
    if (!deck || hist.past.length === 0) return;
    const prev = hist.past[hist.past.length - 1];
    setHist({ past: hist.past.slice(0, -1), future: [deck, ...hist.future].slice(0, 40) });
    setDeckState(prev);
  };
  const redo = () => {
    if (!deck || hist.future.length === 0) return;
    const [next, ...rest] = hist.future;
    setHist({ past: [...hist.past.slice(-39), deck], future: rest });
    setDeckState(next);
  };

  /* ---------------- staged generation ---------------- */
  const forge = async (doneMsg: string, src: string, work: () => Deck | Promise<Deck>) => {
    setSourceName(src);
    setGenStage(0);
    const tick = window.setInterval(
      () => setGenStage((s) => (s == null ? s : Math.min(s + 1, STAGES.length - 1))),
      640
    );
    const started = Date.now();
    try {
      const result = await work();
      await new Promise((r) => setTimeout(r, Math.max(0, 950 - (Date.now() - started))));
      window.clearInterval(tick);
      setGenStage(null);
      setDisabledIds(new Set());
      recentIdRef.current = null;
      setHist({ past: [], future: [] });
      setDeckState(result);
      setView("outline");
      toast("ok", doneMsg);
    } catch (e) {
      window.clearInterval(tick);
      setGenStage(null);
      toast("err", e instanceof Error ? e.message : "Generation failed — try again");
    }
  };

  /* ---------------- creation entry points ---------------- */
  const startTopic = (topic: string, count: number) =>
    forge("Outline ready — review your cards", `Generated from: ${topic}`, () => buildTopicDeck(topic, count));

  const startText = (text: string, name: string) =>
    forge("Outline ready — review your cards", name || "Pasted text", () =>
      buildDeckFromText(text, name || "Pasted text", settings.targetSlides)
    );

  const importFile = async (file: File) => {
    setImporting(true);
    setImportLabel(`Extracting text from ${file.name}…`);
    try {
      const { extractTextFromFile } = await import("./lib/extract");
      const { text, truncated } = await extractTextFromFile(file);
      setImportLabel("Text extracted — forging cards…");
      await forge(`Parsed ${file.name} — review your outline`, file.name, () =>
        buildDeckFromText(text, file.name, settings.targetSlides)
      );
      if (truncated) toast("ok", "Large document — using the first 60,000 characters");
    } catch (e) {
      toast("err", e instanceof Error ? e.message : "Couldn't read that file");
    } finally {
      setImporting(false);
      setImportLabel("");
    }
  };

  const openRecent = (r: RecentDeck) => {
    recentIdRef.current = r.id;
    setHist({ past: [], future: [] });
    setDeckState(r.deck);
    setView("editor");
  };

  const duplicateRecent = (id: string) => {
    const src = recents.find((r) => r.id === id);
    if (!src) return;
    const copy: RecentDeck = {
      id: uid(),
      savedAt: Date.now(),
      deck: JSON.parse(JSON.stringify(src.deck)),
    };
    copy.deck.title = `${copy.deck.title} (copy)`;
    setRecents((rs) => {
      const next = [copy, ...rs].slice(0, 12);
      localStorage.setItem("slideforge:recents", JSON.stringify(next));
      return next;
    });
    toast("ok", "Deck duplicated");
  };

  const deleteRecent = (id: string) => {
    setRecents((rs) => {
      const next = rs.filter((r) => r.id !== id);
      localStorage.setItem("slideforge:recents", JSON.stringify(next));
      return next;
    });
    if (recentIdRef.current === id) recentIdRef.current = null;
    toast("ok", "Deck deleted");
  };

  /* ---------------- editor wiring ---------------- */
  const patchDeck = (patch: Partial<Deck>) => mutate((d) => ({ ...d, ...patch }));
  const patchSlide = (id: string, patch: Partial<SlideData>) =>
    mutate((d) => ({ ...d, slides: d.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const reorderSlides = (ids: string[]) =>
    mutate((d) => {
      const map = new Map(d.slides.map((s) => [s.id, s]));
      return renumber({ ...d, slides: ids.map((id) => map.get(id)).filter(Boolean) as SlideData[] });
    });
  const addSlide = (index?: number) =>
    mutate((d) => {
      const fresh: SlideData = {
        id: uid(),
        slide_number: 0,
        title: "New card",
        bullets: ["Click any text to edit it"],
        layout: "bullets",
        notes: "",
      };
      const slides = [...d.slides];
      slides.splice(index ?? slides.length, 0, fresh);
      return renumber({ ...d, slides });
    });
  const duplicateSlide = (id: string) =>
    mutate((d) => {
      const i = d.slides.findIndex((s) => s.id === id);
      if (i < 0) return d;
      const clone: SlideData = JSON.parse(JSON.stringify(d.slides[i]));
      clone.id = uid();
      const slides = [...d.slides];
      slides.splice(i + 1, 0, clone);
      return renumber({ ...d, slides });
    });
  const removeSlide = (id: string) =>
    mutate((d) => {
      if (d.slides.length <= 1) return d;
      return renumber({ ...d, slides: d.slides.filter((s) => s.id !== id) });
    });

  const applyChat = async (slideId: string | null, instruction: string): Promise<string> => {
    if (!deck) return "No deck open.";
    const { deck: next, reply } = applyInstruction(deck, slideId, instruction);
    if (next !== deck) mutate(() => next);
    return reply;
  };

  /* ---------------- outline continue: drop unticked cards ---------------- */
  const continueFromOutline = () => {
    if (!deck) return;
    const kept = deck.slides.filter((s) => !disabledIds.has(s.id));
    if (kept.length === 0) {
      toast("err", "Keep at least one card ticked");
      return;
    }
    if (kept.length !== deck.slides.length) mutate((d) => renumber({ ...d, slides: kept }));
    setView("theme");
  };

  /* ================================== render ================================== */
  return (
    <Boundary>
      {view === "home" && (
        <HomeView
          recents={recents}
          importing={importing}
          importLabel={importLabel}
          onTopic={startTopic}
          onText={startText}
          onImport={importFile}
          onOpen={openRecent}
          onDuplicateRecent={duplicateRecent}
          onDeleteRecent={deleteRecent}
          onBlueprint={() => setBlueprint(true)}
        />
      )}

      {view === "outline" && deck && (
        <OutlineView
          deck={deck}
          disabledIds={disabledIds}
          sourceName={sourceName}
          onToggle={(id) =>
            setDisabledIds((s) => {
              const next = new Set(s);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onPatchSlide={patchSlide}
          onRemove={(id) => {
            removeSlide(id);
            toast("ok", "Card removed");
          }}
          onAdd={() => addSlide()}
          onBack={() => setView("home")}
          onContinue={continueFromOutline}
        />
      )}

      {view === "theme" && deck && (
        <ThemeView deck={deck} onTheme={(id) => patchDeck({ themeId: id })} onBack={() => setView("outline")} onCreate={() => setView("editor")} />
      )}

      {view === "editor" && deck && (
        <EditorView
          deck={deck}
          canUndo={hist.past.length > 0}
          canRedo={hist.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          onPatchDeck={patchDeck}
          onPatchSlide={patchSlide}
          onReorder={reorderSlides}
          onAdd={addSlide}
          onDuplicate={(id) => {
            duplicateSlide(id);
            toast("ok", "Card duplicated");
          }}
          onRemove={removeSlide}
          onApplyChat={applyChat}
          onPresent={() => setView("present")}
          onBack={() => setView("home")}
          onToast={(m) => toast("ok", m)}
        />
      )}

      {view === "present" && deck && <PresentView deck={deck} onExit={() => setView("editor")} />}

      {genStage !== null && <GenOverlay stage={genStage} />}

      <BlueprintDrawer open={blueprint} onClose={() => setBlueprint(false)} />

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[13px] font-semibold shadow-lift ${
              t.kind === "ok" ? "border-moss/30 bg-ink text-paper" : "border-ember/40 bg-ember text-white"
            }`}
          >
            {t.kind === "ok" ? <IconCheck size={15} className="text-moss" /> : <IconBolt size={15} />}
            {t.msg}
          </div>
        ))}
      </div>
    </Boundary>
  );
}

export default function App() {
  return <AppInner />;
}
