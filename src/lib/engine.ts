/* ------------------------------------------------------------------ */
/*  The local Slide Engine.                                            */
/*  A deterministic heuristic that mirrors what the LLM system prompt  */
/*  asks for: sections → titles, condensed bullets, layout choices,    */
/*  stat + quote detection — all without a network call.               */
/* ------------------------------------------------------------------ */

import { Deck, LayoutKind, SlideData, SlideQuote, Stat, uid, wordCount } from "./types";

const CONNECTIVES =
  /^(however|moreover|furthermore|additionally|in addition|therefore|thus|hence|also|meanwhile|nonetheless|consequently|as a result|in other words)[,\s]+/i;

const CLOSING_HINT = /(takeaway|summary|conclusion|recap|wrap[- ]?up|key points|final)/i;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function clipWords(s: string, n: number): string {
  const words = clean(s).split(" ");
  if (words.length <= n) return words.join(" ");
  return words.slice(0, n).join(" ").replace(/[,;:.\-—]+$/, "") + "…";
}

function stripBulletEnd(s: string): string {
  return clean(s).replace(/[.。]+$/, "");
}

function splitSentences(paragraph: string): string[] {
  const matches = paragraph.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) ?? [];
  return matches.map(clean).filter(Boolean);
}

/* ------------------------------ sections ------------------------------ */

interface Section {
  heading: string;
  body: string[];
}

