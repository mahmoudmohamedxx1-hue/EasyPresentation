/* ------------------------------------------------------------------ */
/*  Backend blueprint — the full FastAPI + python-pptx production      */
/*  stack this demo mirrors client-side. Shown in the in-app drawer    */
/*  with copy buttons, so the MVP can be run locally end-to-end.       */
/* ------------------------------------------------------------------ */

export interface BlueprintFile {
  step: string;
  filename: string;
  language: string;
  note: string;
  code: string;
}

const REQUIREMENTS = `fastapi>=0.110
uvicorn[standard]>=0.29
python-multipart>=0.0.9
pdfplumber>=0.11
python-docx>=1.1
python-pptx>=0.6.23
httpx>=0.27
pydantic>=2.6`;

const MAIN_PY = `# main.py — FastAPI entry point for the SlideForge MVP.
#
# Run locally:
#   python -m venv .venv && source .venv/bin/activate   (Windows: .venv\\Scripts\\activate)
#   pip install -r requirements.txt
#   uvicorn main:app --reload --port 8000
#
# Endpoints:
#   POST /api/extract   multipart file (.pdf / .docx / .txt) -> {"text", "words"}
#   POST /api/generate  {"text", "target_slides"}            -> slide deck JSON
#   POST /api/export    {"deck_title", "slides"}             -> binary .pptx download

import io
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import parser as doc_parser
from ai_service import generate_slides
from exporter import build_pptx

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

app = FastAPI(title="SlideForge API", version="0.1.0")

# The Next.js dev server runs on :3000 — allow it to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    text: str
    target_slides: int = 8


class ExportRequest(BaseModel):
    deck_title: str
    slides: list[dict]


@app.post("/api/extract")
async def extract_text(file: UploadFile = File(...)):
    raw = await file.read()
    text = doc_parser.extract_text(raw, file.filename or "notes.txt")
    if not text.strip():
        raise HTTPException(status_code=422, detail="No readable text found in that file.")
    return {"filename": file.filename, "text": text[:60000], "words": len(text.split())}


@app.post("/api/generate")
async def generate_deck(req: GenerateRequest):
    deck = await generate_slides(req.text, req.target_slides)
    return deck


@app.post("/api/export")
async def export_pptx(req: ExportRequest):
    buffer = build_pptx(req.deck_title, req.slides)
    filename = req.deck_title.lower().replace(" ", "-")[:48] + ".pptx"
    return StreamingResponse(
        buffer,
        media_type=PPTX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )`;

const PARSER_PY = `# parser.py — document text extraction (Step 2).
# pdfplumber handles PDFs page by page; python-docx walks paragraphs
# and tables. Plain text falls through untouched.

import io
import pdfplumber
from docx import Document


def extract_text(data: bytes, filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return _from_pdf(data)
    if name.endswith(".docx"):
        return _from_docx(data)
    return data.decode("utf-8", errors="ignore")


def _from_pdf(data: bytes) -> str:
    chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                chunks.append(text.strip())
    return "\\n\\n".join(chunks)


def _from_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:  # tables are easy to lose — keep them
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            parts.append(" | ".join(cells))
    return "\\n".join(parts)`;

