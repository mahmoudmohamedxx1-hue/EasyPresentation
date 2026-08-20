import { useEffect, useState } from "react";
import { BLUEPRINT_FILES, RUN_COMMANDS } from "../lib/blueprint";
import CodeBlock from "./CodeBlock";
import { IconCode, IconTerminal, IconX } from "./icons";

export default function BlueprintDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState(1); // default: main.py

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const file = BLUEPRINT_FILES[active];

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close blueprint"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/60"
      />
      <aside className="slide-in-right absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-line bg-paper shadow-lift">
        <header className="flex items-start gap-4 border-b border-line bg-paper-2/70 px-6 py-5">
          <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-lg bg-ink text-hon">
            <IconCode size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold leading-tight">
              Backend blueprint — FastAPI + python-pptx
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-mist">
              This demo runs the whole pipeline in your browser. To run the production stack
              locally, copy these seven files — same slide JSON contract, same system prompt.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost px-2.5 py-2" aria-label="Close">
            <IconX size={16} />
          </button>
        </header>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-6 py-3">
          {BLUEPRINT_FILES.map((f, i) => (
            <button
              key={f.filename}
              onClick={() => setActive(i)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[12px] transition-all ${
                i === active
                  ? "border-moss bg-moss-soft font-semibold text-moss-deep"
                  : "border-line bg-paper text-mist hover:border-moss/50 hover:text-ink"
              }`}
            >
              <span className="mr-1.5 opacity-60">{f.step}</span>
              {f.filename}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-3 text-[13px] font-medium text-ink-2">{file.note}</p>
          <CodeBlock filename={file.filename} code={file.code} />

          <div className="mt-8 mb-2 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-hon">
              <IconTerminal size={15} />
            </span>
            <h3 className="font-display text-sm font-bold">Run it locally</h3>
          </div>
          <CodeBlock filename="terminal" code={RUN_COMMANDS} />
          <p className="pb-2 pt-4 text-[12px] text-mist">
            The in-browser pipeline mirrors this exactly: pdfjs-dist ↔ pdfplumber, mammoth ↔
            python-docx, the local engine ↔ ai_service.py, pptxgenjs ↔ exporter.py.
          </p>
        </div>
      </aside>
    </div>
  );
}
