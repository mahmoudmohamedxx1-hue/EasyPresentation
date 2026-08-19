/* ------------------------------------------------------------------ */
/*  Shared data contracts between the engine, the preview and export.  */
/* ------------------------------------------------------------------ */

export type LayoutKind =
  | "title"
  | "bullets"
  | "two_col"
  | "quote"
  | "stats"
  | "closing";

export interface Stat {
  value: string;
  label: string;
}

export interface SlideQuote {
  text: string;
  attribution: string;
}

export interface SlideData {
  id: string;
  slide_number: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  layout: LayoutKind;
  stats?: Stat[];
  quote?: SlideQuote;
  notes: string;
}

export interface Deck {
  title: string;
  slides: SlideData[];
  themeId: string;
}

export type EngineKind = "local" | "llm";

export interface EngineSettings {
  engine: EngineKind;
  apiKey: string;
  baseUrl: string;
  model: string;
  targetSlides: number | "auto";
}

export interface PipelineStage {
  label: string;
  done: boolean;
}

export const LAYOUTS: { id: LayoutKind; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "bullets", label: "Bullets" },
  { id: "two_col", label: "Two-col" },
  { id: "quote", label: "Quote" },
  { id: "stats", label: "Stats" },
  { id: "closing", label: "Closing" },
];

/** When switching a card to stats/quote, seed editable content so it never renders empty. */
export function seedLayoutPatch(slide: SlideData, layout: LayoutKind): Partial<SlideData> {
  const patch: Partial<SlideData> = { layout };
  if (layout === "stats" && (!slide.stats || slide.stats.length === 0)) {
    patch.stats = [
      { value: "42%", label: "headline number — click to edit" },
      { value: "3×", label: "supporting metric — click to edit" },
    ];
  }
  if (layout === "quote" && !slide.quote?.text) {
    patch.quote = {
      text: slide.bullets[0] ?? "A line worth remembering",
      attribution: slide.quote?.attribution ?? "",
    };
  }
  return patch;
}

export const DEFAULT_SETTINGS: EngineSettings = {
  engine: "local",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  targetSlides: "auto",
};

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
}

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export function renumber(deck: Deck): Deck {
  return {
    ...deck,
    slides: deck.slides.map((s, i) => ({ ...s, slide_number: i + 1 })),
  };
}