function isHeading(line: string, next: string | undefined): boolean {
  const t = line.trim();
  if (!t || t.length < 3 || t.length > 72) return false;
  if (/^#{1,4}\s+\S/.test(t)) return true; // markdown
  if (/^\d{1,2}(\.\d{1,2})*[.)]?\s+[A-Z«"']/.test(t)) return true; // "1.2 Topic"
  if (t.length <= 48 && t === t.toUpperCase() && /[A-Z]{3,}/.test(t) && !/\d{3,}/.test(t))
    return true; // CAPS HEADINGS
  if (t.length <= 60 && /[a-zA-Z][:…]$/.test(t)) return true; // "Agenda:"
  if (t.length <= 56 && !/[.!?,;:]$/.test(t) && next && next.trim().length > 90) return true;
  return false;
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function stripHeading(t: string): string {
  const stripped = clean(
    t
      .replace(/^#{1,4}\s+/, "")
      .replace(/^\d{1,2}(\.\d{1,2})*[.)]?\s+/, "")
      .replace(/[:…]+$/, "")
  );
  // ALL-CAPS headings read better title-cased ("KEY TAKEAWAYS" → "Key Takeaways")
  if (
    stripped.length >= 10 &&
    stripped.split(" ").length >= 2 &&
    stripped === stripped.toUpperCase() &&
    /[A-Z]{3}/.test(stripped)
  ) {
    return toTitleCase(stripped);
  }
  return stripped;
}

interface ParsedDoc {
  sections: Section[];
  docTitle: string | null;
}

function parseSections(text: string): ParsedDoc {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  let docTitle: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const h1 = line.trim().match(/^#\s+(.+)/);
    if (h1 && !docTitle) {
      docTitle = stripHeading(h1[1]); // markdown H1 = deck title, body flows into intro
      current = null;
      continue;
    }
    const next = lines.slice(i + 1).find((l) => l.trim());
    if (isHeading(line, next)) {
      current = { heading: stripHeading(line), body: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { heading: "", body: [] };
        sections.push(current);
      }
      current.body.push(clean(line));
    }
  }
  return { sections: sections.filter((s) => s.heading || s.body.length), docTitle };
}

/* ---------------------------- bullet mining ---------------------------- */

interface Candidate {
  text: string;
  score: number;
  order: number;
  firstInParagraph: boolean;
}

export function extractBullets(body: string[], max = 5): string[] {
  const candidates: Candidate[] = [];
  body.forEach((para) => {
    const sentences = splitSentences(para);
    sentences.forEach((sentence, idx) => {
      let score = 0;
      const len = sentence.length;
      if (len >= 40 && len <= 170) score += 3;
      else if ((len >= 24 && len < 40) || (len > 170 && len <= 230)) score += 1;
      else if (len < 24) score -= 2.5;
      if (idx === 0) score += 2;
      if (/\d/.test(sentence)) score += 1.4;
      if (/\b(key|core|means|shows|leads|because|result|impact|benefit|risk|step|turns|most|first)\b/i.test(sentence))
        score += 1;
      if (CONNECTIVES.test(sentence)) score -= 1.5;
      candidates.push({ text: sentence, score, order: candidates.length, firstInParagraph: idx === 0 });
    });
  });

  let picked = candidates
    .filter((c) => c.text.length >= 24)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .sort((a, b) => a.order - b.order)
    .map((c) => polishBullet(c.text));

  if (picked.length < 2) {
    picked = body.slice(0, max).map((p) => clipWords(p, 18));
  }
  return picked.filter(Boolean).slice(0, max);
}

function polishBullet(s: string): string {
  let t = stripBulletEnd(s).replace(CONNECTIVES, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return clipWords(t, 20);
}

/* --------------------------- stats & quotes --------------------------- */

function extractStats(body: string[]): Stat[] {
  const joined = body.join(" ");
  const statRe =
    /(?:[$€£]\s?)?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|billion|million|trillion|[kKmMxX]\b|×)?/g;
  const found: Stat[] = [];
  let m: RegExpExecArray | null;
  while ((m = statRe.exec(joined)) !== null && found.length < 6) {
    const value = clean(m[0]);
    if (value.replace(/[^0-9]/g, "").length < 1) continue;
    const before = joined.slice(Math.max(0, m.index - 60), m.index).split(/\s+/).filter(Boolean);
    const after = joined
      .slice(m.index + value.length, m.index + value.length + 60)
      .split(/\s+/)
      .filter(Boolean);
    const labelWords = (after.slice(0, 4).join(" ").length > 6 ? after.slice(0, 4) : before.slice(-4)).join(" ");
    const label = clipWords(labelWords.replace(/^[,;:.\-—()\s]+/, ""), 6) || "metric";
    if (!found.some((f) => f.value === value)) found.push({ value, label });
  }
  // Lead with the strongest numbers (currency / percent / largest magnitude).
  const weight = (v: string) =>
    (v.includes("%") ? 2000 : 0) + (/\$|€|£/.test(v) ? 1000 : 0) + parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  return found.sort((a, b) => weight(b.value) - weight(a.value)).slice(0, 3);
}

function findQuote(body: string[]): { text: string; attribution: string } | null {
  const valid = (t: string) => t.length >= 20 && t.split(" ").length <= 40;
  for (const line of body) {
    // "quoted text" — attribution  (greedy inside the quotes so an em-dash
    // inside the quote does not split it)
    const quotedAttr = line.match(/^["“«'](.+)["”»']\s*[—–-]\s+(.+)$/);
    if (quotedAttr && valid(quotedAttr[1])) {
      return { text: clean(quotedAttr[1]), attribution: clean(quotedAttr[2]) };
    }
    // A fully quoted line with no attribution
    const quoted = line.match(/^["“«'](.+)["”»']$/);
    if (quoted && valid(quoted[1])) {
      return { text: clean(quoted[1]), attribution: "" };
    }
    // Unquoted pull-line with an em/en-dash attribution
    const dashAttr = line.match(/^(.+?)\s+[—–]\s+(.+)$/);
    if (dashAttr && valid(dashAttr[1]) && dashAttr[2].split(" ").length <= 10) {
      return { text: clean(dashAttr[1]), attribution: clean(dashAttr[2]) };
    }
  }
  return null;
}

/* ------------------------------ deck build ------------------------------ */

export function suggestedSlideCount(text: string): number {
  return clamp(Math.round(wordCount(text) / 75), 6, 13);
}

function sectionSize(s: Section): number {
  return s.body.join(" ").length;
}

function mergeSmallest(sections: Section[]): Section[] {
  let minIdx = 0;
  let minCost = Infinity;
  for (let i = 0; i < sections.length - 1; i++) {
    const cost = sectionSize(sections[i]) + sectionSize(sections[i + 1]);
    if (cost < minCost) {
      minCost = cost;
      minIdx = i;
    }
  }
  const a = sections[minIdx];
  const b = sections[minIdx + 1];
  const merged: Section = {
    heading: a.heading || b.heading,
    body: [...a.body, ...b.body],
  };
  return [...sections.slice(0, minIdx), merged, ...sections.slice(minIdx + 2)];
}

function splitLargest(sections: Section[]): Section[] {
  let maxIdx = 0;
  sections.forEach((s, i) => {
    if (sectionSize(s) > sectionSize(sections[maxIdx])) maxIdx = i;
  });
  const s = sections[maxIdx];
  if (s.body.length < 2) return sections;
  const mid = Math.ceil(s.body.length / 2);
  const first: Section = { heading: s.heading, body: s.body.slice(0, mid) };
  const second: Section = { heading: s.heading ? `${s.heading} — continued` : "Continued", body: s.body.slice(mid) };
  return [...sections.slice(0, maxIdx), first, second, ...sections.slice(maxIdx + 1)];
}

function makeSlide(partial: {
  layout: LayoutKind;
  title: string;
  subtitle?: string;
  bullets?: string[];
  stats?: Stat[];
  quote?: SlideQuote;
  notes?: string;
}): SlideData {
  return {
    id: uid(),
    slide_number: 0,
    bullets: [],
    notes: "",
    ...partial,
  };
}

export function buildDeckFromText(rawText: string, sourceName: string, target: number | "auto"): Deck {
  const text = clean(rawText.replace(/\n{3,}/g, "\n\n"));
  const parsed = parseSections(text);
  let sections = parsed.sections;
  if (!sections.length) sections = [{ heading: "", body: [text] }];

  const intro = sections.find((s) => !s.heading);
  const contentSections = sections.filter((s) => s.heading);

  const deckTitle =
    parsed.docTitle ||
    (intro && contentSections.length === 0 ? clipWords(intro.body.join(" "), 8) : "") ||
    contentSections[0]?.heading ||
    clipWords(text, 8) ||
    sourceName.replace(/\.[a-z0-9]+$/i, "") ||
    "Untitled deck";

  const total = target === "auto" ? suggestedSlideCount(text) : clamp(target, 4, 14);
  let needed = Math.max(1, total - 1); // minus the title slide

  let pool = contentSections.length ? [...contentSections] : [{ heading: "Overview", body: sections.flatMap((s) => s.body) }];
  while (pool.length > needed && pool.length > 1) pool = mergeSmallest(pool);
  while (pool.length < needed) {
    const before = pool.length;
    pool = splitLargest(pool);
    if (pool.length === before) break;
  }
  needed = pool.length;

  const slides: SlideData[] = [];
  slides.push(
    makeSlide({
      layout: "title",
      title: deckTitle,
      subtitle:
        clipWords((intro ? intro.body.join(" ") : pool[0]?.body[0]) ?? "", 24) ||
        (sourceName ? `Source: ${sourceName}` : "Generated with SlideForge"),
    })
  );

  pool.forEach((section) => {
    const bullets = extractBullets(section.body, 6);
    const quote = findQuote(section.body);
    const stats = extractStats(section.body);
    const notes = clipWords(section.body.join(" "), 60);

    let layout: LayoutKind = "bullets";
    if (CLOSING_HINT.test(section.heading)) layout = "closing";
    else if (quote && bullets.length <= 4) layout = "quote";
    else if (stats.length >= 2) layout = "stats";
    else if (bullets.length >= 6) layout = "two_col";

    slides.push(
      makeSlide({
        layout,
        title: section.heading || "Overview",
        bullets: layout === "quote" ? bullets.slice(0, 3) : bullets,
        quote: quote ?? undefined,
        stats: stats.length ? stats : undefined,
        notes,
      })
    );
  });

  // Guarantee a strong ending even if the source meanders.
  if (!slides.some((s) => s.layout === "closing")) {
    const takeaways = slides
      .slice(1)
      .filter((s) => s.bullets[0])
      .slice(0, 4)
      .map((s) => s.bullets[0]);
    if (takeaways.length >= 2) {
      slides.push(
        makeSlide({
          layout: "closing",
          title: "Key takeaways",
          bullets: takeaways,
          notes: "Closing slide assembled automatically — edit freely.",
        })
      );
    }
  }

  return {
    title: deckTitle,
    themeId: "signal",
    slides: slides.map((s, i) => ({ ...s, slide_number: i + 1 })),
  };
}
