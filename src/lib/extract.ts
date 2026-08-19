/* ------------------------------------------------------------------ */
/*  Client-side document text extraction.                              */
/*  PDF  → pdfjs-dist (same engine as the FastAPI pdfplumber route)    */
/*  DOCX → mammoth     (paragraphs + tables, like python-docx)         */
/*  TXT/MD → FileReader                                               */
/*                                                                     */
/*  The heavy parser libraries are loaded lazily (dynamic import) so   */
/*  they can never block or break the initial render.                  */
/* ------------------------------------------------------------------ */

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
  try {
    if (name.endsWith(".pdf")) text = await extractPdf(file);
    else if (name.endsWith(".docx")) text = await extractDocx(file);
    else if (name.endsWith(".txt") || name.endsWith(".md")) text = await file.text();
    else throw new Error("Unsupported file type — drop a .pdf, .docx, .txt or .md file.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unsupported|no readable/i.test(msg)) throw err;
    throw new Error(`Could not read that file (${msg}). Try a text-based PDF or .docx.`);
  }

  text = text.replace(/\u0000/g, "").trim();
  if (!text) throw new Error("No readable text found in that file — it may be a scanned/image-only document.");
  const truncated = text.length > MAX_CHARS;
  return { text: text.slice(0, MAX_CHARS), truncated };
}

async function extractPdf(file: File): Promise<string> {
  // pdfjs-dist is only loaded when a PDF is actually dropped.
  const pdfjsLib = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;

  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  // mammoth is only loaded when a DOCX is actually dropped.
  // @ts-ignore -- untyped module; Vite picks its browser build automatically
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const result = await (mammoth as {
    default?: { extractRawText: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    extractRawText?: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  }).default?.extractRawText({ arrayBuffer: buf }) ??
    (mammoth as unknown as {
      extractRawText: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    }).extractRawText({ arrayBuffer: buf });
  return result.value ?? "";
}
