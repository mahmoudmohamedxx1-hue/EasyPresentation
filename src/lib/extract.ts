/* ------------------------------------------------------------------ */
/*  Client-side document text extraction (lazy-loaded).                */
/*  PDF  → pdfjs-dist (same engine as the FastAPI pdfplumber route)    */
/*  DOCX → mammoth     (paragraphs + tables, like python-docx)         */
/*  TXT/MD → FileReader                                               */
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
  if (name.endsWith(".pdf")) text = await extractPdf(file);
  else if (name.endsWith(".docx")) text = await extractDocx(file);
  else if (name.endsWith(".txt") || name.endsWith(".md")) text = await file.text();
  else throw new Error("Unsupported file type — drop a .pdf, .docx, .txt or .md file.");

  text = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("No readable text found in that file.");
  const truncated = text.length > MAX_CHARS;
  return { text: text.slice(0, MAX_CHARS), truncated };
}

async function extractPdf(file: File): Promise<string> {
  // pdfjs is heavy — only imported when a PDF actually arrives.
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const pdfData = new Uint8Array(buf);
  const doc = await pdfjsLib.getDocument({ ["data" as const]: pdfData }).promise;
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
  const m = mammoth as {
    default?: { extractRawText: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> };
    extractRawText?: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };
  const extract = m.default?.extractRawText ?? m.extractRawText;
  if (!extract) throw new Error("Could not load the DOCX parser — please try again.");
  const result = await extract({ arrayBuffer: buf });
  return result?.value ?? "";
}