const AI_SERVICE_PY = `# ai_service.py — the LLM slide engine (Step 3).
# Talks to ANY OpenAI-compatible endpoint: OpenAI, Qwen (DashScope
# compatible mode), Groq, or a local Ollama server.
#
#   export LLM_API_KEY=sk-...
#   export LLM_BASE_URL=https://api.openai.com/v1          # default
#   # Qwen:  https://dashscope-intl.aliyuncs.com/compatible-mode/v1
#   # Ollama: http://localhost:11434/v1
#   export LLM_MODEL=gpt-4o-mini

import json
import os
import httpx

SYSTEM_PROMPT = """You are the SlideForge slide engine. You digest long-form source text
(lecture outlines, reports, raw notes) and convert it into a presentation structure.

Rules:
1. Read the ENTIRE source before writing anything.
2. Produce 6 to 12 slides total. The FIRST slide uses design_layout "title": its title
   is the deck title and subtitle is one short line describing the deck.
3. Every other slide uses one of: "bullets", "two_col", "quote", "stats", "closing".
   Use "closing" exactly once, as the final slide.
4. Each slide has at most 5 bullet_points. Every bullet is 12 words or fewer, sentence
   case, no trailing period. Bullets must be faithful to the source - never invent facts.
5. "stats" slides fill the "stats" array with 2-3 items {"value": "...", "label": "..."}
   using numbers quoted verbatim from the source.
6. "quote" slides fill "quote" with {"text": "...", "attribution": "..."}.
7. Titles are 8 words or fewer, reusing the source's section names when possible.
8. speaker_notes is 1-2 sentences a presenter could read aloud.

Respond with ONLY valid JSON - no markdown fences, no commentary - matching:
{"deck_title": "...", "slides": [{"slide_number": 1, "title": "...", "subtitle": "...",
"bullet_points": ["..."], "design_layout": "title",
"stats": [{"value": "...", "label": "..."}],
"quote": {"text": "...", "attribution": "..."}, "speaker_notes": "..."}]}"""

VALID_LAYOUTS = {"title", "bullets", "two_col", "quote", "stats", "closing"}


async def generate_slides(text: str, target_slides: int = 8) -> dict:
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    payload = {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "temperature": 0.4,
        "max_tokens": 2600,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Target slide count: {target_slides}\\n\\n"
                    f'Source text:\\n"""\\n{text[:14000]}\\n"""'
                ),
            },
        ],
    }
    async with httpx.AsyncClient(timeout=90) as client:
        res = await client.post(
            f"{base_url}/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {os.getenv('LLM_API_KEY', '')}"},
        )
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"]
    return _parse_deck(content)


def _parse_deck(raw: str) -> dict:
    """Tolerant JSON repair: strip fences, find the outermost braces."""
    stripped = raw.replace("\`\`\`json", "").replace("\`\`\`", "").strip()
    start, end = stripped.find("{"), stripped.rfind("}")
    deck = json.loads(stripped[start : end + 1])
    for i, slide in enumerate(deck.get("slides", [])):
        slide["slide_number"] = i + 1
        if slide.get("design_layout") not in VALID_LAYOUTS:
            slide["design_layout"] = "bullets"
        slide["bullet_points"] = [str(b) for b in slide.get("bullet_points", [])][:5]
    return deck`;

const EXPORTER_PY = `# exporter.py — .pptx compilation with python-pptx (Step 5).
# Renders the same slide JSON the frontend previews, 16:9 widescreen.

import io
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

BG = RGBColor(0x10, 0x21, 0x1D)
INK = RGBColor(0xEA, 0xF4, 0xF0)
MUTED = RGBColor(0x9C, 0xB8, 0xB0)
ACCENT = RGBColor(0x2F, 0xD4, 0xB5)

DISPLAY_FONT = "Trebuchet MS"
BODY_FONT = "Calibri"


def build_pptx(deck_title: str, slides: list[dict]) -> io.BytesIO:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    for slide in slides:
        s = prs.slides.add_slide(blank)
        bg = s.background.fill
        bg.solid()
        bg.fore_color.rgb = BG
        layout = slide.get("design_layout", "bullets")

        if layout == "title":
            _text(s, slide["title"], 0.8, 2.3, 11.5, 2.2, 42, INK, True)
            _text(s, slide.get("subtitle", ""), 0.85, 4.8, 10, 1, 16, MUTED)
        elif layout == "quote":
            quote = slide.get("quote", {})
            _text(s, '"' + quote.get("text", "") + '"', 1.0, 2.6, 11, 2.5, 27, INK, italic=True)
            _text(s, "- " + quote.get("attribution", ""), 1.05, 5.4, 10, 0.5, 14, MUTED)
        elif layout == "stats":
            _text(s, slide["title"], 0.8, 1.0, 11.5, 1, 28, INK, True)
            for i, st in enumerate(slide.get("stats", [])[:3]):
                x = 0.8 + i * 4.05
                _text(s, st["value"], x, 3.0, 3.6, 1.2, 34, ACCENT, True)
                _text(s, st["label"], x, 4.3, 3.6, 0.8, 12, MUTED)
        else:
            _text(s, slide["title"], 0.8, 1.0, 11.5, 1, 28, INK, True)
            body = _textbox(s, 0.85, 2.4, 11.5, 4.2)
            for j, point in enumerate(slide.get("bullet_points", [])):
                p = body.paragraphs[0] if j == 0 else body.add_paragraph()
                p.text = point
                p.font.size = Pt(17)
                p.font.color.rgb = INK
                p.font.name = BODY_FONT
                p.space_after = Pt(12)

        _text(s, deck_title, 0.55, 7.0, 8, 0.3, 9, MUTED)

    buffer = io.BytesIO()
    prs.save(buffer)
    buffer.seek(0)
    return buffer


def _text(slide, text, x, y, w, h, size, color, bold=False, italic=False):
    box = _textbox(slide, x, y, w, h)
    p = box.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.color.rgb = color
    p.font.name = DISPLAY_FONT if bold else BODY_FONT
    p.font.bold = bold
    p.font.italic = italic


def _textbox(slide, x, y, w, h):
    return slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h)).text_frame`;

