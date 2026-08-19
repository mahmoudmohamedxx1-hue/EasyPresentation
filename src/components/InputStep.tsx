import { useRef, useState } from "react";
import { EngineSettings, PipelineStage, wordCount } from "../lib/types";
import { extractTextFromFile, supportedFile } from "../lib/extract";
import { SAMPLES, SampleDoc } from "../lib/samples";
import {
  IconBolt,
  IconCheck,
  IconFile,
  IconInfo,
  IconSpinner,
  IconTrash,
  IconUpload,
  IconWand,
} from "./icons";

interface Props {
  rawText: string;
  setRawText: (t: string) => void;
  sourceName: string;
  setSourceName: (n: string) => void;
  settings: EngineSettings;
  setSettings: (s: EngineSettings) => void;
  pipeline: PipelineStage[] | null;
  onGenerate: () => void;
  notify: (kind: "success" | "error" | "info", msg: string) => void;
}

const SLIDE_OPTIONS: (number | "auto")[] = ["auto", 6, 8, 10, 12];

export default function InputStep({
  rawText,
  setRawText,
  sourceName,
  setSourceName,
  settings,
  setSettings,
  pipeline,
  onGenerate,
  notify,
}: Props) {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [dragOver, setDragOver] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const words = wordCount(rawText);
  const running = pipeline !== null;
  const canGenerate = words >= 40 && !running && !fileBusy;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!supportedFile(file.name)) {
      notify("error", "Unsupported file — drop a .pdf, .docx, .txt or .md file.");
      return;
    }
    setFileBusy(true);
    try {
      const { text, truncated } = await extractTextFromFile(file);
      setRawText(text);
      setSourceName(file.name);
      notify("success", `Extracted ${wordCount(text).toLocaleString()} words from ${file.name}.`);
      if (truncated) notify("info", "Long document — text capped at 60k characters for the engine.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setFileBusy(false);
    }
  }

  function loadSample(s: SampleDoc) {
    setRawText(s.text);
    setSourceName(s.name);
    setTab("paste");
    notify("info", `Loaded sample: ${s.name}.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      {/* ---------------- source panel ---------------- */}
      <section>
        <p className="fade-up font-mono text-[11px] font-semibold tracking-[0.22em] text-moss">
          STEP 01 — SOURCE MATERIAL
        </p>
        <h1 className="fade-up fade-up-1 mt-3 max-w-xl font-display text-[clamp(1.9rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-tight">
          Feed it raw text.
          <br />
          Get a <span className="relative inline-block text-moss-deep">deck
            <svg viewBox="0 0 120 10" className="absolute -bottom-1 left-0 w-full text-hon" preserveAspectRatio="none" aria-hidden="true">
              <path d="M3 7c30-5 84-5 114-2" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>{" "}
          back.
        </h1>
        <p className="fade-up fade-up-2 mt-4 max-w-lg text-[15px] leading-relaxed text-mist">
          Paste a lecture outline, a report, meeting notes — or drop a PDF / Word file. The slide
          engine finds the structure, condenses bullets and picks layouts. Everything is editable
          before export.
        </p>

        <div className="fade-up fade-up-3 mt-6 overflow-hidden rounded-2xl border border-line bg-[#fbfcfa] shadow-card">
          {/* tabs */}
          <div className="flex border-b border-line bg-paper-2/60">
            {(
              [
                { id: "paste", label: "Paste text", icon: <IconFile size={15} /> },
                { id: "upload", label: "Upload document", icon: <IconUpload size={15} /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors ${
                  tab === t.id ? "text-ink" : "text-mist hover:text-ink"
                }`}
              >
                {t.icon}
                {t.label}
                {tab === t.id && <span className="bar-grow absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-moss" />}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "paste" ? (
              <>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  disabled={running}
                  placeholder={
                    "Paste anything with structure — headings help.\n\n# Why sleep matters\nSleep clears metabolic waste from the brain…\n\n# The 90-minute cycle\n…"
                  }
                  className="field min-h-[280px] resize-y font-body text-[14.5px] leading-relaxed"
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-mist">
                  <span className="font-mono">{words.toLocaleString()} words</span>
                  <span className="font-mono">{rawText.length.toLocaleString()} chars</span>
                  <span className="font-mono">~{Math.max(1, Math.round(words / 200))} min read</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="text-ink-2">No source handy?</span>
                    {SAMPLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => loadSample(s)}
                        title={s.hint}
                        disabled={running}
                        className="rounded-md border border-line bg-paper px-2 py-1 text-[12px] font-semibold text-moss-deep transition-all hover:border-moss hover:bg-moss-soft hover:shadow-sm disabled:opacity-50"
                      >
                        {s.id === "nn-lecture" ? "Neural nets lecture" : "Tool library notes"}
                      </button>
                    ))}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => !fileBusy && fileInput.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}
                  className={`grid min-h-[240px] cursor-pointer place-items-center rounded-xl border-2 border-dashed px-6 text-center transition-all ${
                    dragOver
                      ? "border-moss bg-moss-soft/70 scale-[1.01]"
                      : "border-line bg-paper hover:border-moss/60 hover:bg-moss-soft/30"
                  }`}
                >
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {fileBusy ? (
                    <div className="flex flex-col items-center gap-3 text-moss-deep">
                      <IconSpinner size={26} />
                      <p className="text-sm font-semibold">Extracting text…</p>
                      <p className="text-[12.5px] text-mist">Parsing happens right here in your browser.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-xl transition-colors ${
                          dragOver ? "bg-moss text-paper" : "bg-ink text-hon"
                        }`}
                      >
                        <IconUpload size={22} />
                      </span>
                      <p className="text-[15px] font-semibold text-ink-2">
                        Drop a <span className="font-mono text-[13px]">.pdf</span> or{" "}
                        <span className="font-mono text-[13px]">.docx</span> here
                      </p>
                      <p className="text-[12.5px] text-mist">or click to browse — .txt and .md work too</p>
                    </div>
                  )}
                </div>

                {rawText && sourceName && !fileBusy && (
                  <div className="pop-in mt-3 flex items-center gap-3 rounded-xl border border-moss/35 bg-moss-soft/60 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-moss text-paper">
                      <IconFile size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{sourceName}</p>
                      <p className="font-mono text-[11.5px] text-mist">
                        {words.toLocaleString()} words extracted
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setRawText("");
                        setSourceName("");
                      }}
                      className="btn btn-ghost px-2.5 py-2 text-ember"
                      aria-label="Remove file"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* pipeline readout */}
            {pipeline && (
              <div className="pop-in mt-4 rounded-xl border border-line bg-ink p-4 text-paper">
                <div className="mb-3 flex items-center gap-2">
                  <IconSpinner size={15} className="text-hon" />
                  <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-hon">
                    SLIDE ENGINE RUNNING
                  </p>
                </div>
                <ul className="space-y-2">
                  {pipeline.map((s, i) => (
                    <li key={s.label} className="flex items-center gap-2.5 text-[13.5px]">
                      {s.done ? (
                        <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-moss text-paper">
                          <IconCheck size={11} />
                        </span>
                      ) : i === pipeline.findIndex((x) => !x.done) ? (
                        <IconSpinner size={15} className="text-hon" />
                      ) : (
                        <span className="pulse-dot ml-0.5 h-2 w-2 rounded-full bg-mist" />
                      )}
                      <span className={s.done ? "text-paper" : "text-mist"}>{s.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={onGenerate} disabled={!canGenerate} className="btn btn-primary relative overflow-hidden px-6 py-3 text-[15px]">
                {running && <span className="shimmer absolute inset-0" />}
                <IconWand size={17} />
                {running ? "Forging…" : "Forge slide deck"}
              </button>
              <p className="text-[12px] leading-snug text-mist">
                {words < 40
                  ? `Add at least 40 words to start (currently ${words}).`
                  : "Runs locally — nothing leaves your browser unless you enable the LLM engine."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- engine panel ---------------- */}
      <aside className="space-y-4">
        <div className="fade-up fade-up-2 rounded-2xl border border-line bg-[#fbfcfa] p-5 shadow-lift">
          <h2 className="font-display text-sm font-bold tracking-tight">Engine</h2>
          <div className="mt-3 space-y-2.5">
            <button
              onClick={() => setSettings({ ...settings, engine: "local" })}
              className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                settings.engine === "local"
                  ? "border-moss bg-moss-soft/70 shadow-sm"
                  : "border-line bg-paper hover:border-moss/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${settings.engine === "local" ? "bg-moss text-paper" : "bg-paper-2 text-mist"}`}>
                  <IconBolt size={16} />
                </span>
                <span>
                  <span className="block text-sm font-bold">Local heuristic engine</span>
                  <span className="block text-[12px] text-mist">Instant · private · no API key</span>
                </span>
                {settings.engine === "local" && <IconCheck size={16} className="ml-auto text-moss-deep" />}
              </span>
            </button>
            <button
              onClick={() => setSettings({ ...settings, engine: "llm" })}
              className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                settings.engine === "llm"
                  ? "border-moss bg-moss-soft/70 shadow-sm"
                  : "border-line bg-paper hover:border-moss/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${settings.engine === "llm" ? "bg-moss text-paper" : "bg-paper-2 text-mist"}`}>
                  <IconWand size={16} />
                </span>
                <span>
                  <span className="block text-sm font-bold">LLM API</span>
                  <span className="block text-[12px] text-mist">Any OpenAI-compatible endpoint</span>
                </span>
                {settings.engine === "llm" && <IconCheck size={16} className="ml-auto text-moss-deep" />}
              </span>
            </button>
          </div>

          {settings.engine === "llm" && (
            <div className="pop-in mt-3 space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">API key</span>
                <input
                  type="password"
                  className="field font-mono text-[13px]"
                  placeholder="sk-…"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">Base URL</span>
                <input
                  className="field font-mono text-[12.5px]"
                  placeholder="https://api.openai.com/v1"
                  value={settings.baseUrl}
                  onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink-2">Model</span>
                <input
                  className="field font-mono text-[13px]"
                  placeholder="gpt-4o-mini"
                  value={settings.model}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                />
              </label>
              <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-mist">
                <IconInfo size={13} className="mt-0.5 shrink-0" />
                Works with OpenAI, Qwen DashScope compatible mode, Groq or local Ollama. The key
                stays in your browser.
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[12px] font-semibold text-ink-2">Target slide count</p>
            <div className="mt-2 grid grid-cols-5 gap-1 rounded-lg border border-line bg-paper p-1">
              {SLIDE_OPTIONS.map((n) => (
                <button
                  key={String(n)}
                  onClick={() => setSettings({ ...settings, targetSlides: n })}
                  className={`rounded-md py-1.5 font-mono text-[12.5px] font-semibold capitalize transition-all ${
                    settings.targetSlides === n
                      ? "bg-ink text-paper shadow-sm"
                      : "text-mist hover:bg-paper-2 hover:text-ink"
                  }`}
                >
                  {n === "auto" ? "Auto" : n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fade-up fade-up-3 rounded-2xl border border-line bg-ink p-5 text-paper shadow-lift">
          <h2 className="font-display text-sm font-bold">What comes out</h2>
          <ul className="mt-3 space-y-2.5 text-[13px] text-[#c3d2cc]">
            {[
              "A structured outline — every slide titled from your source",
              "Condensed bullets, quotes & stat callouts detected automatically",
              "Six layout types across five visual themes",
              "One-click .pptx + .json export",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-sm bg-hon" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
