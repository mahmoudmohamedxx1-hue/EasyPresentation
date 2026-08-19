/* ------------------------------------------------------------------ */
/*  Client-side document text extraction.                              */
/*  PDF  → pdfjs-dist (same engine as the FastAPI pdfplumber route)    */
/*  DOCX → mammoth     (paragraphs + tables, like python-docx)         */
/*  TXT/MD → FileReader                                               */
/* ------------------------------------------------------------------ */

import * as pdfjsLib from "pdfjs-dist";
// Vite emits the worker as a hashed asset URL — no manual copying needed.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// mammoth ships no TS declarations; the browser build is selected via its
// "browser" field in package.json.
// @ts-ignore -- untyped module
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_CHARS = 60_000; // safety cap before the engine / LLM sees the text

export interface ExtractResult {
  text: string;
  truncated: boolean;
}

export function supportedFile(name: string): boolean {
  const n = name.toLowerCase();
  return n.endsWith(".pdf") || n.endsWith(".docx") || n.endsWith(".txt") || n.endsWith(".md");
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  let text: string;
  if (name.endsWith(".pdf")) text = await extractPdf(file);
  else if (name.endsWith(".docx")) text = await extractDocx(file);
  else if (name.endsWith(".txt") || name.endsWith(".md")) text = await file.text();
  else throw new Error("Unsupported file type — drop a .pdf, .docx, .txt or .md file.");

  text = text.replace(/\u0000/g, "").trim();
  if (!text) throw new Error("No readable text found in that file.");
  const truncated = text.length > MAX_CHARS;
  return { text: text.slice(0, MAX_CHARS), truncated };
}

async function extractPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await (mammoth as {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  }).extractRawText({ arrayBuffer: buf });
  return result.value ?? "";
}
