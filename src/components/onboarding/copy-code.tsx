"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies the pairing code, and says so for a moment. Without clipboard access it leaves the code to be read aloud or typed. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
      }}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-border px-3.5 text-sm font-semibold transition-colors duration-150 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
    >
      {copied ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
