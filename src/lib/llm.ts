/* ------------------------------------------------------------------ */
/*  LLM routing — any OpenAI-compatible chat completions endpoint      */
/*  (OpenAI, Qwen DashScope compatible mode, local Ollama, Groq, …).   */
/*  The system prompt is the same contract the FastAPI ai_service.py   */
/*  uses, so both runtimes produce identical slide JSON.               */
/* ------------------------------------------------------------------ */

import { Deck, EngineSettings, LayoutKind, SlideData, uid } from "./types";

export const SYSTEM_PROMPT = `You are the SlideForge slide engine. You digest long-form source text (lecture outlines, reports, raw notes) and convert it into a presentation structure.

Rules:
1. Read the ENTIRE source before writing anything.
2. Produce 6 to 12 slides total. The FIRST slide uses design_layout "title": its title is the deck title and subtitle is one short line describing the deck.
3. Every other slide uses one of: "bullets", "two_col", "quote", "stats", "closing". Use "closing" exactly once, as the final slide.
4. Each slide has at most 5 bullet_points. Every bullet is 12 words or fewer, sentence case, no trailing period. Bullets must be faithful to the source — never invent facts.
5. "stats" slides fill the "stats" array with 2-3 items of the form {"value": "...", "label": "..."} using numbers quoted verbatim from the source.
6. "quote" slides fill "quote" with {"text": "...", "attribution": "..."}.
7. Titles are 8 words or fewer and use the source's own section names when possible.
8. speaker_notes is 1-2 sentences a presenter could read aloud.

Respond with ONLY valid JSON — no markdown fences, no commentary — matching this exact schema:
{"deck_title": "...", "slides": [{"slide_number": 1, "title": "...", "subtitle": "...", "bullet_points": ["..."], "design_layout": "title", "stats": [{"value": "...", "label": "..."}], "quote": {"text": "...", "attribution": "..."}, "speaker_notes": "..."}]}`;

const LAYOUT_WHITELIST: LayoutKind[] = ["title", "bullets", "two_col", "quote", "stats", "closing"];
const MAX_SOURCE_CHARS = 14_000;

export async function generateWithLLM(
  text: string,
  sourceName: string,
  settings: EngineSettings
): Promise<Deck> {
  const base = settings.baseUrl.trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 2600,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Source document: ${sourceName || "pasted text"}\n` +
            `Target slide count: ${settings.targetSlides === "auto" ? "8" : settings.targetSlides}\n\n` +
            `Source text:\n"""\n${text.slice(0, MAX_SOURCE_CHARS)}\n"""`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `The model endpoint answered ${res.status} ${res.statusText}. ` +
        (detail ? detail.slice(0, 160) : "Check the base URL, model name and API key.")
    );
  }

  const data = await res.json().catch(() => null);
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("The model returned an empty response.");

  const parsed = parseDeckJson(content);
  return normalizeDeck(parsed, sourceName);
}

/** Tolerant JSON extraction: strips code fences, finds the outermost braces. */
export function parseDeckJson(raw: string): Record<string, unknown> {
  const stripped = raw
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  const arrStart = stripped.indexOf("[");
  const arrEnd = stripped.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return { slides: JSON.parse(stripped.slice(arrStart, arrEnd + 1)) } as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  throw new Error("The model returned malformed JSON — falling back.");
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}

function normalizeDeck(raw: Record<string, unknown>, sourceName: string): Deck {
  const rawSlides = Array.isArray(raw.slides)
    ? (raw.slides as unknown[])
    : Array.isArray(raw)
      ? (raw as unknown as unknown[])
      : [];
  if (!rawSlides.length) throw new Error("The model returned no slides — falling back.");

  const slides: SlideData[] = rawSlides.map((item, i) => {
    const s = (item ?? {}) as Record<string, unknown>;
    const bullets = (Array.isArray(s.bullet_points) ? s.bullet_points : Array.isArray(s.bullets) ? s.bullets : [])
      .map((b) => asString(b))
      .filter(Boolean)
      .slice(0, 6);
    const layoutRaw = asString(s.design_layout ?? s.layout, "bullets");
    const layout: LayoutKind = (LAYOUT_WHITELIST as string[]).includes(layoutRaw)
      ? (layoutRaw as LayoutKind)
      : "bullets";
    const stats = Array.isArray(s.stats)
      ? s.stats
          .map((st) => ({
            value: asString((st as Record<string, unknown>)?.value),
            label: asString((st as Record<string, unknown>)?.label),
          }))
          .filter((st) => st.value)
          .slice(0, 3)
      : undefined;
    const quoteRaw = (s.quote ?? null) as Record<string, unknown> | null;
    const quote =
      quoteRaw && asString(quoteRaw.text)
        ? { text: asString(quoteRaw.text), attribution: asString(quoteRaw.attribution) }
        : undefined;
    return {
      id: uid(),
      slide_number: i + 1,
      title: asString(s.title) || `Slide ${i + 1}`,
      subtitle: asString(s.subtitle) || undefined,
      bullets,
      layout,
      stats: stats?.length ? stats : undefined,
      quote,
      notes: asString(s.speaker_notes ?? s.notes),
    };
  });

  return {
    title: asString(raw.deck_title) || slides[0].title || sourceName || "Untitled deck",
    themeId: "signal",
    slides,
  };
}
