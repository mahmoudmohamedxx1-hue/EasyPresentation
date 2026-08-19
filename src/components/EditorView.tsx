/* ------------------------------------------------------------------ */
/*  Editor — the Gamma-style workspace: rail + card canvas + AI panel. */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { Deck, LAYOUTS, LayoutKind, seedLayoutPatch, SlideData, uid } from "../lib/types";
import { THEMES, getTheme } from "../lib/themes";
import { applyInstruction, ChatMsg, QUICK_ACTIONS } from "../lib/aiChat";
import { copyText, deckShareUrl } from "../lib/share";
import SlideCard from "./SlideCard";
import { useWidth } from "./useWidth";
import {
  IconArrowLeft,
  IconChat,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDownload,
  IconGrid,
  IconHome,
  IconNote,
  IconPlay,
  IconPlus,
  IconSend,
  IconShare,
  IconSpinner,
  IconTrash,
  IconWand,
  IconX,
} from "./icons";

interface Props {
  deck: Deck;
  onDeck: (d: Deck) => void;
  saveState: "saved" | "saving";
  onPresent: () => void;
  onHome: () => void;
  toast: (kind: "ok" | "warn" | "err", msg: string) => void;
}

function renumber(deck: Deck): Deck {
  return { ...deck, slides: deck.slides.map((s, i) => ({ ...s, slide_number: i + 1 })) };
}

/* ------------------------------ card toolbar ------------------------------ */

