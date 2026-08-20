/* ------------------------------------------------------------------ */
/*  SlideCard — renders one slide of deck JSON in a 960×540 design     */
/*  space, scaled to any width. Inline-editable when `interactive`.    */
/* ------------------------------------------------------------------ */

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { DeckTheme } from "../lib/themes";
import { SlideData, Stat, wordCount } from "../lib/types";

const W = 960;
const H = 540;

export interface SlideCardProps {
  slide: SlideData;
  deckTitle: string;
  theme: DeckTheme;
  width: number;
  interactive?: boolean;
  onPatch?: (patch: Partial<SlideData>) => void;
  toolbar?: ReactNode;
  showNumber?: boolean;
  className?: string;
}

/* ------------------------------ inline edit ------------------------------ */

function InlineText({
  value,
  onCommit,
  editable,
  multiline = false,
  rows = 2,
  className = "",
  placeholder = "Click to edit",
}: {
  value: string;
  onCommit: (v: string) => void;
  editable: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v && v !== value) onCommit(v);
    else setDraft(value);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    } else if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
    }
  };

  if (!editable) {
    return <span className={className}>{value || placeholder}</span>;
  }
  if (!editing) {
    return (
      <span
        className={`inline-edit ${className} ${value ? "" : "opacity-50 italic"}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
          requestAnimationFrame(() => {
            (ref.current ?? areaRef.current)?.focus();
            (ref.current ?? areaRef.current)?.select?.();
          });
        }}
        title="Click to edit"
      >
        {value || placeholder}
      </span>
    );
  }
  const cls = `w-full min-w-0 bg-transparent outline-none ${className}`;
  const glow = { boxShadow: "0 0 0 2px var(--ring)" } as CSSProperties;
  return multiline ? (
    <textarea
      ref={areaRef}
      value={draft}
      rows={rows}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={keys}
      className={`${cls} resize-none`}
      style={glow}
    />
  ) : (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={keys}
      className={cls}
      style={glow}
    />
  );
}

/* ------------------------------ bullet row ------------------------------ */

function BulletRow({
  text,
  index,
  editable,
  fontSize,
  onEdit,
  onRemove,
}: {
  text: string;
  index: number;
  editable: boolean;
  fontSize: number;
  onEdit: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <li className="group flex items-start gap-4" style={{ fontSize }}>
      <span
        className="mt-[0.62em] h-[9px] w-[9px] shrink-0 rounded-[2.5px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="min-w-0 flex-1">
        <InlineText value={text} editable={editable} onCommit={onEdit} />
      </div>
      {editable && (
        <button
          onClick={onRemove}
          className="-mr-2 mt-[0.35em] rounded p-1 opacity-0 transition-opacity hover:text-[var(--ember,#cf4a2b)] group-hover:opacity-70"
          title="Remove point"
          aria-label={`Remove point ${index + 1}`}
          style={{ color: "var(--muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </li>
  );
}

function BulletList({
  slide,
  editable,
  fontSize,
  onPatch,
}: {
  slide: SlideData;
  editable: boolean;
  fontSize: number;
  onPatch?: (p: Partial<SlideData>) => void;
}) {
  const set = (bullets: string[]) => onPatch?.({ bullets });
  return (
    <ul className="space-y-[18px]">
      {slide.bullets.map((b, i) => (
        <BulletRow
          key={i}
          index={i}
          text={b}
          editable={editable}
          fontSize={fontSize}
          onEdit={(v) => set(slide.bullets.map((x, j) => (j === i ? v : x)))}
          onRemove={() => set(slide.bullets.filter((_, j) => j !== i))}
        />
      ))}
      {editable && slide.bullets.length < 6 && (
        <li>
          <button
            onClick={() => set([...slide.bullets, "New point"])}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[14px] font-medium opacity-45 transition-opacity hover:opacity-100"
            style={{ color: "var(--accent)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add point
          </button>
        </li>
      )}
    </ul>
  );
}

/* ------------------------------ stat cards ------------------------------ */

function StatBlock({
  stats,
  editable,
  onPatch,
}: {
  stats: Stat[];
  editable: boolean;
  onPatch?: (p: Partial<SlideData>) => void;
}) {
  const set = (stats: Stat[]) => onPatch?.({ stats });
  return (
    <div className="flex gap-6">
      {stats.slice(0, 3).map((st, i) => (
        <div
          key={i}
          className="relative flex-1 overflow-hidden rounded-xl px-7 pb-6 pt-8"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <span className="absolute left-0 top-0 h-[4px] w-full" style={{ background: "var(--accent)" }} />
          <div className="font-display text-[42px] font-extrabold leading-none tracking-tight" style={{ color: "var(--accent)" }}>
            <InlineText
              value={st.value}
              editable={editable}
              onCommit={(v) => set(stats.map((x, j) => (j === i ? { ...x, value: v } : x)))}
            />
          </div>
          <div className="mt-3 text-[15px] leading-snug" style={{ color: "var(--muted)" }}>
            <InlineText
              value={st.label}
              editable={editable}
              onCommit={(v) => set(stats.map((x, j) => (j === i ? { ...x, label: v } : x)))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ the card ------------------------------ */

function Watermark({ color }: { color: string }) {
  return (
    <svg
      className="pointer-events-none absolute -bottom-16 -right-10"
      width="340"
      height="340"
      viewBox="0 0 24 24"
      fill={color}
      opacity="0.07"
    >
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10.5h-6.5L13 2Z" />
    </svg>
  );
}

export default function SlideCard({
  slide,
  deckTitle,
  theme,
  width,
  interactive = false,
  onPatch,
  toolbar,
  showNumber = true,
  className = "",
}: SlideCardProps) {
  const scale = width / W;
  const vars = {
    "--surface": theme.surface,
    "--muted": theme.muted,
    "--accent": theme.accent,
    "--accent2": theme.accent2,
    "--line": theme.line,
    "--hov": theme.mode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(20,35,32,0.07)",
    "--ring": `color-mix(in srgb, ${theme.accent} 50%, transparent)`,
    background: theme.bg,
    color: theme.ink,
  } as CSSProperties;

  const patch = (p: Partial<SlideData>) => onPatch?.(p);
  const bulletSize = slide.bullets.length > 4 ? 18 : 21;

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ width, height: Math.round(width * 0.5625), boxShadow: "var(--shadow-card)", ...vars }}
    >
      <div
        className="absolute left-0 top-0"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        {/* ---------- title ---------- */}
        {slide.layout === "title" && (
          <div className="relative flex h-full flex-col justify-center px-[72px]">
            <Watermark color={theme.accent} />
            <div
              className="mb-5 truncate text-[13px] font-bold uppercase tracking-[0.32em]"
              style={{ color: theme.accent }}
            >
              {deckTitle}
            </div>
            <div className="font-display text-[54px] font-extrabold leading-[1.06] tracking-tight">
              <InlineText value={slide.title} editable={interactive} onCommit={(v) => patch({ title: v })} />
            </div>
            <div className="mt-6 max-w-[720px] text-[20px] leading-relaxed" style={{ color: theme.muted }}>
              <InlineText value={slide.subtitle ?? ""} editable={interactive} onCommit={(v) => patch({ subtitle: v })} />
            </div>
            <span className="mt-9 h-[5px] w-[76px] rounded-full" style={{ background: theme.accent }} />
          </div>
        )}

        {/* ---------- quote ---------- */}
        {slide.layout === "quote" && (
          <div className="relative flex h-full flex-col justify-center px-[80px]">
            <div
              className="font-display absolute left-[44px] top-[54px] text-[150px] font-extrabold leading-none"
              style={{ color: theme.accent, opacity: 0.32 }}
            >
              “
            </div>
            <div className="relative text-[30px] font-medium italic leading-[1.4]">
              <InlineText
                value={slide.quote?.text ?? ""}
                editable={interactive}
                multiline
                rows={3}
                onCommit={(v) => patch({ quote: { text: v, attribution: slide.quote?.attribution ?? "" } })}
                placeholder="Add a quote…"
              />
            </div>
            <div className="mt-7 flex items-center gap-3 text-[16px]" style={{ color: theme.muted }}>
              <span className="h-[3px] w-[36px] rounded-full" style={{ background: theme.accent }} />
              <InlineText
                value={slide.quote?.attribution ?? ""}
                editable={interactive}
                onCommit={(v) => patch({ quote: { text: slide.quote?.text ?? "", attribution: v } })}
                placeholder="Attribution"
              />
            </div>
          </div>
        )}

        {/* ---------- stats ---------- */}
        {slide.layout === "stats" && (
          <div className="flex h-full flex-col px-[72px] pt-[64px]">
            <CardHeader slide={slide} deckTitle={deckTitle} theme={theme} interactive={interactive} onPatch={onPatch} />
            <div className="mt-10">
              <StatBlock stats={slide.stats ?? []} editable={interactive} onPatch={onPatch} />
            </div>
            {slide.bullets.length > 0 && (
              <div className="mt-8 text-[16px]" style={{ color: theme.muted }}>
                <InlineText value={slide.bullets[0]} editable={interactive} onCommit={(v) => patch({ bullets: [v, ...slide.bullets.slice(1)] })} />
              </div>
            )}
          </div>
        )}

        {/* ---------- two column ---------- */}
        {slide.layout === "two_col" && (
          <div className="flex h-full flex-col px-[72px] pt-[64px]">
            <CardHeader slide={slide} deckTitle={deckTitle} theme={theme} interactive={interactive} onPatch={onPatch} />
            <div className="mt-8 grid flex-1 grid-cols-2 gap-12">
              {[0, 1].map((col) => {
                const half = Math.ceil(slide.bullets.length / 2);
                const items = col === 0 ? slide.bullets.slice(0, half) : slide.bullets.slice(half);
                const offset = col === 0 ? 0 : half;
                return (
                  <ul key={col} className="space-y-4">
                    {items.map((b, i) => (
                      <BulletRow
                        key={i}
                        index={offset + i}
                        text={b}
                        editable={interactive}
                        fontSize={18}
                        onEdit={(v) => patch({ bullets: slide.bullets.map((x, j) => (j === offset + i ? v : x)) })}
                        onRemove={() => patch({ bullets: slide.bullets.filter((_, j) => j !== offset + i) })}
                      />
                    ))}
                  </ul>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------- closing ---------- */}
        {slide.layout === "closing" && (
          <div className="relative flex h-full flex-col items-center justify-center px-[90px] text-center">
            <Watermark color={theme.accent} />
            <div className="font-display relative text-[42px] font-extrabold leading-tight tracking-tight">
              <InlineText value={slide.title} editable={interactive} onCommit={(v) => patch({ title: v })} />
            </div>
            <span className="relative mt-5 h-[4px] w-[64px] rounded-full" style={{ background: theme.accent }} />
            {slide.bullets.length > 0 && (
              <ul className="relative mt-8 space-y-3.5">
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex items-center justify-center gap-3 text-[18px]">
                    <span className="h-[7px] w-[7px] rotate-45 rounded-[2px]" style={{ background: theme.accent }} />
                    <InlineText
                      value={b}
                      editable={interactive}
                      onCommit={(v) => patch({ bullets: slide.bullets.map((x, j) => (j === i ? v : x)) })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ---------- bullets (default) ---------- */}
        {(slide.layout === "bullets" || !["title", "quote", "stats", "two_col", "closing"].includes(slide.layout)) && (
          <div className="flex h-full flex-col px-[72px] pt-[64px]">
            <CardHeader slide={slide} deckTitle={deckTitle} theme={theme} interactive={interactive} onPatch={onPatch} />
            <div className="mt-8">
              <BulletList slide={slide} editable={interactive} fontSize={bulletSize} onPatch={onPatch} />
            </div>
          </div>
        )}

        {/* ---------- slide footer ---------- */}
        <div
          className="absolute bottom-[22px] left-[72px] right-[72px] flex items-center justify-between gap-3 text-[12px]"
          style={{ color: theme.muted, opacity: 0.85 }}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{deckTitle}</span>
            <span className="opacity-50">·</span>
            <span className="shrink-0 font-mono text-[10.5px]">
              {wordCount([slide.title, ...(slide.bullets ?? [])].join(" "))} words
            </span>
          </span>
          {showNumber && (
            <span className="shrink-0 font-mono">{String(slide.slide_number).padStart(2, "0")}</span>
          )}
        </div>
      </div>

      {toolbar}
    </div>
  );
}

function CardHeader({
  slide,
  deckTitle,
  theme,
  interactive,
  onPatch,
}: {
  slide: SlideData;
  deckTitle: string;
  theme: DeckTheme;
  interactive: boolean;
  onPatch?: (p: Partial<SlideData>) => void;
}) {
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-[0.28em]" style={{ color: theme.accent }}>
        {deckTitle}
      </div>
      <div className="font-display mt-3 text-[33px] font-bold leading-tight tracking-tight">
        <InlineText value={slide.title} editable={interactive} onCommit={(v) => onPatch?.({ title: v })} />
      </div>
      <span className="mt-4 block h-[4px] w-[46px] rounded-full" style={{ background: theme.accent }} />
    </div>
  );
}
