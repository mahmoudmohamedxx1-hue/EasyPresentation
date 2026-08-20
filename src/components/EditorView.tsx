/* ------------------------------------------------------------------ */
/*  Editor — Gamma-style workspace: thumbnail rail (drag to reorder),  */
/*  scrolling card canvas with per-card toolbars, Cards/Grid views,    */
/*  zoom, undo/redo, Edit-with-AI panel, Present, and the Export hub.  */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from "react";
import { Deck, LAYOUTS, LayoutKind, SlideData, uid, wordCount } from "../lib/types";
import { THEMES, getTheme } from "../lib/themes";
import { exportDeckJson, exportDeckPptx } from "../lib/pptx";
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
  IconLayers,
  IconPalette,
  IconPencil,
  IconPlay,
  IconPlus,
  IconSend,
  IconShare,
  IconSliders,
  IconSpinner,
  IconTrash,
  IconWand,
  IconX,
} from "./icons";

interface Msg {
  role: "user" | "ai";
  text: string;
}

interface Props {
  deck: Deck;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPatchDeck: (patch: Partial<Deck>) => void;
  onPatchSlide: (id: string, patch: Partial<SlideData>) => void;
  onReorder: (ids: string[]) => void;
  onAdd: (index?: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onApplyChat: (slideId: string | null, instruction: string) => Promise<string>;
  onPresent: () => void;
  onBack: () => void;
  onToast: (text: string) => void;
}

const QUICK_ACTIONS = [
  "Shorten bullets",
  "Make it more formal",
  "Add a key takeaway",
  "Punchier titles",
  "Add card: Risks",
  "More concise",
];

export default function EditorView({
  deck,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPatchDeck,
  onPatchSlide,
  onReorder,
  onAdd,
  onDuplicate,
  onRemove,
  onApplyChat,
  onPresent,
  onBack,
  onToast,
}: Props) {
  const theme = getTheme(deck.themeId);
  const slides = deck.slides;

  const [activeId, setActiveId] = useState(slides[0]?.id ?? "");
  const [view, setView] = useState<"cards" | "grid">("cards");
  const [zoom, setZoom] = useState(1);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<string | null>(null); // null = whole deck
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [layoutFor, setLayoutFor] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [title, setTitle] = useState(deck.title);

  const [canvasRef, canvasW] = useWidth<HTMLDivElement>();
  const wrapRefs = useRef(new Map<string, HTMLDivElement>());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTitle(deck.title), [deck.title]);
  useEffect(() => {
    if (!slides.some((s) => s.id === activeId)) setActiveId(slides[0]?.id ?? "");
  }, [slides, activeId]);