function CardTools({
  layout,
  canDelete,
  aiActive,
  onLayout,
  onAi,
  onDup,
  onUp,
  onDown,
  onDel,
}: {
  layout: LayoutKind;
  canDelete: boolean;
  aiActive: boolean;
  onLayout: (l: LayoutKind) => void;
  onAi: () => void;
  onDup: () => void;
  onUp: () => void;
  onDown: () => void;
  onDel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const tb = "grid h-[28px] w-[28px] place-items-center rounded-md text-ink-3 transition-colors hover:bg-moss-soft hover:text-moss-deep";
  return (
    <div
      className={`absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-lg border border-line bg-paper/95 p-0.5 shadow-lift backdrop-blur transition-opacity ${
        open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <button className={tb} onClick={() => setOpen(!open)} title="Change layout" aria-label="Change layout">
          <IconGrid size={14} />
        </button>
        {open && (
          <div className="scale-in absolute right-0 top-[calc(100%+6px)] w-44 rounded-lg border border-line bg-paper p-1 shadow-card">
            <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-mist">Layout</div>
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onLayout(l.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium transition-colors ${
                  layout === l.id ? "bg-moss-soft text-moss-deep" : "text-ink-3 hover:bg-paper-2"
                }`}
              >
                {l.label}
                {layout === l.id && <IconCheck size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <button className={`${tb} ${aiActive ? "bg-moss-soft text-moss-deep" : ""}`} onClick={onAi} title="Edit with AI" aria-label="Edit with AI">
        <IconWand size={14} />
      </button>
      <button className={tb} onClick={onDup} title="Duplicate card" aria-label="Duplicate card">
        <IconCopy size={14} />
      </button>
      <button className={tb} onClick={onUp} title="Move up" aria-label="Move up">
        <IconChevronUp size={14} />
      </button>
      <button className={tb} onClick={onDown} title="Move down" aria-label="Move down">
        <IconChevronDown size={14} />
      </button>
      <button
        className={`${tb} ${canDelete ? "hover:bg-ember/10 hover:text-ember" : "cursor-not-allowed opacity-30"}`}
        onClick={canDelete ? onDel : undefined}
        title={canDelete ? "Delete card" : "A deck needs a title card"}
        aria-label="Delete card"
      >
        <IconTrash size={14} />
      </button>
    </div>
  );
}

/* ------------------------------ main view ------------------------------ */

export default function EditorView({ deck, onDeck, saveState, onPresent, onHome, toast }: Props) {
  const [activeId, setActiveId] = useState(deck.slides[0]?.id ?? "");
  const [aiOpen, setAiOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<"pptx" | "json" | null>(null);

  const wrapRefs = useRef(new Map<string, HTMLDivElement>());
  const deckRef = useRef(deck);
  const activeRef = useRef(activeId);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  deckRef.current = deck;
  activeRef.current = activeId;

  const theme = getTheme(deck.themeId);
  const [colRef, colW] = useWidth<HTMLDivElement>(860);
  const cardW = Math.max(280, Math.min(colW, 920));

  /* ---------- deck mutations ---------- */
  const patchSlide = (id: string, patch: Partial<SlideData>) =>
    onDeck({ ...deck, slides: deck.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  const move = (id: string, dir: -1 | 1) => {
    const i = deck.slides.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= deck.slides.length) return;
    const next = [...deck.slides];
    [next[i], next[j]] = [next[j], next[i]];
    onDeck(renumber({ ...deck, slides: next }));
  };

  const duplicate = (id: string) => {
    const i = deck.slides.findIndex((s) => s.id === id);
    if (i < 0) return;
    const copy: SlideData = { ...deck.slides[i], id: uid(), title: deck.slides[i].title };
    const next = [...deck.slides.slice(0, i + 1), copy, ...deck.slides.slice(i + 1)];
    onDeck(renumber({ ...deck, slides: next }));
    setActiveId(copy.id);
    toast("ok", "Card duplicated.");
  };

  const remove = (id: string) => {
    const s = deck.slides.find((x) => x.id === id);
    if (!s || deck.slides.length <= 2) return toast("warn", "A deck needs at least two cards.");
    if (s.layout === "title") return toast("warn", "The title card anchors the deck — edit it instead.");
    const next = deck.slides.filter((x) => x.id !== id);
    onDeck(renumber({ ...deck, slides: next }));
    const ni = Math.min(deck.slides.findIndex((x) => x.id === id), next.length - 1);
    setActiveId(next[ni]?.id ?? next[0].id);
    toast("ok", `Deleted “${s.title}”.`);
  };

  const addAfter = (id: string) => {
    const i = deck.slides.findIndex((s) => s.id === id);
    const fresh: SlideData = {
      id: uid(),
      slide_number: 0,
      layout: "bullets",
      title: "New card",
      bullets: ["Make the point in one line", "Back it with evidence or a number"],
      notes: "",
    };
    const at = i < 0 ? deck.slides.length : i + 1;
    const next = [...deck.slides.slice(0, at), fresh, ...deck.slides.slice(at)];
    onDeck(renumber({ ...deck, slides: next }));
    setActiveId(fresh.id);
    requestAnimationFrame(() => scrollToCard(fresh.id));
  };

  const scrollToCard = (id: string) =>
    wrapRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

  /* ---------- selection follows scroll ---------- */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: { id: string; ratio: number } | null = null;
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.cardId;
          if (e.isIntersecting && id && (!best || e.intersectionRatio > best.ratio)) {
            best = { id, ratio: e.intersectionRatio };
          }
        }
        if (best) setActiveId(best.id);
      },
      { root: null, threshold: [0.35, 0.6, 0.85] }
    );
    wrapRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [deck.slides.map((s) => s.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      const idx = deckRef.current.slides.findIndex((s) => s.id === activeRef.current);
      if (e.key === "ArrowDown" && idx < deckRef.current.slides.length - 1) {
        e.preventDefault();
        const id = deckRef.current.slides[idx + 1].id;
        setActiveId(id);
        scrollToCard(id);
      } else if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        const id = deckRef.current.slides[idx - 1].id;
        setActiveId(id);
        scrollToCard(id);
      } else if ((e.key === "Delete" || e.key === "Backspace") && idx >= 0) {
        e.preventDefault();
        remove(deckRef.current.slides[idx].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- AI chat ---------- */
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, thinking]);

  const send = (preset?: string) => {
    const msg = (preset ?? chatInput).trim();
    if (!msg || thinking) return;
    setChat((c) => [...c, { id: uid(), role: "user", text: msg }]);
    setChatInput("");
    setThinking(true);
    setTimeout(() => {
      const res = applyInstruction(deckRef.current, activeRef.current, msg);
      onDeck(res.deck);
      if (res.selectId) {
        setActiveId(res.selectId);
        scrollToCard(res.selectId);
      }
      setChat((c) => [...c, { id: uid(), role: "assistant", text: res.reply }]);
      setThinking(false);
    }, 480);
  };

  /* ---------- export / share ---------- */
  const doExport = async (kind: "pptx" | "json") => {
    setExporting(kind);
    setExportOpen(false);
    try {
      const m = await import("../lib/pptx");
      if (kind === "pptx") await m.exportDeckPptx(deck);
      else m.exportDeckJson(deck);
      toast("ok", kind === "pptx" ? "PowerPoint downloaded — go get 'em." : "Deck JSON downloaded.");
    } catch (err) {
      toast("err", err instanceof Error ? err.message : "Export failed — please try again.");
    } finally {
      setExporting(null);
    }
  };

  const doShare = async () => {
    const url = deckShareUrl(deck);
    const ok = await copyText(url);
    toast(ok ? "ok" : "warn", ok ? "Share link copied — it opens this exact deck." : "Couldn't copy automatically — link is in the console.");
    if (!ok) console.info("Share link:", url);
  };

  const activeSlide = deck.slides.find((s) => s.id === activeId) ?? deck.slides[0];

  return (
    <div className="flex h-[100dvh] flex-col bg-paper">
      {/* ---------------- top bar ---------------- */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper px-4">
        <button onClick={onHome} className="btn btn-ghost h-9 px-2.5" title="Back to home">
          <IconHome size={16} />
        </button>
        <input
          value={deck.title}
          onChange={(e) => onDeck({ ...deck, title: e.target.value })}
          className="font-display w-[200px] rounded-lg bg-transparent px-2 py-1.5 text-[15px] font-bold text-ink transition-colors hover:bg-paper-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss/40 sm:w-[300px]"
          aria-label="Deck title"
        />
        <span
          className={`hidden items-center gap-1.5 font-mono text-[11px] sm:flex ${
            saveState === "saving" ? "text-hon-deep" : "text-mist"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${saveState === "saving" ? "bg-hon pulse-dot" : "bg-moss saved-pulse"}`} />
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* theme picker */}
          <div className="relative">
            <button onClick={() => { setThemeOpen(!themeOpen); setExportOpen(false); }} className="btn btn-ghost h-9 px-3">
              <span className="flex -space-x-1">
                {[theme.accent, theme.accent2, theme.ink].map((c, i) => (
                  <span key={i} className="h-3.5 w-3.5 rounded-full border border-paper" style={{ background: c }} />
                ))}
              </span>
              <span className="hidden lg:inline">{theme.name}</span>
            </button>
            {themeOpen && (
              <div className="scale-in absolute right-0 top-[calc(100%+8px)] z-40 w-56 rounded-xl border border-line bg-paper p-1.5 shadow-card">
                <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-mist">Deck theme</div>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onDeck({ ...deck, themeId: t.id });
                      setThemeOpen(false);
                      toast("ok", `Theme switched to ${t.name}.`);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                      t.id === deck.themeId ? "bg-moss-soft" : "hover:bg-paper-2"
                    }`}
                  >
                    <span className="flex -space-x-1">
                      {[t.bg, t.accent, t.accent2].map((c, i) => (
                        <span key={i} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />
                      ))}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[13px] font-semibold text-ink-2">{t.name}</span>
                      <span className="block text-[11px] text-mist">{t.mood}</span>
                    </span>
                    {t.id === deck.themeId && <IconCheck size={14} className="text-moss-deep" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setAiOpen(!aiOpen)}
            className={`btn h-9 px-3 ${aiOpen ? "btn-moss" : "btn-ghost"}`}
            title="Edit with AI"
          >
            <IconChat size={15} /> <span className="hidden md:inline">Edit with AI</span>
          </button>

          <button onClick={onPresent} className="btn btn-primary h-9 px-4">
            <IconPlay size={14} /> Present
          </button>

          <button onClick={doShare} className="btn btn-ghost h-9 px-3" title="Copy share link">
            <IconShare size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => { setExportOpen(!exportOpen); setThemeOpen(false); }}
              className="btn btn-moss h-9 px-4"
              disabled={exporting !== null}
            >
              {exporting ? <IconSpinner size={14} /> : <IconDownload size={15} />}
              <span className="hidden sm:inline">{exporting ? "Compiling…" : "Export"}</span>
            </button>
            {exportOpen && (
              <div className="scale-in absolute right-0 top-[calc(100%+8px)] z-40 w-60 rounded-xl border border-line bg-paper p-1.5 shadow-card">
                <button onClick={() => doExport("pptx")} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-moss-soft">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-moss text-white"><IconDownload size={15} /></span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-2">PowerPoint (.pptx)</span>
                    <span className="block text-[11px] text-mist">16:9 · themed · editable</span>
                  </span>
                </button>
                <button onClick={() => doExport("json")} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-paper-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper-2 text-ink-3"><IconCopy size={15} /></span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink-2">Deck JSON</span>
                    <span className="block text-[11px] text-mist">Feed the FastAPI exporter</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* close popovers on outside click */}
      {(themeOpen || exportOpen) && (
        <button className="fixed inset-0 z-30 cursor-default" onClick={() => { setThemeOpen(false); setExportOpen(false); }} aria-label="Close menus" />
      )}

      {/* ---------------- workspace ---------------- */}
      <div className="flex min-h-0 flex-1">
        {/* thumbnail rail */}
        <aside className="thin-scroll hidden w-[218px] shrink-0 space-y-3 overflow-y-auto border-r border-line bg-paper-2/50 p-3 md:block">
          {deck.slides.map((s, i) => (
            <div key={s.id} className="group/thumb relative">
              <button
                onClick={() => {
                  setActiveId(s.id);
                  scrollToCard(s.id);
                }}
                className={`block w-full overflow-hidden rounded-lg transition-all ${
                  activeId === s.id ? "ring-2 ring-moss ring-offset-2 ring-offset-paper-2" : "hover:ring-2 hover:ring-moss/40 hover:ring-offset-2 hover:ring-offset-paper-2"
                }`}
                aria-label={`Card ${i + 1}: ${s.title}`}
              >
                <SlideCard slide={s} deckTitle={deck.title} theme={theme} width={194} showNumber={false} />
              </button>
              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-ink/75 px-1.5 py-0.5 font-mono text-[10px] text-paper">
                {i + 1}
              </span>
              <div className="absolute bottom-1.5 right-1.5 flex gap-0.5 rounded-md bg-ink/80 p-0.5 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                <button onClick={() => move(s.id, -1)} className="rounded p-1 text-paper/80 hover:bg-white/15 hover:text-paper" title="Move up" aria-label="Move up">
                  <IconChevronUp size={12} />
                </button>
                <button onClick={() => move(s.id, 1)} className="rounded p-1 text-paper/80 hover:bg-white/15 hover:text-paper" title="Move down" aria-label="Move down">
                  <IconChevronDown size={12} />
                </button>
                <button onClick={() => duplicate(s.id)} className="rounded p-1 text-paper/80 hover:bg-white/15 hover:text-paper" title="Duplicate" aria-label="Duplicate">
                  <IconCopy size={12} />
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="rounded p-1 text-paper/80 hover:bg-ember/80 hover:text-paper disabled:opacity-30"
                  disabled={deck.slides.length <= 2 || s.layout === "title"}
                  title="Delete"
                  aria-label="Delete"
                >
                  <IconTrash size={12} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => addAfter(activeId)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line py-3 text-[12.5px] font-semibold text-mist transition-colors hover:border-moss hover:text-moss-deep"
          >
            <IconPlus size={13} /> Add card
          </button>
        </aside>

        {/* card canvas */}
        <div className="dot-grid min-w-0 flex-1 overflow-y-auto">
          <div ref={colRef} className="mx-auto max-w-[920px] px-4 py-8 sm:px-6">
            {deck.slides.map((s) => (
              <div
                key={s.id}
                data-card-id={s.id}
                ref={(el) => {
                  if (el) wrapRefs.current.set(s.id, el);
                  else wrapRefs.current.delete(s.id);
                }}
                onClick={() => setActiveId(s.id)}
                className="group mb-8 cursor-pointer"
              >
                <div
                  className={`rounded-xl transition-shadow duration-300 ${
                    activeId === s.id ? "shadow-card ring-2 ring-moss ring-offset-4 ring-offset-paper" : "hover:shadow-lift"
                  }`}
                >
                  <SlideCard
                    slide={s}
                    deckTitle={deck.title}
                    theme={theme}
                    width={cardW}
                    interactive
                    onPatch={(p) => patchSlide(s.id, p)}
                    toolbar={
                      <CardTools
                        layout={s.layout}
                        canDelete={deck.slides.length > 2 && s.layout !== "title"}
                        aiActive={aiOpen && activeId === s.id}
                        onLayout={(l) => patchSlide(s.id, seedLayoutPatch(s, l))}
                        onAi={() => {
                          setActiveId(s.id);
                          setAiOpen(true);
                        }}
                        onDup={() => duplicate(s.id)}
                        onUp={() => move(s.id, -1)}
                        onDown={() => move(s.id, 1)}
                        onDel={() => remove(s.id)}
                      />
                    }
                  />
                </div>
              </div>
            ))}
            <div className="pb-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
              End of deck · {deck.slides.length} cards · press <span className="kbd">↑</span> <span className="kbd">↓</span> to navigate
            </div>
          </div>
        </div>

        {/* AI panel */}
        {aiOpen && (
          <aside className="slide-in-right flex w-[330px] max-w-[86vw] shrink-0 flex-col border-l border-line bg-white">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-moss text-white"><IconWand size={14} /></span>
                <div>
                  <div className="font-display text-[13.5px] font-bold leading-none">Edit with AI</div>
                  <div className="mt-0.5 text-[11px] text-mist">Card {activeSlide?.slide_number ?? 1} in context</div>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="rounded-md p-1.5 text-mist hover:bg-paper-2 hover:text-ink" aria-label="Close panel">
                <IconX size={15} />
              </button>
            </div>

            <div ref={chatScrollRef} className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {chat.length === 0 && (
                <div className="rounded-xl border border-dashed border-line bg-paper p-4">
                  <p className="text-[12.5px] leading-relaxed text-mist">
                    Tell the engine what to change. It edits the live deck — no re-render, no
                    re-upload. Examples:
                  </p>
                  <ul className="mt-2.5 space-y-1.5 font-mono text-[11.5px] text-ink-3">
                    <li>· “shorten bullets”</li>
                    <li>· “add a card about risks”</li>
                    <li>· “make it more formal”</li>
                    <li>· “switch theme to Ember”</li>
                    <li>· “delete this card”</li>
                  </ul>
                </div>
              )}
              {chat.map((m) => (
                <div key={m.id} className={`chat-in flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${
                      m.role === "user" ? "bg-ink text-paper" : "border border-line bg-paper text-ink-3"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="chat-in flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2.5 text-mist">
                  <span className="think-dot h-1.5 w-1.5 rounded-full bg-moss" />
                  <span className="think-dot h-1.5 w-1.5 rounded-full bg-moss" />
                  <span className="think-dot h-1.5 w-1.5 rounded-full bg-moss" />
                  <span className="ml-1 text-[11.5px]">forging…</span>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-line p-3">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-3 transition-colors hover:border-moss hover:text-moss-deep"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe the edit…"
                  className="field h-[40px] flex-1 text-[13px]"
                />
                <button type="submit" disabled={!chatInput.trim() || thinking} className="btn btn-moss h-[40px] w-[42px] p-0">
                  <IconSend size={15} />
                </button>
              </form>
            </div>

            {/* speaker notes */}
            <div className="shrink-0 border-t border-line bg-paper p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-mist">
                <IconNote size={13} /> Speaker notes · card {activeSlide?.slide_number ?? 1}
              </div>
              <textarea
                value={activeSlide?.notes ?? ""}
                onChange={(e) => activeSlide && patchSlide(activeSlide.id, { notes: e.target.value })}
                rows={3}
                placeholder="What you'll say on this card…"
                className="field resize-none text-[12.5px] leading-relaxed"
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
