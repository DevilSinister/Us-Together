"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Download or share the finished PNG. The image route answers with
 * `Content-Security-Policy: default-src 'none'; sandbox`, which governs rendering that
 * response as a document; a same-origin fetch() of it is unaffected.
 */
export function DrawingActions({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchFile() {
    const response = await fetch("/api/drawing-notes/" + id + "/image", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not load the drawing.");
    return new File([await response.blob()], "drawing-" + id.slice(0, 8) + ".png", { type: "image/png" });
  }

  function save(file: File) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = file.name; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function run(action: (file: File) => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(await fetchFile()); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  const download = () => run(async (file) => save(file));
  const share = () => run(async (file) => {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "A drawing from Us Together" });
    else save(file);
  });

  return <div className="flex flex-wrap items-center gap-2">
    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={download}><Download className="size-4" aria-hidden="true" />Download PNG</Button>
    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={share}><Share2 className="size-4" aria-hidden="true" />Share</Button>
    {message ? <p role="alert" className="text-sm text-danger">{message}</p> : null}
  </div>;
}