  /* ---------------- selection follows scroll ---------------- */
  useEffect(() => {
    if (view !== "cards" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = (visible.target as HTMLElement).dataset.slideId;
          if (id) setActiveId(id);
        }
      },
      { threshold: [0.55] }
    );
    wrapRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [slides.length, view]);

  /* ---------------- keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        onRedo();
        return;
      }
      if (typing) return;
      const idx = slides.findIndex((s) => s.id === activeId);
      if (e.key === "ArrowDown" && idx < slides.length - 1) {
        e.preventDefault();
        scrollTo(slides[idx + 1].id);
      } else if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        scrollTo(slides[idx - 1].id);
      } else if ((e.key === "Delete" || e.key === "Backspace") && slides.length > 1) {
        onRemove(activeId);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        onDuplicate(activeId);
      } else if (e.key.toLowerCase() === "g") {
        setView((v) => (v === "cards" ? "grid" : "cards"));
      } else if (e.key.toLowerCase() === "p") {
        onPresent();
      } else if (e.key === "?") {
        setHelpOpen((h) => !h);
      } else if (e.key === "Escape") {
        setAiOpen(false);
        setExportOpen(false);
        setThemeOpen(false);
        setHelpOpen(false);
        setLayoutFor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const scrollTo = (id: string) => {
    setActiveId(id);
    wrapRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---------------- reorder via drag & drop ---------------- */
  const dropReorder = () => {
    if (dragId == null || overIdx == null) return;
    const from = slides.findIndex((s) => s.id === dragId);
    if (from < 0) return;
    const target = from < overIdx ? overIdx - 1 : overIdx;
    if (target === from) return;
    const ids = slides.map((s) => s.id);
    ids.splice(from, 1);
    ids.splice(target, 0, dragId);
    onReorder(ids);
    onToast("Card reordered");
  };

  /* ---------------- AI panel ---------------- */
  const openAi = (slideId: string | null) => {
    setAiTarget(slideId);
    setMsgs([]);
    setDraft("");
    setAiOpen(true);
  };
  const send = async (text?: string) => {
    const instruction = (text ?? draft).trim();
    if (!instruction || sending) return;
    setMsgs((m) => [...m, { role: "user", text: instruction }]);
    setDraft("");
    setSending(true);
    try {
      const reply = await onApplyChat(aiTarget, instruction);
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Something went wrong applying that — try rephrasing." }]);
    } finally {
      setSending(false);
    }
  };
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, sending]);

  /* ---------------- export hub ---------------- */
  const doExport = async (kind: "pptx" | "json" | "print" | "share") => {
    setExportOpen(false);
    if (kind === "pptx") {
      setExporting(true);
      try {
        await exportDeckPptx(deck);
        onToast("PowerPoint downloaded — check your downloads folder");
      } catch {
        onToast("Export failed — try again");
      } finally {
        setExporting(false);
      }
    } else if (kind === "json") {
      exportDeckJson(deck);
      onToast("Deck JSON downloaded");
    } else if (kind === "print") {
      onToast("Choose “Save as PDF” in the print dialog");
      setTimeout(() => window.print(), 350);
    } else {
      const ok = await copyText(deckShareUrl(deck));
      onToast(ok ? "Share link copied — anyone with it can view the deck" : "Couldn't access the clipboard");
    }
  };

  const activeIdx = slides.findIndex((s) => s.id === activeId);
  const cardW = useMemo(() => {
    const base = Math.min(Math.max(canvasW - 48, 320), 940);
    return Math.round(base * zoom);
  }, [canvasW, zoom]);

  const gridCols = Math.max(1, Math.floor((canvasW - 40) / 400));
  const gridW = Math.floor((canvasW - 40 - (gridCols - 1) * 20) / gridCols);

  const totalWords = slides.reduce((n, s) => n + wordCount([s.title, ...s.bullets].join(" ")), 0);

  /* ================================================================ */
  return (
    <>
      <div className="no-print flex h-[100dvh] flex-col overflow-hidden">
        {/* ------------------------------ top bar ------------------------------ */}
        <header className="z-30 flex h-[58px] shrink-0 items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur sm:px-4">
          <button onClick={onBack} className="btn btn-ghost px-2.5 py-2" title="Back to Home">
            <IconArrowLeft size={16} />
          </button>
          <div className="hidden h-6 w-px bg-line sm:block" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onPatchDeck({ title: title.trim() || deck.title })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="w-[34vw] max-w-[380px] min-w-[120px] truncate rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-display text-[15px] font-bold text-ink transition-colors hover:border-line focus:border-moss focus:bg-white focus:outline-none"
            aria-label="Deck title"
          />
          <span className="hidden items-center gap-1.5 rounded-full bg-moss-soft px-2.5 py-1 text-[11px] font-semibold text-moss-deep md:flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-moss" />
            Autosaved
          </span>

          <div className="mx-auto hidden items-center rounded-lg border border-line bg-paper p-0.5 lg:flex">
            {(["cards", "grid"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold capitalize transition-all ${
                  view === v ? "bg-ink text-paper shadow-sm" : "text-mist hover:text-ink"
                }`}
              >
                {v === "cards" ? <IconLayers size={14} /> : <IconGrid size={14} />}
                {v}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <button onClick={onUndo} disabled={!canUndo} className="btn btn-ghost px-2.5 py-2" title="Undo (Ctrl+Z)">
              <IconArrowLeft size={15} className="rotate-0" />
            </button>
            <button onClick={onRedo} disabled={!canRedo} className="btn btn-ghost px-2.5 py-2" title="Redo (Ctrl+Shift+Z)">
              <IconArrowLeft size={15} className="scale-x-[-1]" />
            </button>

            {/* theme quick-switch */}
            <div className="relative">
              <button
                onClick={() => {
                  setThemeOpen((o) => !o);
                  setExportOpen(false);
                }}
                className={`btn btn-ghost px-2.5 py-2 ${themeOpen ? "border-moss text-moss-deep" : ""}`}
                title="Theme"
              >
                <IconPalette size={16} />
              </button>
              {themeOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setThemeOpen(false)} aria-label="Close" />
                  <div className="pop-in absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] rounded-xl border border-line bg-white p-2 shadow-lift">
                    <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-mist">Theme</div>
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onPatchDeck({ themeId: t.id });
                          setThemeOpen(false);
                          onToast(`Theme → ${t.name}`);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-paper ${
                          deck.themeId === t.id ? "bg-moss-soft/60" : ""
                        }`}
                      >
                        <span className="flex shrink-0 overflow-hidden rounded-md border border-line">
                          <span className="h-5 w-3" style={{ background: t.bg }} />
                          <span className="h-5 w-3" style={{ background: t.accent }} />
                          <span className="h-5 w-3" style={{ background: t.accent2 }} />
                        </span>
                        <span className="flex-1 text-[13px] font-semibold text-ink-2">{t.name}</span>
                        {deck.themeId === t.id && <IconCheck size={14} className="text-moss" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={onPresent} className="btn btn-ghost hidden px-3 py-2 sm:inline-flex" title="Present (P)">
              <IconPlay size={15} />
              <span className="hidden md:inline">Present</span>
            </button>

            {/* ---------------- DOWNLOAD / export hub ---------------- */}
            <div className="relative">
              <div className="flex overflow-hidden rounded-[10px] shadow-sm">
                <button
                  onClick={() => doExport("pptx")}
                  disabled={exporting}
                  className="btn btn-moss rounded-r-none px-3.5 py-2 text-[13.5px]"
                  title="Download PowerPoint (.pptx)"
                >
                  {exporting ? <IconSpinner size={15} /> : <IconDownload size={15} />}
                  Download
                </button>
                <button
                  onClick={() => {
                    setExportOpen((o) => !o);
                    setThemeOpen(false);
                  }}
                  className={`btn btn-moss rounded-l-none border-l border-white/25 px-2 py-2 ${exportOpen ? "bg-moss-deep" : ""}`}
                  title="More export options"
                  aria-label="More export options"
                >
                  <IconChevronDown size={14} />
                </button>
              </div>
              {exportOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setExportOpen(false)} aria-label="Close" />
                  <div className="pop-in absolute right-0 top-[calc(100%+8px)] z-50 w-[264px] rounded-xl border border-line bg-white p-1.5 shadow-lift">
                    <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-mist">Export</div>
                    {[
                      { k: "pptx" as const, icon: <IconDownload size={15} />, label: "PowerPoint (.pptx)", hint: "Editable slides, themed" },
                      { k: "print" as const, icon: <IconPencil size={15} />, label: "PDF (print)", hint: "Via your browser's print dialog" },
                      { k: "json" as const, icon: <IconSliders size={15} />, label: "Deck JSON", hint: "Structured slide data" },
                    ].map((o) => (
                      <button
                        key={o.k}
                        onClick={() => doExport(o.k)}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper-2 text-ink-2">{o.icon}</span>
                        <span>
                          <span className="block text-[13px] font-semibold text-ink-2">{o.label}</span>
                          <span className="block text-[11px] text-mist">{o.hint}</span>
                        </span>
                      </button>
                    ))}
                    <div className="mx-2 my-1 h-px bg-line" />
                    <button
                      onClick={() => doExport("share")}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-moss-soft text-moss-deep">
                        <IconShare size={15} />
                      </span>
                      <span>
                        <span className="block text-[13px] font-semibold text-ink-2">Copy share link</span>
                        <span className="block text-[11px] text-mist">View-only link, no account needed</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ------------------------------ body ------------------------------ */}
        <div className="flex min-h-0 flex-1">
          {/* thumbnail rail */}
          <aside className="hidden w-[196px] shrink-0 flex-col border-r border-line bg-paper-2/70 md:flex">
            <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-mist">
                Cards <span className="font-mono text-moss-deep">{slides.length}</span>
              </span>
              <button
                onClick={() => onAdd()}
                className="rounded-md p-1 text-mist transition-colors hover:bg-moss-soft hover:text-moss-deep"
                title="Add card"
              >
                <IconPlus size={15} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-6 pt-2">
              {slides.map((s, i) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDragId(s.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverIdx(i);
                  }}
                  onDrop={dropReorder}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverIdx(null);
                  }}
                  onClick={() => scrollTo(s.id)}
                  className={`group relative cursor-grab rounded-lg transition-all active:cursor-grabbing ${
                    overIdx === i && dragId && dragId !== s.id ? "translate-y-1 ring-2 ring-moss" : ""
                  } ${s.id === activeId ? "" : "opacity-80 hover:opacity-100"}`}
                >
                  <div
                    className={`overflow-hidden rounded-lg border-2 transition-all ${
                      s.id === activeId ? "border-moss shadow-card" : "border-transparent shadow-sm"
                    }`}
                  >
                    <SlideCard slide={s} deckTitle={deck.title} theme={theme} width={164} showNumber={false} />
                  </div>
                  <span
                    className={`absolute -left-0.5 top-1.5 rounded-r-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      s.id === activeId ? "bg-moss text-white" : "bg-ink/70 text-paper"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(s.id);
                      }}
                      className="rounded-md bg-ink/80 p-1 text-paper backdrop-blur transition-colors hover:bg-moss"
                      title="Duplicate card"
                    >
                      <IconCopy size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (slides.length > 1) onRemove(s.id);
                      }}
                      className="rounded-md bg-ink/80 p-1 text-paper backdrop-blur transition-colors hover:bg-ember"
                      title="Delete card"
                    >
                      <IconTrash size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[11px] text-mist">
              Drag cards to reorder · <span className="font-mono">{totalWords}</span> words
            </div>
          </aside>

          {/* canvas */}
          <main ref={canvasRef} className="dot-grid relative min-w-0 flex-1 overflow-y-auto bg-paper">
            <div className="ambient-sheen pointer-events-none sticky top-0 z-0 h-0" />

            {/* canvas toolbar */}
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/70 bg-paper/85 px-4 py-2 backdrop-blur sm:px-6">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-mist">
                <span className="font-mono text-ink">
                  {activeIdx + 1} <span className="text-mist">/ {slides.length}</span>
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden truncate sm:inline">
                  {slides[activeIdx]?.layout === "title" ? "Cover card" : slides[activeIdx]?.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
                  className="btn btn-ghost px-2 py-1 text-[15px] leading-none"
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="btn btn-ghost px-2 py-1 font-mono text-[11.5px]"
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.15).toFixed(2)))}
                  className="btn btn-ghost px-2 py-1 text-[15px] leading-none"
                  title="Zoom in"
                >
                  +
                </button>
                <span className="mx-1 h-5 w-px bg-line" />
                <button onClick={() => setHelpOpen(true)} className="btn btn-ghost px-2 py-1 font-mono text-[11.5px]" title="Shortcuts">
                  ?
                </button>
              </div>
            </div>

            {view === "cards" ? (
              <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center gap-8 px-4 pb-24 pt-8 sm:px-6">
                {slides.map((s, i) => (
                  <section key={s.id} className="w-full" style={{ maxWidth: cardW }}>
                    {/* per-card toolbar */}
                    <div
                      className={`mb-2.5 flex items-center gap-1 transition-opacity ${
                        s.id === activeId ? "opacity-100" : "opacity-45 hover:opacity-100"
                      }`}
                    >
                      <span className="mr-1 font-mono text-[11px] font-bold text-mist">{i + 1}</span>
                      <div className="relative">
                        <button
                          onClick={() => setLayoutFor(layoutFor === s.id ? null : s.id)}
                          className={`btn btn-ghost px-2.5 py-1.5 text-[12px] ${layoutFor === s.id ? "border-moss text-moss-deep" : ""}`}
                        >
                          <IconSliders size={13} />
                          {LAYOUTS.find((l) => l.id === s.layout)?.label ?? "Layout"}
                        </button>
                        {layoutFor === s.id && (
                          <>
                            <button className="fixed inset-0 z-40 cursor-default" onClick={() => setLayoutFor(null)} aria-label="Close" />
                            <div className="pop-in absolute left-0 top-[calc(100%+6px)] z-50 grid w-[248px] grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1.5 shadow-lift">
                              {LAYOUTS.filter((l) => l.id !== "title" || s.layout === "title").map((l) => (
                                <button
                                  key={l.id}
                                  onClick={() => {
                                    onPatchSlide(s.id, l.id === s.layout ? { layout: l.id } : seedLayout(s, l.id));
                                    setLayoutFor(null);
                                  }}
                                  className={`rounded-lg border px-2.5 py-2 text-left text-[12px] font-semibold transition-all ${
                                    s.layout === l.id
                                      ? "border-moss bg-moss-soft text-moss-deep"
                                      : "border-line text-ink-2 hover:border-moss/50 hover:bg-paper"
                                  }`}
                                >
                                  {l.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <button onClick={() => openAi(s.id)} className="btn btn-ghost px-2.5 py-1.5 text-[12px]" title="Edit this card with AI">
                        <IconWand size={13} />
                        <span className="hidden sm:inline">Edit with AI</span>
                      </button>
                      <div className="ml-auto flex items-center gap-0.5">
                        <button
                          onClick={() => i > 0 && onReorder(moveId(slides, i, i - 1))}
                          disabled={i === 0}
                          className="btn btn-ghost px-1.5 py-1.5"
                          title="Move up"
                        >
                          <IconChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => i < slides.length - 1 && onReorder(moveId(slides, i, i + 1))}
                          disabled={i === slides.length - 1}
                          className="btn btn-ghost px-1.5 py-1.5"
                          title="Move down"
                        >
                          <IconChevronDown size={14} />
                        </button>
                        <button onClick={() => onDuplicate(s.id)} className="btn btn-ghost px-1.5 py-1.5" title="Duplicate (Ctrl+D)">
                          <IconCopy size={14} />
                        </button>
                        <button
                          onClick={() => slides.length > 1 && onRemove(s.id)}
                          disabled={slides.length === 1}
                          className="btn btn-ghost px-1.5 py-1.5 hover:border-ember hover:text-ember"
                          title="Delete (Del)"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={(el) => {
                        if (el) wrapRefs.current.set(s.id, el);
                        else wrapRefs.current.delete(s.id);
                      }}
                      data-slide-id={s.id}
                      onClick={() => setActiveId(s.id)}
                      className={`fade-up rounded-xl transition-shadow ${
                        s.id === activeId ? "ring-2 ring-moss ring-offset-2 ring-offset-paper" : ""
                      }`}
                      style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
                    >
                      <SlideCard
                        slide={s}
                        deckTitle={deck.title}
                        theme={theme}
                        width={cardW}
                        interactive
                        onPatch={(p) => onPatchSlide(s.id, p)}
                        showNumber
                      />
                    </div>
                  </section>
                ))}
                <button
                  onClick={() => onAdd()}
                  className="btn btn-ghost w-full max-w-[320px] border-dashed py-3 text-mist hover:text-moss-deep"
                >
                  <IconPlus size={15} />
                  Add card
                </button>
              </div>
            ) : (
              /* ---------------- grid view ---------------- */
              <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">
                <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0,1fr))` }}>
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveId(s.id);
                        setView("cards");
                        setTimeout(() => scrollTo(s.id), 60);
                      }}
                      className={`fade-up group relative overflow-hidden rounded-xl border-2 text-left transition-all hover:-translate-y-1 hover:shadow-card ${
                        s.id === activeId ? "border-moss" : "border-line hover:border-moss/50"
                      }`}
                      style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                    >
                      <div className="p-2.5 pb-0">
                        <SlideCard slide={s} deckTitle={deck.title} theme={theme} width={gridW - 22} showNumber={false} />
                      </div>
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <span className="truncate text-[12.5px] font-semibold text-ink-2">
                          {s.layout === "title" ? "Cover" : s.title}
                        </span>
                        <span className="font-mono text-[10.5px] text-mist">{i + 1}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* ---------------- Edit-with-AI panel ---------------- */}
          {aiOpen && (
            <aside className="slide-in-right z-20 flex w-[290px] shrink-0 flex-col border-l border-line bg-white xl:w-[330px]">
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-hon">
                  <IconChat size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold leading-tight">Edit with AI</div>
                  <div className="truncate text-[11px] text-mist">
                    {aiTarget
                      ? `Card ${slides.findIndex((s) => s.id === aiTarget) + 1} · ${slides.find((s) => s.id === aiTarget)?.title}`
                      : "Whole deck"}
                  </div>
                </div>
                <button onClick={() => setAiOpen(false)} className="rounded-md p-1.5 text-mist transition-colors hover:bg-paper hover:text-ink">
                  <IconX size={15} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {msgs.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line bg-paper/60 px-3.5 py-4 text-[12.5px] leading-relaxed text-mist">
                    Describe a change in plain language and watch the card update live.
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`toast-in flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[92%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed ${
                        m.role === "user" ? "bg-ink text-paper" : "bg-moss-soft text-ink-2"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-mist">
                    <IconSpinner size={14} className="text-moss" />
                    Applying changes…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-line p-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={sending}
                      className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink-2 transition-all hover:border-moss hover:bg-moss-soft hover:text-moss-deep"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={2}
                    placeholder="e.g. make the bullets shorter and bolder"
                    className="field min-h-[52px] flex-1 resize-none text-[13px]"
                  />
                  <button onClick={() => send()} disabled={!draft.trim() || sending} className="btn btn-moss px-3 py-2.5">
                    <IconSend size={15} />
                  </button>
                </div>
                <div className="mt-2 text-[10.5px] leading-snug text-mist">
                  Runs on the local engine — instant and private. Add an LLM key on Home for cloud models.
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ---------------- print-only PDF export ---------------- */}
      <div className="print-only">
        {slides.map((s) => (
          <div key={s.id} className="print-card">
            <SlideCard slide={s} deckTitle={deck.title} theme={theme} width={960} showNumber />
          </div>
        ))}
      </div>

      {/* ---------------- shortcuts overlay ---------------- */}
      {helpOpen && (
        <div className="no-print fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={() => setHelpOpen(false)}>
          <div className="pop-in w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[17px] font-bold">Keyboard shortcuts</h3>
              <button onClick={() => setHelpOpen(false)} className="rounded-md p-1.5 text-mist hover:bg-paper">
                <IconX size={15} />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["↑ / ↓", "Previous / next card"],
                ["Del", "Delete active card"],
                ["Ctrl/⌘ + Z", "Undo"],
                ["Ctrl/⌘ + Shift + Z", "Redo"],
                ["Ctrl/⌘ + D", "Duplicate card"],
                ["G", "Toggle grid view"],
                ["P", "Start presenting"],
                ["?", "This panel"],
                ["Esc", "Close panels"],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between gap-4 rounded-lg bg-paper px-3 py-2">
                  <span className="text-[13px] text-ink-2">{d}</span>
                  <kbd className="rounded-md border border-line bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-2 shadow-sm">
                    {k}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function moveId(slides: SlideData[], from: number, to: number): string[] {
  const ids = slides.map((s) => s.id);
  const [item] = ids.splice(from, 1);
  ids.splice(to, 0, item);
  return ids;
}

function seedLayout(slide: SlideData, layout: LayoutKind): Partial<SlideData> {
  const patch: Partial<SlideData> = { layout };
  if (layout === "stats" && (!slide.stats || slide.stats.length === 0)) {
    patch.stats = [
      { value: "42%", label: "headline number — click to edit" },
      { value: "3×", label: "supporting metric — click to edit" },
    ];
  }
  if (layout === "quote" && !slide.quote?.text) {
    patch.quote = { text: slide.bullets[0] ?? "A line worth remembering", attribution: "" };
  }
  return patch;
}