const NEXT_PAGE = `// app/page.tsx — Next.js client (Step 6).
// Run: npm create next-app, drop this file in app/, then
//      NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

"use client";
import { useState } from "react";
import SlidePreview from "@/components/SlidePreview";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Slide {
  slide_number: number;
  title: string;
  subtitle?: string;
  bullet_points: string[];
  design_layout: string;
  stats?: { value: string; label: string }[];
  quote?: { text: string; attribution: string };
}

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const ex = await fetch(API + "/api/extract", { method: "POST", body: form });
    const { text } = await ex.json();
    const gen = await fetch(API + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target_slides: 8 }),
    });
    const deck = await gen.json();
    setDeckTitle(deck.deck_title);
    setSlides(deck.slides);
    setBusy(false);
  }

  async function onExport() {
    const res = await fetch(API + "/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck_title: deckTitle, slides }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deck.pptx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">SlideForge</h1>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(e) => e.target.files && onFile(e.target.files[0])}
      />
      {busy && <p>Forging slides…</p>}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {slides.map((s) => (
          <SlidePreview key={s.slide_number} slide={s} />
        ))}
      </div>
      {slides.length > 0 && <button onClick={onExport}>Download .pptx</button>}
    </main>
  );
}`;

const NEXT_PREVIEW = `// components/SlidePreview.tsx — renders one slide of deck JSON.

export interface Slide {
  slide_number: number;
  title: string;
  subtitle?: string;
  bullet_points: string[];
  design_layout: string;
  stats?: { value: string; label: string }[];
  quote?: { text: string; attribution: string };
}

export default function SlidePreview({ slide }: { slide: Slide }) {
  return (
    <article className="aspect-video rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-zinc-100">
      {slide.design_layout === "title" ? (
        <div className="flex h-full flex-col justify-center">
          <h2 className="text-3xl font-bold">{slide.title}</h2>
          <p className="mt-2 text-zinc-400">{slide.subtitle}</p>
        </div>
      ) : slide.design_layout === "quote" ? (
        <div className="flex h-full flex-col justify-center">
          <p className="text-xl italic">“{slide.quote?.text}”</p>
          <p className="mt-3 text-sm text-zinc-400">— {slide.quote?.attribution}</p>
        </div>
      ) : (
        <>
          <h2 className="mb-4 text-xl font-bold text-emerald-300">{slide.title}</h2>
          {slide.design_layout === "stats" ? (
            <div className="flex gap-6">
              {(slide.stats || []).map((st) => (
                <div key={st.label}>
                  <p className="text-3xl font-bold text-emerald-300">{st.value}</p>
                  <p className="text-xs text-zinc-400">{st.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {slide.bullet_points.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </>
      )}
      <span className="float-right text-xs text-zinc-500">{slide.slide_number}</span>
    </article>
  );
}`;

export const BLUEPRINT_FILES: BlueprintFile[] = [
  {
    step: "Step 1",
    filename: "requirements.txt",
    language: "text",
    note: "Install with: pip install -r requirements.txt",
    code: REQUIREMENTS,
  },
  {
    step: "Step 2",
    filename: "main.py",
    language: "python",
    note: "Routing layer — run with: uvicorn main:app --reload --port 8000",
    code: MAIN_PY,
  },
  {
    step: "Step 3",
    filename: "parser.py",
    language: "python",
    note: "pdfplumber for PDFs, python-docx for Word — tables preserved.",
    code: PARSER_PY,
  },
  {
    step: "Step 4",
    filename: "ai_service.py",
    language: "python",
    note: "The exact system prompt + tolerant JSON repair. Works with OpenAI, Qwen or Ollama.",
    code: AI_SERVICE_PY,
  },
  {
    step: "Step 5",
    filename: "exporter.py",
    language: "python",
    note: "python-pptx compilation — same layouts as the live preview, 16:9.",
    code: EXPORTER_PY,
  },
  {
    step: "Step 6a",
    filename: "app/page.tsx",
    language: "tsx",
    note: "Next.js client — extract → generate → export against the FastAPI server.",
    code: NEXT_PAGE,
  },
  {
    step: "Step 6b",
    filename: "components/SlidePreview.tsx",
    language: "tsx",
    note: "One slide of deck JSON, rendered as a 16:9 card.",
    code: NEXT_PREVIEW,
  },
];

export const RUN_COMMANDS = `# 1 — Backend (FastAPI)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export LLM_API_KEY=sk-...          # optional for this demo: the local engine needs no key
uvicorn main:app --reload --port 8000

# 2 — Frontend (Next.js)
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev

# This web demo runs the identical pipeline fully in-browser:
# pdfjs-dist parses PDFs, mammoth parses DOCX, the local engine or an
# OpenAI-compatible endpoint builds the slide JSON, and pptxgenjs
# compiles the .pptx — no server required.`;
