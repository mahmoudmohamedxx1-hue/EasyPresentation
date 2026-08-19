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
