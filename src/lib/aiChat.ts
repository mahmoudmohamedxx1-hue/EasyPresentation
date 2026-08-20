/* ------------------------------------------------------------------ */
/*  Edit-with-AI: natural-language deck editing, Gamma style.          */
/*  Deterministic transforms applied locally; falls back gracefully.   */
/* ------------------------------------------------------------------ */

import { Deck, SlideData, uid } from "./types";
import { THEMES } from "./themes";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface ApplyResult {
  deck: Deck;
  reply: string;
  selectId?: string;
}

function renumber(deck: Deck): Deck {
  return { ...deck, slides: deck.slides.map((s, i) => ({ ...s, slide_number: i + 1 })) };
}

function clip(s: string, n: number): string {
  const w = s.trim().split(/\s+/);
  if (w.length <= n) return s.trim();
  return w.slice(0, n).join(" ").replace(/[,;:.\-—]+$/, "") + "…";
}

function firstSentences(notes: string, existing: string[], max: number): string[] {
  const found: string[] = [];
  const sentences = notes.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (s.length < 30 || s.length > 180) continue;
    if (existing.some((e) => e.toLowerCase().includes(s.slice(0, 24).toLowerCase()))) continue;
    found.push(clip(s, 18));
    if (found.length >= max) break;
  }
  return found;
}

