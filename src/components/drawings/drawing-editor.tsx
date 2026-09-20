"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Circle, Download, Eraser, Highlighter, PaintBucket, PenLine, Pencil, Pipette, Redo2, Send, SprayCan, Square, Trash2, Undo2, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fillPixels, HEIGHT, hexRgb, SWATCHES, WIDTH } from "@/lib/drawings/canvas";

type Tool = "pencil" | "marker" | "highlighter" | "airbrush" | "fill" | "rectangle" | "ellipse" | "dropper" | "eraser";
const TOOLS: { id: Tool; label: string; short: string; icon: LucideIcon }[] = [
  { id: "pencil", label: "Pencil", short: "Pencil", icon: Pencil },
  { id: "marker", label: "Marker", short: "Marker", icon: PenLine },
  { id: "highlighter", label: "Highlighter", short: "Highlight", icon: Highlighter },
  { id: "airbrush", label: "Airbrush", short: "Airbrush", icon: SprayCan },
  { id: "fill", label: "Paint bucket", short: "Fill", icon: PaintBucket },
  { id: "rectangle", label: "Filled rectangle", short: "Rectangle", icon: Square },
  { id: "ellipse", label: "Filled ellipse", short: "Ellipse", icon: Circle },
  { id: "dropper", label: "Eyedropper", short: "Pick", icon: Pipette },
  { id: "eraser", label: "Eraser", short: "Eraser", icon: Eraser },
];
const COLOR_NAMES = ["Ink", "Wine", "Pink", "Coral", "Orange", "Yellow", "Leaf", "Sage", "Sky", "Violet", "White"] as const;
const DRAFT_KEY = "us-together-drawing-draft-v1";
/** Snapshots kept for undo and redo together. Each is a full 640×480 ImageData (~1.2 MB). */
const HISTORY_LIMIT = 16;
const MAX_BYTES = 2 * 1024 * 1024;
const SEND_TIMEOUT = 20_000;

function brushWidth(tool: Tool, size: number) {
  if (tool === "pencil") return Math.max(1, size * 0.65);
  if (tool === "marker") return size * 3;
  if (tool === "highlighter") return size * 6;
  if (tool === "airbrush") return size * 7;
  if (tool === "eraser") return size * 4.5;
  return size;
}
function spray(context: CanvasRenderingContext2D, x: number, y: number, radius: number, ink: string) {
  context.save();
  context.fillStyle = ink;
  const count = Math.max(25, Math.round(radius * 3));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radius;
    context.globalAlpha = 0.025 + 0.12 * (1 - distance / radius);
    context.beginPath();
    context.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0.6 + Math.random() * 1.2, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}
function point(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(WIDTH - 1, (clientX - rect.left) * WIDTH / rect.width)),
    y: Math.max(0, Math.min(HEIGHT - 1, (clientY - rect.top) * HEIGHT / rect.height)) };
}
function colorAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return "#" + [p[0], p[1], p[2]].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type DraftState = "saved" | "pending" | "unavailable";

