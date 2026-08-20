import { useState } from "react";
import { IconCheck, IconCopy } from "./icons";

export default function CodeBlock({ filename, code }: { filename: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-ink-3 bg-ink shadow-lift">
      <div className="flex items-center gap-3 border-b border-ink-3 bg-ink-2 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ember/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-hon/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-moss/80" />
        </div>
        <span className="font-mono text-xs font-medium text-paper/90">{filename}</span>
        <span className="ml-auto hidden font-mono text-[11px] text-mist sm:block">{lines} lines</span>
        <button
          onClick={copy}
          className={`btn px-2.5 py-1 text-xs ${
            copied ? "btn-ghost-dark" : "btn-ghost-dark"
          }`}
          style={copied ? { borderColor: "#2fd4b5", color: "#2fd4b5" } : undefined}
        >
          {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[52vh] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-[#d5e2dc]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
