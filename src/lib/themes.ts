/* ------------------------------------------------------------------ */
/*  Deck themes. Each theme styles the live preview through CSS vars   */
/*  and maps onto concrete pptxgenjs colors for the .pptx export.      */
/* ------------------------------------------------------------------ */

export interface DeckTheme {
  id: string;
  name: string;
  mood: string;
  mode: "dark" | "light";
  /** slide background */
  bg: string;
  /** raised surface inside the slide (chips, stat cards) */
  surface: string;
  /** primary text */
  ink: string;
  /** secondary text */
  muted: string;
  /** primary accent */
  accent: string;
  /** secondary accent */
  accent2: string;
  /** hairline / rule color */
  line: string;
  displayFont: string;
  bodyFont: string;
  pptx: {
    bg: string;
    title: string;
    body: string;
    accent: string;
    muted: string;
    displayFont: string;
    bodyFont: string;
  };
}

const hex = (s: string) => s.replace("#", "");

function theme(t: Omit<DeckTheme, "pptx">): DeckTheme {
  return {
    ...t,
    pptx: {
      bg: hex(t.bg),
      title: hex(t.ink),
      body: hex(t.ink),
      accent: hex(t.accent),
      muted: hex(t.muted),
      displayFont: "Trebuchet MS",
      bodyFont: "Calibri",
    },
  };
}

export const THEMES: DeckTheme[] = [
  theme({
    id: "signal",
    name: "Signal",
    mood: "Deep pine · mint · amber",
    mode: "dark",
    bg: "#10211d",
    surface: "#18322c",
    ink: "#eaf4f0",
    muted: "#9cb8b0",
    accent: "#2fd4b5",
    accent2: "#f2a93b",
    line: "rgba(234,244,240,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
  theme({
    id: "harbor",
    name: "Harbor",
    mood: "Cool paper · cobalt",
    mode: "light",
    bg: "#f3f7fc",
    surface: "#ffffff",
    ink: "#14263f",
    muted: "#5a6e88",
    accent: "#1d5bd6",
    accent2: "#f2a93b",
    line: "rgba(20,38,63,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
  theme({
    id: "ledger",
    name: "Ledger",
    mood: "Warm white · moss",
    mode: "light",
    bg: "#f7f7f2",
    surface: "#ffffff",
    ink: "#1d2321",
    muted: "#67716b",
    accent: "#0e8577",
    accent2: "#b97c14",
    line: "rgba(29,35,33,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
  theme({
    id: "ember",
    name: "Ember",
    mood: "Charred oak · gold",
    mode: "dark",
    bg: "#1e1410",
    surface: "#2c1e16",
    ink: "#f5ebe2",
    muted: "#b39b8a",
    accent: "#ffb43a",
    accent2: "#ff7847",
    line: "rgba(245,235,226,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
  theme({
    id: "noir",
    name: "Noir",
    mood: "Graphite · amber + mint",
    mode: "dark",
    bg: "#15171b",
    surface: "#21252b",
    ink: "#edf0f4",
    muted: "#98a0ab",
    accent: "#f2a93b",
    accent2: "#2fd4b5",
    line: "rgba(237,240,244,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
  theme({
    id: "frost",
    name: "Frost",
    mood: "Cool mist · burnt orange",
    mode: "light",
    bg: "#f2f5f4",
    surface: "#ffffff",
    ink: "#17242b",
    muted: "#5c6f78",
    accent: "#dd7525",
    accent2: "#0e8577",
    line: "rgba(23,36,43,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
  theme({
    id: "deepsea",
    name: "Deep Sea",
    mood: "Abyss navy · cyan + coral",
    mode: "dark",
    bg: "#0c1e2e",
    surface: "#13293d",
    ink: "#e8f1f7",
    muted: "#8fa9bc",
    accent: "#4cc9f0",
    accent2: "#f4845f",
    line: "rgba(232,241,247,0.14)",
    displayFont: "Sora",
    bodyFont: "Instrument Sans",
  }),
];

export function getTheme(id: string): DeckTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