export function applyInstruction(
  deck: Deck,
  selectedId: string | null,
  raw: string
): ApplyResult {
  const text = raw.trim().toLowerCase();
  const slides = deck.slides;
  const selIdx = selectedId ? slides.findIndex((s) => s.id === selectedId) : -1;
  const sel = selIdx >= 0 ? slides[selIdx] : null;

  /* ---- theme switch ---- */
  const themeHit = THEMES.find((t) => text.includes(t.name.toLowerCase()));
  if (themeHit && /(theme|look|style|dark|light|palette)/.test(text)) {
    return {
      deck: { ...deck, themeId: themeHit.id },
      reply: `Done — the whole deck now uses the ${themeHit.name} theme (${themeHit.mood}).`,
    };
  }
  if (/(dark|light) (theme|mode|look)/.test(text)) {
    const mode = text.includes("dark") ? "dark" : "light";
    const hit = THEMES.find((t) => t.mode === mode);
    if (hit)
      return {
        deck: { ...deck, themeId: hit.id },
        reply: `Switched to ${hit.name}, a ${mode} theme.`,
      };
  }

  /* ---- add card ---- */
  if (/(add|new|insert).{0,20}(card|slide)/.test(text)) {
    const about = raw.match(/(?:about|on|for|titled)\s+([^.!?]{3,60})/i);
    const title = about
      ? about[1].trim().replace(/^["“']|["”']$/g, "")
      : "New card";
    const notes = sel?.notes ?? "";
    const bullets =
      firstSentences(notes, [], 3).length > 0
        ? firstSentences(notes, [], 3)
        : [
            "Open with the point, not the preamble",
            `Tie this back to the main thread of the deck`,
            "End with the implication for the audience",
          ];
    const fresh: SlideData = {
      id: uid(),
      slide_number: 0,
      layout: "bullets",
      title: title.charAt(0).toUpperCase() + title.slice(1),
      bullets,
      notes: "",
    };
    const at = selIdx >= 0 ? selIdx + 1 : slides.length;
    const next = [...slides.slice(0, at), fresh, ...slides.slice(at)];
    return {
      deck: renumber({ ...deck, slides: next }),
      reply: `Added "${fresh.title}" after ${sel ? `card ${selIdx + 1}` : "the end"} — bullets are editable.`,
      selectId: fresh.id,
    };
  }

  /* ---- delete card ---- */
  if (/(delete|remove).{0,16}(card|slide)/.test(text)) {
    if (!sel || slides.length <= 2)
      return {
        deck,
        reply: !sel
          ? "Select a card first — click it in the canvas or the rail on the left."
          : "A deck needs at least two cards, so I kept this one.",
      };
    const next = slides.filter((s) => s.id !== sel.id);
    const pick = next[Math.min(selIdx, next.length - 1)];
    return {
      deck: renumber({ ...deck, slides: next }),
      reply: `Deleted card ${selIdx + 1} ("${sel.title}").`,
      selectId: pick?.id,
    };
  }

  /* ---- shorten / longer ---- */
  if (/(shorten|concise|tighten|crisper|brief)/.test(text)) {
    const target = sel ? [sel] : slides;
    const next = slides.map((s) =>
      target.includes(s) && s.bullets.length
        ? { ...s, bullets: s.bullets.map((b) => clip(b, 8)) }
        : s
    );
    return {
      deck: { ...deck, slides: next },
      reply: sel
        ? "Shortened the bullets on the selected card to ≤ 8 words each."
        : `Shortened bullets across all ${slides.length} cards.`,
    };
  }
  if (/(expand|longer|more detail|elaborate|flesh)/.test(text)) {
    const target = sel ? [sel] : slides.filter((s) => s.notes);
    let added = 0;
    const next = slides.map((s) => {
      if (!target.includes(s) || !s.notes) return s;
      const extra = firstSentences(s.notes, s.bullets, 2);
      added += extra.length;
      return extra.length ? { ...s, bullets: [...s.bullets, ...extra].slice(0, 6) } : s;
    });
    return {
      deck: { ...deck, slides: next },
      reply: added
        ? `Expanded ${target.length === 1 ? "the card" : "cards"} with ${added} point${added > 1 ? "s" : ""} pulled from the source notes.`
        : "No extra source material was stored on that card to expand from.",
    };
  }

  /* ---- tone ---- */
  const weaken = /\b(this means that|it is important to note that|essentially|basically|in order to|due to the fact that)\s+/gi;
  if (/(punchy|punchier|crisp|stronger)/.test(text)) {
    const next = slides.map((s) =>
      s.bullets.length
        ? { ...s, bullets: s.bullets.map((b) => clip(b.replace(weaken, ""), 9)) }
        : s
    );
    return { deck: { ...deck, slides: next }, reply: "Tightened the deck — cut filler words, kept verbs up front." };
  }
  if (/(professional|formal)/.test(text)) {
    const next = slides.map((s) =>
      s.bullets.length
        ? {
            ...s,
            bullets: s.bullets.map((b) =>
              b
                .replace(/\bdon't\b/gi, "do not")
                .replace(/\bcan't\b/gi, "cannot")
                .replace(/\bwon't\b/gi, "will not")
                .replace(/\bit's\b/gi, "it is")
                .replace(/!+/g, ".")
            ),
          }
        : s
    );
    return { deck: { ...deck, slides: next }, reply: "Applied a more formal register across all bullets." };
  }
  if (/(casual|friendly|conversational)/.test(text)) {
    const next = slides.map((s) =>
      s.bullets.length
        ? {
            ...s,
            bullets: s.bullets.map((b) =>
              b.replace(/\bdo not\b/gi, "don't").replace(/\bcannot\b/gi, "can't").replace(/\bit is\b/gi, "it's")
            ),
          }
        : s
    );
    return { deck: { ...deck, slides: next }, reply: "Loosened the tone — contractions in, stiffness out." };
  }

  /* ---- titles ---- */
  if (/title/.test(text) && /(short|tight|punch)/.test(text)) {
    const next = slides.map((s) => (s.layout === "title" ? s : { ...s, title: clip(s.title, 5) }));
    return { deck: { ...deck, slides: next }, reply: "Trimmed every card title to five words or fewer." };
  }

  /* ---- polish fallback ---- */
  let changes = 0;
  const next = slides.map((s) => {
    if (!s.bullets.length) return s;
    const seen = new Set<string>();
    const bullets = s.bullets
      .map((b) => b.replace(weaken, "").replace(/\s+/g, " ").trim())
      .filter((b) => {
        const key = b.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (bullets.length !== s.bullets.length) changes++;
    return { ...s, bullets };
  });
  return {
    deck: { ...deck, slides: next },
    reply: changes
      ? `Polished the deck — removed filler and duplicates on ${changes} card${changes > 1 ? "s" : ""}. Try "shorten bullets", "add a card about …", or "switch theme to Ember".`
      : `I polished the deck but found nothing to change. Try: "shorten bullets", "add a card about risks", "make it more formal", or "use the Ember theme".`,
  };
}

export const QUICK_ACTIONS = [
  "Shorten bullets",
  "Make it more formal",
  "Add a card about risks",
  "Switch theme to Ember",
  "Punchier titles",
];
