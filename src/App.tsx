/* ------------------------------------------------------------------ */
/*  SlideForge — Gamma-style AI presentation studio.                   */
/*  Flow: Home → Outline → Theme → Editor (⇄ Present) → Export/Share   */
/* ------------------------------------------------------------------ */

import { Component, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Deck, seedLayoutPatch, SlideData, uid } from "./lib/types";
import { buildDeckFromText } from "./lib/engine";
import { buildTopicDeck } from "./lib/topicDeck";
import { readDeckFromHash } from "./lib/share";
import HomeView, { RecentDeck } from "./components/HomeView";
import OutlineView from "./components/OutlineView";
import ThemeView from "./components/ThemeView";
import EditorView from "./components/EditorView";
import PresentView from "./components/PresentView";
import BlueprintDrawer from "./components/BlueprintDrawer";
import { IconAlert, IconBolt, IconCheck } from "./components/icons";

/* ------------------------------ persistence ------------------------------ */

const K_RECENT = "sf.recent.v1";
const K_CURRENT = "sf.current.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — the session still works */
  }
}

/* ------------------------------ error boundary ------------------------------ */

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="dot-grid flex min-h-dvh items-center justify-center bg-paper p-6">
        <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ember/10 text-ember">
            <IconAlert size={24} />
          </span>
          <h1 className="font-display mt-4 text-xl font-bold">Something went sideways</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            The studio hit an unexpected error. Your decks are saved locally — reloading will
            bring you right back.
          </p>
          <p className="mt-3 rounded-lg bg-paper-2 px-3 py-2 font-mono text-[11px] text-mist">
            {String(this.state.error?.message ?? this.state.error)}
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mx-auto mt-5">
            Reload studio
          </button>
        </div>
      </div>
    );
  }
}

/* ------------------------------ toasts ------------------------------ */

interface Toast {
  id: string;
  kind: "ok" | "warn" | "err";
  msg: string;
}