export function DrawingEditor({ partnerName, canSend }: { partnerName: string | null; canSend: boolean }) {
  const router = useRouter();
  const partner = partnerName ?? "your partner";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const stroke = useRef<{ x: number; y: number; base?: ImageData } | null>(null);
  // One array holds undo and redo: frames[0..cursor] are states behind us, frames[cursor+1..] ahead.
  const frames = useRef<ImageData[]>([]);
  const cursor = useRef(-1);
  const keyboardPoint = useRef({ x: WIDTH / 2, y: HEIGHT / 2 });
  const reviewBlob = useRef<Blob | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>(SWATCHES[1]);
  const [brushSize, setBrushSize] = useState(4);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [keyboardCursor, setKeyboardCursor] = useState<{ x: number; y: number } | null>(null);
  const [shapeAnchor, setShapeAnchor] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [draftState, setDraftState] = useState<DraftState>("saved");
  const [message, setMessage] = useState("");
  const ctx = () => canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;
  const changed = useCallback(() => {
    setRevision((n) => n + 1);
    setHistory({ undo: cursor.current >= 0, redo: cursor.current < frames.current.length - 1 });
    setDraftState((state) => (state === "unavailable" ? state : "pending"));
  }, []);

  const persistDraft = useCallback(() => {
    if (!canvasRef.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, canvasRef.current.toDataURL("image/png"));
      setDraftState("saved");
    } catch {
      setDraftState("unavailable");
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, WIDTH, HEIGHT);
    let saved: string | null = null;
    try { saved = localStorage.getItem(DRAFT_KEY); } catch { saved = null; }
    if (saved) {
      const image = new Image();
      image.onload = () => { context.drawImage(image, 0, 0, WIDTH, HEIGHT); setRevision((n) => n + 1); };
      image.src = saved;
    }
  }, []);
  // The 500 ms timer dies with the tab on a phone app-switch, so a leaving page saves at once.
  useEffect(() => {
    if (!revision || review) return;
    const timer = window.setTimeout(persistDraft, 500);
    const flush = () => { if (document.visibilityState === "hidden") persistDraft(); };
    window.addEventListener("pagehide", persistDraft);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", persistDraft);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [revision, review, persistDraft]);
  useEffect(() => () => { abort.current?.abort(); if (review) URL.revokeObjectURL(review); }, [review]);

  function remember(context: CanvasRenderingContext2D) {
    frames.current.splice(cursor.current + 1);
    frames.current.push(context.getImageData(0, 0, WIDTH, HEIGHT));
    if (frames.current.length > HISTORY_LIMIT) frames.current.shift();
    cursor.current = frames.current.length - 1;
  }
  function undo() {
    const context = ctx(); if (!context || cursor.current < 0) return;
    const current = context.getImageData(0, 0, WIDTH, HEIGHT);
    context.putImageData(frames.current[cursor.current], 0, 0);
    frames.current[cursor.current] = current;
    cursor.current -= 1;
    changed();
  }
  function redo() {
    const context = ctx(); if (!context || cursor.current >= frames.current.length - 1) return;
    cursor.current += 1;
    const current = context.getImageData(0, 0, WIDTH, HEIGHT);
    context.putImageData(frames.current[cursor.current], 0, 0);
    frames.current[cursor.current] = current;
    changed();
  }
  function paintShape(context: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, base: ImageData) {
    context.putImageData(base, 0, 0);
    context.globalAlpha = 1; context.fillStyle = color;
    const left = Math.min(from.x, to.x), top = Math.min(from.y, to.y);
    const width = Math.abs(from.x - to.x), height = Math.abs(from.y - to.y);
    if (tool === "rectangle") context.fillRect(left, top, width, height);
    else { context.beginPath(); context.ellipse(left + width / 2, top + height / 2, Math.max(width / 2, 0.5), Math.max(height / 2, 0.5), 0, 0, Math.PI * 2); context.fill(); }
  }
  function begin(x: number, y: number) {
    const context = ctx(); if (!context) return;
    if (tool === "dropper") { setColor(colorAt(context, x, y)); return; }
    if (tool === "fill") {
      const before = context.getImageData(0, 0, WIDTH, HEIGHT);
      const after = new ImageData(new Uint8ClampedArray(before.data), WIDTH, HEIGHT);
      if (fillPixels(after, x, y, hexRgb(color))) { remember(context); context.putImageData(after, 0, 0); changed(); }
      return;
    }
    remember(context);
    stroke.current = { x, y, base: tool === "rectangle" || tool === "ellipse" ? context.getImageData(0, 0, WIDTH, HEIGHT) : undefined };
    if (tool === "rectangle" || tool === "ellipse") return;
    if (tool === "airbrush") { spray(context, x, y, brushWidth(tool, brushSize) / 2, color); changed(); return; }
    context.globalAlpha = tool === "highlighter" ? 0.24 : 1;
    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.fillStyle = context.strokeStyle;
    context.lineWidth = brushWidth(tool, brushSize);
    context.lineCap = tool === "highlighter" ? "square" : "round"; context.lineJoin = "round";
    if (tool === "highlighter") context.fillRect(x - context.lineWidth / 2, y - context.lineWidth / 2, context.lineWidth, context.lineWidth);
    else { context.beginPath(); context.arc(x, y, context.lineWidth / 2, 0, Math.PI * 2); context.fill(); }
    context.beginPath(); context.moveTo(x, y);
    changed();
  }
  function move(x: number, y: number) {
    const context = ctx(), start = stroke.current;
    if (!context || !start) return;
    if (start.base) paintShape(context, start, { x, y }, start.base);
    else if (tool === "airbrush") {
      const distance = Math.hypot(x - start.x, y - start.y);
      const step = Math.max(2, brushWidth(tool, brushSize) / 8);
      for (let traveled = step; traveled < distance; traveled += step)
        spray(context, start.x + (x - start.x) * traveled / distance, start.y + (y - start.y) * traveled / distance, brushWidth(tool, brushSize) / 2, color);
      spray(context, x, y, brushWidth(tool, brushSize) / 2, color);
      stroke.current = { x, y };
    } else { context.lineTo(x, y); context.stroke(); }
    changed();
  }
  function end() { stroke.current = null; const context = ctx(); if (context) context.globalAlpha = 1; }
  /** Keyboard shapes are two presses: anchor a corner, move, press again. Escape abandons. */
  function cancelShape() {
    const context = ctx(), start = stroke.current;
    if (!context || !start?.base) return;
    context.putImageData(start.base, 0, 0);
    frames.current.pop();
    cursor.current = frames.current.length - 1;
    stroke.current = null;
    setShapeAnchor(false);
    changed();
  }
  function clearPage() {
    const context = ctx(); if (!context) return;
    remember(context); context.fillStyle = "#ffffff"; context.globalAlpha = 1; context.fillRect(0, 0, WIDTH, HEIGHT); changed();
  }
  function discardDraft() {
    const context = ctx(); if (!context) return;
    context.fillStyle = "#ffffff"; context.globalAlpha = 1; context.fillRect(0, 0, WIDTH, HEIGHT);
    frames.current = []; cursor.current = -1;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to remove */ }
    setConfirmDiscard(false);
    setHistory({ undo: false, redo: false });
    setDraftState("saved");
    setMessage("");
    canvasRef.current?.focus();
  }
  async function saveCopy() {
    if (!canvasRef.current) return;
    const blob = await toBlob(canvasRef.current);
    if (blob) download(blob, "drawing-draft.png");
  }
  async function openReview() {
    if (!canvasRef.current) return;
    const blob = await toBlob(canvasRef.current);
    if (!blob) { setMessage("Could not prepare the preview. Try again."); return; }
    reviewBlob.current = blob;
    setMessage("");
    setReview(URL.createObjectURL(blob));
    window.requestAnimationFrame(() => reviewHeading.current?.focus());
  }
  function closeReview() {
    setReview(null);
    reviewBlob.current = null;
    window.requestAnimationFrame(() => canvasRef.current?.focus());
  }
  async function send() {
    const blob = reviewBlob.current;
    if (!blob || !canSend || pending) return;
    if (blob.size > MAX_BYTES) { setMessage("This page is too detailed to send (over 2 MB). Undo a few strokes and try again."); return; }
    setPending(true); setMessage("");
    const controller = new AbortController();
    abort.current = controller;
    const timer = window.setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), SEND_TIMEOUT);
    try {
      const form = new FormData(); form.set("image", blob, "drawing.png");
      const response = await fetch("/api/drawing-notes", { method: "POST", body: form, signal: controller.signal });
      let result: { id?: string; error?: string } = {};
      try { result = await response.json(); } catch { result = {}; }
      if (!response.ok || !result.id) throw new Error(result.error ?? "Could not send. Try again.");
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* the server has it now */ }
      router.push("/drawings/" + result.id + "?sent=1"); router.refresh();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMessage(name === "AbortError" || name === "TimeoutError"
        ? "Could not reach Us Together. Your drawing is still here. Try again."
        : error instanceof Error ? error.message : "Could not send. Try again.");
    } finally { window.clearTimeout(timer); abort.current = null; setPending(false); }
  }

  const selectedTool = TOOLS.find((item) => item.id === tool)?.label ?? "Pencil";
  const hasSize = tool === "pencil" || tool === "marker" || tool === "highlighter" || tool === "airbrush" || tool === "eraser";
  const isShape = tool === "rectangle" || tool === "ellipse";
  const iconButton = "grid size-11 place-items-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none";

  return <section className="mt-4 space-y-4 sm:mt-6" aria-label="Drawing workspace">
    <div hidden={review !== null} aria-hidden={review !== null} className="space-y-4">
      <div className="rounded-[1.5rem] bg-[#f5dfe2] p-3 dark:bg-[#4b303a] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#713143] dark:text-[#f5c9d3]">
          <span>For {partner}</span>
          <span aria-live="polite">{draftState === "unavailable" ? "Draft not saved on this device" : draftState === "pending" ? "Saving draft…" : "Private draft"}</span>
        </div>
        <div className="rounded-[1rem] bg-white p-1.5 shadow-paper sm:p-2">
          <div className="relative mx-auto w-fit">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} role="img"
              aria-label={"Drawing canvas. Use a pointer to draw. With keyboard, arrow keys move the cursor; Space draws a mark; Enter uses fill or eyedropper." + (isShape ? " For shapes, press Space once to set a corner, move with the arrows, then press Space again. Escape cancels." : "")}
              className="block aspect-[4/3] h-auto max-h-[min(56dvh,30rem)] w-auto max-w-full rounded-[0.7rem] bg-white touch-none outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
              onFocus={() => setKeyboardCursor({ ...keyboardPoint.current })}
              onBlur={() => { setKeyboardCursor(null); if (shapeAnchor) cancelShape(); }}
              onPointerDown={(event) => { if (shapeAnchor) cancelShape(); event.currentTarget.setPointerCapture(event.pointerId); const p = point(event.currentTarget, event.clientX, event.clientY); begin(p.x, p.y); }}
              onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const p = point(event.currentTarget, event.clientX, event.clientY); move(p.x, p.y); }}
              onPointerUp={end} onPointerCancel={end}
              onKeyDown={(event) => {
                const cursorPoint = keyboardPoint.current;
                const step = event.shiftKey ? 20 : 5;
                if (event.key === "Escape") { if (!shapeAnchor) return; cancelShape(); }
                else if (event.key === "ArrowLeft") cursorPoint.x = Math.max(0, cursorPoint.x - step);
                else if (event.key === "ArrowRight") cursorPoint.x = Math.min(WIDTH - 1, cursorPoint.x + step);
                else if (event.key === "ArrowUp") cursorPoint.y = Math.max(0, cursorPoint.y - step);
                else if (event.key === "ArrowDown") cursorPoint.y = Math.min(HEIGHT - 1, cursorPoint.y + step);
                else if (event.key === " " || event.key === "Enter") {
                  if (isShape) {
                    if (shapeAnchor) { move(cursorPoint.x, cursorPoint.y); end(); setShapeAnchor(false); }
                    else { begin(cursorPoint.x, cursorPoint.y); setShapeAnchor(true); }
                  } else { begin(cursorPoint.x, cursorPoint.y); end(); }
                }
                else return;
                if (shapeAnchor && event.key.startsWith("Arrow")) move(cursorPoint.x, cursorPoint.y);
                setKeyboardCursor({ ...cursorPoint });
                event.preventDefault();
              }} />
            {keyboardCursor ? <span aria-hidden="true" className="pointer-events-none absolute size-3 rounded-full border-2 border-primary bg-white shadow-sm" style={{ left: (keyboardCursor.x / WIDTH * 100) + "%", top: (keyboardCursor.y / HEIGHT * 100) + "%", transform: "translate(-50%, -50%)" }} /> : null}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{shapeAnchor ? "Corner set. Move with the arrows, then press Space to finish. Escape cancels." : ""}</p>
      </div>
      <div className="rounded-[1.25rem] border bg-card p-3 sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-sm font-bold text-foreground">Your tools</h2>
          <span className="text-xs text-muted-foreground" aria-live="polite">{selectedTool}</span>
        </div>
        <div role="toolbar" aria-label="Drawing tools" className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {TOOLS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" title={item.label} aria-label={item.label} aria-pressed={tool === item.id}
            onClick={() => { if (shapeAnchor) cancelShape(); setTool(item.id); }}
            className={"grid min-h-12 place-items-center gap-1 rounded-xl border-2 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none " +
              (tool === item.id ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-secondary/70 text-foreground hover:border-border hover:bg-secondary")}>
            <Icon className="size-5" aria-hidden="true" />
            <span aria-hidden="true" className="hidden text-[11px] font-semibold leading-none sm:block">{item.short}</span>
          </button>; })}
        </div>
        <div className="mt-4 border-t pt-4">
          <p className="mb-3 px-1 text-sm font-bold">Colors</p>
          <div role="group" aria-label="Preset colors" className="flex flex-wrap gap-2">
            {SWATCHES.map((swatch, index) => <button key={swatch} type="button" title={COLOR_NAMES[index]}
              aria-label={COLOR_NAMES[index] + " color"} aria-pressed={color === swatch}
              onClick={() => setColor(swatch)} style={{ backgroundColor: swatch }}
              className={"size-10 rounded-full border-2 shadow-sm transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none " +
                (color === swatch ? "border-white ring-2 ring-primary ring-offset-2 ring-offset-card" : "border-black/10 dark:border-white/20")} />)}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <label className={"flex min-h-11 items-center gap-3 text-sm font-bold " + (!hasSize ? "opacity-50" : "") }>
            <span>Size</span>
            <input type="range" min="1" max="12" step="1" value={brushSize} disabled={!hasSize}
              onChange={(event) => setBrushSize(Number(event.target.value))} aria-label="Brush size"
              className="w-24 accent-primary sm:w-36" />
            <span className="grid size-8 place-items-center rounded-full bg-secondary" aria-hidden="true"><span className="rounded-full bg-primary" style={{ width: Math.min(24, Math.max(3, brushWidth(tool, brushSize))), height: Math.min(24, Math.max(3, brushWidth(tool, brushSize))) }} /></span>
            <output className="min-w-4 tabular-nums">{brushSize}</output>
          </label>
          <div className="flex items-center gap-2" role="group" aria-label="Edit drawing">
            <button type="button" title="Undo" aria-label="Undo" disabled={!history.undo} onClick={undo} className={iconButton}><Undo2 className="size-5" aria-hidden="true" /></button>
            <button type="button" title="Redo" aria-label="Redo" disabled={!history.redo} onClick={redo} className={iconButton}><Redo2 className="size-5" aria-hidden="true" /></button>
            <button type="button" title="Clear page" aria-label="Clear page" onClick={clearPage} className={iconButton}><Trash2 className="size-5" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground">
          <p>{draftState === "unavailable" ? "This browser cannot keep a draft. Keep the tab open until you send." : "Saved on this device until you send. Sent drawings stay as they are."}</p>
          {draftState === "unavailable" ? <button type="button" onClick={saveCopy} className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary underline underline-offset-4"><Download className="size-3.5" aria-hidden="true" />Save a copy</button> : null}
          {confirmDiscard ? <span role="group" aria-label="Discard this page?" className="inline-flex items-center gap-2">
            <span className="font-semibold text-foreground">Discard this page?</span>
            <Button type="button" size="sm" variant="outline" className="border-danger text-danger hover:bg-danger/10" onClick={discardDraft}>Discard</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDiscard(false)}>Keep</Button>
          </span> : <button type="button" onClick={() => setConfirmDiscard(true)} className="inline-flex min-h-8 items-center gap-1 font-semibold text-primary underline underline-offset-4"><X className="size-3.5" aria-hidden="true" />Discard draft</button>}
        </div>
        <Button type="button" className="min-h-12 shrink-0 gap-2 rounded-xl" onClick={openReview}>Review drawing <ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
    <div hidden={review === null} className="space-y-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">One last look</p>
        <h2 ref={reviewHeading} tabIndex={-1} className="mt-2 font-display text-3xl outline-none">Ready for {partner}?</h2>
      </div>
      <div className="rounded-[1.5rem] bg-[#f5dfe2] p-3 dark:bg-[#4b303a] sm:p-5">
        <div className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#713143] dark:text-[#f5c9d3]">Your finished drawing</div>
        {review ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review} alt="Preview of the finished drawing" className="aspect-[4/3] w-full rounded-[1rem] bg-white object-contain shadow-paper" />
        ) : null}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {canSend ? `Sending adds this page to your shared history and ${partner}'s widget. It cannot be revised.` : "Sending opens with a connected account. Your draft stays on this device."}
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center" aria-busy={pending}>
        <Button type="button" variant="outline" className="min-h-12 rounded-xl" disabled={pending} onClick={closeReview}>Keep drawing</Button>
        <Button type="button" className="min-h-12 gap-2 rounded-xl" disabled={pending || !canSend} onClick={send}>{pending ? "Sending…" : `Send to ${partner}`}<Send className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
    {message ? <p role="alert" className="status-message status-error">{message}</p> : null}
  </section>;
}
