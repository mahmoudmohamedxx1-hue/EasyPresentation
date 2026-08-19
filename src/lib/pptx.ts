/* ------------------------------------------------------------------ */
/*  .pptx compilation with pptxgenjs — the client-side twin of the     */
/*  python-pptx exporter in the backend blueprint.                     */
/* ------------------------------------------------------------------ */

import PptxGenJS from "pptxgenjs";
import { Deck, SlideData } from "./types";
import { getTheme } from "./themes";

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "deck"
  );
}

export async function exportDeckPptx(deck: Deck): Promise<void> {
  const t = getTheme(deck.themeId).pptx;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.title = deck.title;
  pptx.author = "SlideForge";

  const total = deck.slides.length;
  deck.slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    s.background = { color: t.bg };
    drawLayout(s, slide, deck.title, t);
    // persistent chrome: deck name + slide counter
    s.addText(deck.title, {
      x: 0.55, y: 7.02, w: 8, h: 0.3,
      fontSize: 9, color: t.muted, fontFace: t.bodyFont, align: "left",
    });
    s.addText(`${idx + 1} / ${total}`, {
      x: 11.9, y: 7.02, w: 0.9, h: 0.3,
      fontSize: 9, color: t.muted, fontFace: t.bodyFont, align: "right",
    });
  });

  await pptx.writeFile({ fileName: `${slug(deck.title)}.pptx` });
}

export function exportDeckJson(deck: Deck): void {
  const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(deck.title)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

type T = ReturnType<typeof getTheme>["pptx"];

function drawLayout(s: PptxGenJS.Slide, slide: SlideData, deckTitle: string, t: T): void {
  switch (slide.layout) {
    case "title": {
      s.addShape("rect", { x: 0, y: 0, w: 0.42, h: 7.5, fill: { color: t.accent } });
      s.addText(deckTitle.toUpperCase(), {
        x: 1.1, y: 1.7, w: 10.5, h: 0.4,
        fontSize: 12, bold: true, charSpacing: 4, color: t.accent, fontFace: t.bodyFont,
      });
      s.addText(slide.title, {
        x: 1.05, y: 2.25, w: 11, h: 2.4,
        fontSize: 42, bold: true, color: t.title, fontFace: t.displayFont, valign: "top",
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 1.1, y: 4.9, w: 10, h: 1.1,
          fontSize: 16, color: t.muted, fontFace: t.bodyFont,
        });
      }
      break;
    }
    case "quote": {
      s.addShape("rect", { x: 1.1, y: 2.35, w: 1.2, h: 0.14, fill: { color: t.accent } });
      s.addText(`“${slide.quote?.text ?? slide.bullets[0] ?? slide.title}”`, {
        x: 1.05, y: 2.75, w: 11.2, h: 2.6,
        fontSize: 27, italic: true, color: t.title, fontFace: t.displayFont, valign: "top",
      });
      if (slide.quote?.attribution) {
        s.addText(`— ${slide.quote.attribution}`, {
          x: 1.1, y: 5.5, w: 10, h: 0.5,
          fontSize: 14, color: t.muted, fontFace: t.bodyFont,
        });
      }
      break;
    }
    case "stats": {
      addHeader(s, deckTitle, slide.title, t);
      const stats = slide.stats ?? slide.bullets.slice(0, 3).map((b) => ({ value: b, label: "" }));
      stats.slice(0, 3).forEach((st, i) => {
        const x = 0.8 + i * 4.05;
        s.addShape("rect", { x, y: 2.6, w: 3.6, h: 2.6, fill: { color: tint(t) }, line: { color: t.accent, width: 0 } });
        s.addText(st.value, {
          x, y: 2.9, w: 3.6, h: 1.2,
          fontSize: 34, bold: true, color: t.accent, fontFace: t.displayFont, align: "center",
        });
        s.addText(st.label, {
          x: x + 0.25, y: 4.2, w: 3.1, h: 0.8,
          fontSize: 12, color: t.muted, fontFace: t.bodyFont, align: "center",
        });
      });
      break;
    }
    case "two_col": {
      addHeader(s, deckTitle, slide.title, t);
      const half = Math.ceil(slide.bullets.length / 2);
      const cols = [slide.bullets.slice(0, half), slide.bullets.slice(half)];
      cols.forEach((col, ci) => {
        s.addText(bulletRuns(col, t), {
          x: 0.8 + ci * 6.15, y: 2.5, w: 5.7, h: 4.1,
          fontSize: 16, color: t.body, fontFace: t.bodyFont, valign: "top", paraSpaceAfter: 12,
        });
      });
      break;
    }
    case "closing": {
      s.addText(slide.title, {
        x: 1, y: 1.8, w: 11.3, h: 1.4,
        fontSize: 38, bold: true, color: t.title, fontFace: t.displayFont, align: "center",
      });
      s.addShape("rect", { x: 6.17, y: 3.35, w: 1, h: 0.12, fill: { color: t.accent } });
      if (slide.bullets.length) {
        s.addText(bulletRuns(slide.bullets, t), {
          x: 2.2, y: 3.9, w: 8.9, h: 2.9,
          fontSize: 15, color: t.body, fontFace: t.bodyFont, align: "center", paraSpaceAfter: 10,
        });
      }
      break;
    }
    default: {
      addHeader(s, deckTitle, slide.title, t);
      s.addText(bulletRuns(slide.bullets, t), {
        x: 0.8, y: 2.5, w: 11.6, h: 4.2,
        fontSize: slide.bullets.length > 4 ? 15 : 17,
        color: t.body, fontFace: t.bodyFont, valign: "top", paraSpaceAfter: 12,
      });
    }
  }
}

function addHeader(s: PptxGenJS.Slide, deckTitle: string, title: string, t: T): void {
  s.addText(deckTitle.toUpperCase(), {
    x: 0.8, y: 0.62, w: 10, h: 0.32,
    fontSize: 10, bold: true, charSpacing: 3, color: t.accent, fontFace: t.bodyFont,
  });
  s.addText(title, {
    x: 0.75, y: 1.0, w: 11.8, h: 1.05,
    fontSize: 28, bold: true, color: t.title, fontFace: t.displayFont, valign: "top",
  });
}

function bulletRuns(bullets: string[], t: T) {
  return bullets.map((b) => ({
    text: b,
    options: { bullet: { code: "25AA", indent: 18 }, color: t.body },
  }));
}

/** subtle panel fill derived from the accent */
function tint(t: T): string {
  const c = t.accent;
  const n = parseInt(c, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (v: number, target: number) => Math.round(v + (target - v) * 0.88);
  const isLight = (r * 299 + g * 587 + b * 114) / 1000 > 140;
  const target = isLight ? 20 : 245;
  return [mix(r, target), mix(g, target), mix(b, target)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