function Toasts({ items }: { items: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[min(92vw,380px)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-medium shadow-card backdrop-blur ${
            t.kind === "ok"
              ? "border-moss/40 bg-moss-soft/95 text-moss-deep"
              : t.kind === "warn"
                ? "border-hon/50 bg-[#fdf3dd]/95 text-hon-deep"
                : "border-ember/40 bg-[#fbe7e0]/95 text-ember"
          }`}
        >
          <span className="mt-0.5 shrink-0">
            {t.kind === "ok" ? <IconCheck size={14} strokeWidth={2.6} /> : <IconAlert size={14} />}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ app ------------------------------ */

type View = "home" | "outline" | "theme" | "editor";

function Studio() {
  const [view, setView] = useState<View>("home");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
  const [sourceName, setSourceName] = useState("");
  const [recents, setRecents] = useState<RecentDeck[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [presenting, setPresenting] = useState(false);
  const [blueprint, setBlueprint] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const saveTimer = useRef<number | null>(null);

  const toast = useCallback((kind: Toast["kind"], msg: string) => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  /* ---------- boot: share link → resume → home ---------- */
  useEffect(() => {
    setRecents(load<RecentDeck[]>(K_RECENT, []));
    const linked = readDeckFromHash();
    if (linked) {
      const id = uid();
      setDeck(linked);
      setCurrentId(id);
      setView("editor");
      toast("ok", "Deck loaded from share link — it's yours to edit now.");
      return;
    }
    const cur = load<{ id: string; deck: Deck } | null>(K_CURRENT, null);
    if (cur?.deck?.slides?.length) {
      setDeck(cur.deck);
      setCurrentId(cur.id);
      setView("editor");
      toast("ok", "Welcome back — picked up right where you left off.");
    }
  }, [toast]);

  /* ---------- autosave while editing ---------- */
  useEffect(() => {
    if (!deck || view !== "editor") return;
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const entry: RecentDeck = { id: currentId || uid(), savedAt: Date.now(), deck };
      setCurrentId(entry.id);
      setRecents((r) => [entry, ...r.filter((x) => x.id !== entry.id)].slice(0, 6));
      save(K_RECENT, [entry, ...load<RecentDeck[]>(K_RECENT, []).filter((x) => x.id !== entry.id)].slice(0, 6));
      save(K_CURRENT, { id: entry.id, deck });
      setSaveState("saved");
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [deck, view, currentId]);

  /* ---------- pipeline entrances ---------- */
  const openOutline = (d: Deck, source: string, verb: string) => {
    setDeck(d);
    setSourceName(source);
    setDisabledIds(new Set());
    setView("outline");
    toast("ok", `${verb} ${d.slides.length} cards from “${source}”.`);
  };

  const startFromText = (text: string, name: string) => {
    setPending("Structuring your source…");
    window.setTimeout(() => {
      try {
        openOutline(buildDeckFromText(text, name, "auto"), name, "Drafted");
      } catch (e) {
        toast("err", e instanceof Error ? e.message : "Couldn't structure that text.");
      } finally {
        setPending(null);
      }
    }, 620);
  };

  const startFromTopic = (topic: string, count: number) => {
    setPending("Drafting an outline…");
    window.setTimeout(() => {
      try {
        openOutline(buildTopicDeck(topic, count), topic, "Drafted");
      } catch {
        toast("err", "Couldn't draft that topic — try different wording.");
      } finally {
        setPending(null);
      }
    }, 620);
  };

  const startFromFile = async (file: File) => {
    setPending(`Reading ${file.name}…`);
    try {
      const { extractTextFromFile } = await import("./lib/extract");
      const { text, truncated } = await extractTextFromFile(file);
      setPending("Structuring your source…");
      await new Promise((r) => setTimeout(r, 450));
      openOutline(buildDeckFromText(text, file.name, "auto"), file.name, "Drafted");
      if (truncated) toast("warn", "Long document — kept the first ~60k characters.");
    } catch (e) {
      toast("err", e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setPending(null);
    }
  };

  /* ---------- outline mutations ---------- */
  const patchOutlineSlide = (id: string, patch: Partial<SlideData>) =>
    setDeck((d) =>
      d
        ? {
            ...d,
            slides: d.slides.map((s) =>
              s.id === id ? { ...s, ...(patch.layout ? seedLayoutPatch(s, patch.layout) : patch) } : s
            ),
          }
        : d
    );

  const removeOutlineSlide = (id: string) =>
    setDeck((d) =>
      d
        ? { ...d, slides: d.slides.filter((s) => s.id !== id).map((s, i) => ({ ...s, slide_number: i + 1 })) }
        : d
    );

  const addOutlineSlide = () =>
    setDeck((d) => {
      if (!d) return d;
      const fresh: SlideData = {
        id: uid(),
        slide_number: 0,
        layout: "bullets",
        title: "New card",
        bullets: ["Make the point in one line", "Back it with a number or example"],
        notes: "",
      };
      const last = d.slides[d.slides.length - 1];
      const at = last && last.layout === "closing" ? d.slides.length - 1 : d.slides.length;
      const slides = [...d.slides.slice(0, at), fresh, ...d.slides.slice(at)].map((s, i) => ({
        ...s,
        slide_number: i + 1,
      }));
      return { ...d, slides };
    });

  const continueToTheme = () => {
    setDeck((d) => {
      if (!d) return d;
      return { ...d, slides: d.slides.filter((s) => !disabledIds.has(s.id)).map((s, i) => ({ ...s, slide_number: i + 1 })) };
    });
    setView("theme");
  };

  const openEditor = () => {
    setView("editor");
    toast("ok", "Deck created — click any text on a card to edit it.");
  };

  const openRecent = (r: RecentDeck) => {
    setDeck(r.deck);
    setCurrentId(r.id);
    setView("editor");
  };

  const deleteRecent = (id: string) => {
    setRecents((r) => r.filter((x) => x.id !== id));
    save(K_RECENT, load<RecentDeck[]>(K_RECENT, []).filter((x) => x.id !== id));
    toast("ok", "Deck deleted.");
  };

  const goHome = () => {
    setPresenting(false);
    setView("home");
  };

  /* ---------- render ---------- */
  return (
    <div className="font-body min-h-dvh bg-paper text-ink">
      {view === "home" && (
        <HomeView
          recents={recents}
          importing={pending !== null}
          importLabel={pending ?? ""}
          onTopic={startFromTopic}
          onText={startFromText}
          onImport={startFromFile}
          onOpen={openRecent}
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
              const n = new Set(s);
              if (n.has(id)) n.delete(id);
              else n.add(id);
              return n;
            })
          }
          onPatchSlide={patchOutlineSlide}
          onRemove={removeOutlineSlide}
          onAdd={addOutlineSlide}
          onBack={goHome}
          onContinue={continueToTheme}
        />
      )}

      {view === "theme" && deck && (
        <ThemeView
          deck={deck}
          onTheme={(id) => setDeck((d) => (d ? { ...d, themeId: id } : d))}
          onBack={() => setView("outline")}
          onCreate={openEditor}
        />
      )}

      {view === "editor" && deck && (
        <EditorView
          deck={deck}
          onDeck={setDeck}
          saveState={saveState}
          onPresent={() => setPresenting(true)}
          onHome={goHome}
          toast={toast}
        />
      )}

      {presenting && deck && <PresentView deck={deck} onExit={() => setPresenting(false)} />}

      {/* pending overlay */}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm">
          <div className="pop-in w-full max-w-sm rounded-xl border border-line bg-paper p-7 text-center shadow-card">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-ink text-hon">
              <IconBolt size={22} className="pulse-dot" />
            </span>
            <p className="font-display mt-4 text-[16px] font-bold">{pending}</p>
            <p className="mt-1 text-[12.5px] text-mist">Sections → titles → bullets → layouts</p>
            <div className="mt-5 h-[6px] overflow-hidden rounded-full bg-paper-3">
              <div className="shimmer h-full w-full rounded-full bg-moss" />
            </div>
          </div>
        </div>
      )}

      <BlueprintDrawer open={blueprint} onClose={() => setBlueprint(false)} />
      <Toasts items={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <Boundary>
      <Studio />
    </Boundary>
  );
}
