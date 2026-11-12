"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Circle, Download, Eraser, Highlighter, PaintBucket, PenLine, Pencil, Pipette, Redo2, Send, SprayCan, Square, Trash2, Undo2, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fillPixels, HEIGHT, hexRgb, SWATCHES, WIDTH } from "@/lib/drawings/canvas";

type Tool = "pencil" | "marker" | "highlighter" | "airbrush" | "fill" | "rectangle" | "ellipse" | "dropper" | "eraser";
// The mockup's order: the stroke tools, then fill and the color picker. The two
// shapes follow; on a phone they sit just past the edge of the scrolling row.
const TOOLS: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "marker", label: "Marker", icon: PenLine },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "airbrush", label: "Airbrush", icon: SprayCan },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "fill", label: "Fill", icon: PaintBucket },
  { id: "dropper", label: "Pick a color from the page", icon: Pipette },
  { id: "rectangle", label: "Filled rectangle", icon: Square },
  { id: "ellipse", label: "Filled ellipse", icon: Circle },
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
  async function saveCopy() {
    if (!canvasRef.current) return;
    const blob = await toBlob(canvasRef.current);
    if (blob) download(blob, "drawing-draft.png");
  }
  /** True once anything other than white paper is on the page. */
  function hasInk() {
    const context = ctx(); if (!context) return false;
    const data = context.getImageData(0, 0, WIDTH, HEIGHT).data;
    for (let i = 0; i < data.length; i += 4) if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) return true;
    return false;
  }
  async function openReview() {
    if (!canvasRef.current) return;
    if (!hasInk()) { setMessage("The page is still blank. A few lines are enough."); canvasRef.current.focus(); return; }
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
  const square = "grid size-11 shrink-0 place-items-center rounded-control border transition-[background-color,border-color,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";
  const quiet = "border-border bg-transparent text-foreground hover:bg-secondary";

  return <section aria-label="Drawing workspace">
    <div hidden={review !== null} aria-hidden={review !== null}>
      <EditorBar title={`For ${partner}`} close={{ href: "/drawings", label: "Close without sending" }}>
        <button type="button" onClick={openReview}
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-[background-color,scale] duration-150 hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none">
          <Send className="size-4" aria-hidden="true" />Send
        </button>
      </EditorBar>
      <Paper>
        <div className="relative mx-auto w-fit">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} role="img"
            aria-label={"Drawing canvas. Use a pointer to draw. With keyboard, arrow keys move the cursor; Space draws a mark; Enter uses fill or the color picker." + (isShape ? " For shapes, press Space once to set a corner, move with the arrows, then press Space again. Escape cancels." : "")}
            className="block aspect-[4/3] h-auto max-h-[min(56dvh,30rem)] w-auto max-w-full rounded-control bg-white touch-none outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
            onFocus={() => setKeyboardCursor({ ...keyboardPoint.current })}
            onBlur={() => { setKeyboardCursor(null); if (shapeAnchor) cancelShape(); }}
            onPointerDown={(event) => { if (shapeAnchor) cancelShape(); setMessage(""); event.currentTarget.setPointerCapture(event.pointerId); const p = point(event.currentTarget, event.clientX, event.clientY); begin(p.x, p.y); }}
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
                setMessage("");
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
        <p className="sr-only" aria-live="polite">{shapeAnchor ? "Corner set. Move with the arrows, then press Space to finish. Escape cancels." : ""}</p>
      </Paper>

      <div className="flex flex-col gap-3.5 px-5 pb-6 pt-4 sm:px-8 md:px-0">
        {/* Nine 44px tools do not fit a phone's width, so the row scrolls and the next tool shows at the edge. */}
        <div role="toolbar" aria-label="Tools" className="-mx-5 flex gap-[7px] overflow-x-auto px-5 [mask-image:linear-gradient(to_right,#000_calc(100%-1.25rem),transparent)] [scrollbar-width:none] sm:mx-0 sm:justify-between sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
          {TOOLS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" title={item.label} aria-label={item.label} aria-pressed={tool === item.id}
            onClick={() => { if (shapeAnchor) cancelShape(); setTool(item.id); }}
            className={cn(square, tool === item.id ? "border-primary bg-primary text-primary-foreground" : quiet)}>
            <Icon className="size-5" aria-hidden="true" />
          </button>; })}
        </div>
        <p className="sr-only" aria-live="polite">{selectedTool}</p>

        <div role="group" aria-label="Colors" className="flex flex-wrap gap-[7px]">
          {SWATCHES.map((swatch, index) => <button key={swatch} type="button" title={COLOR_NAMES[index]}
            aria-label={COLOR_NAMES[index]} aria-pressed={color === swatch}
            onClick={() => setColor(swatch)} style={{ backgroundColor: swatch }}
            className={cn("size-11 shrink-0 rounded-full border border-border transition-[outline-color,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none",
              color === swatch && "outline-2 outline-offset-2 outline-foreground")} />)}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" title="Undo" aria-label="Undo" disabled={!history.undo} onClick={undo} className={cn(square, quiet)}><Undo2 className="size-5" aria-hidden="true" /></button>
          <button type="button" title="Redo" aria-label="Redo" disabled={!history.redo} onClick={redo} className={cn(square, quiet)}><Redo2 className="size-5" aria-hidden="true" /></button>
          <button type="button" title="Clear the page" aria-label="Clear the page" onClick={clearPage} className={cn(square, quiet)}><Trash2 className="size-5" aria-hidden="true" /></button>
          <label className={cn("flex flex-1 items-center gap-2.5 pl-2 text-[13px] text-muted-foreground", !hasSize && "opacity-50")}>
            Size
            <input type="range" min="1" max="12" step="1" value={brushSize} disabled={!hasSize} aria-label="Brush size"
              onChange={(event) => setBrushSize(Number(event.target.value))}
              className="h-11 min-w-0 flex-1 accent-primary" />
          </label>
        </div>

        {draftState === "unavailable"
          ? <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground">
              This browser cannot keep a draft. Keep the tab open until you send.
              <button type="button" onClick={saveCopy} className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline underline-offset-4"><Download className="size-3.5" aria-hidden="true" />Save a copy</button>
            </p>
          : <p className="text-[13px] text-muted-foreground">Kept on this device until you send. Clearing the page can be undone.</p>}
        {message && review === null ? <p role="alert" className="status-message status-error">{message}</p> : null}
      </div>
    </div>

    <div hidden={review === null}>
      <EditorBar title={`For ${partner}`} close={{ onClick: closeReview, label: "Keep drawing", back: true }} />
      <Paper>
        {review ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review} alt="Preview of the finished drawing" className="mx-auto aspect-[4/3] max-h-[min(56dvh,30rem)] w-auto max-w-full rounded-control bg-white object-contain" />
        ) : null}
      </Paper>
      <div className="flex flex-col gap-4 px-5 pb-6 pt-5 sm:px-8 md:px-0" aria-busy={pending}>
        <div>
          <h2 ref={reviewHeading} tabIndex={-1} className="font-display text-[22px] leading-snug outline-none">Ready for {partner}?</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {canSend ? `It goes into your drawings and onto ${partner}'s widget. A sent drawing stays as it is.` : "Sending opens with a connected account. Your draft stays on this device."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="min-h-12 gap-2" disabled={pending || !canSend} onClick={send}><Send className="size-4" aria-hidden="true" />{pending ? "Sending…" : `Send to ${partner}`}</Button>
          <Button type="button" variant="outline" className="min-h-12" disabled={pending} onClick={closeReview}>Keep drawing</Button>
        </div>
        {message && review !== null ? <p role="alert" className="status-message status-error">{message}</p> : null}
      </div>
    </div>
  </section>;
}

/** The paper on its raised field: edge to edge on a phone, a rounded panel from tablet width. */
function Paper({ children }: { children: React.ReactNode }) {
  return <div className="bg-secondary p-5 md:rounded-panel">{children}</div>;
}

/**
 * The editor's own top bar, which stands in for the app header on a phone: a
 * way out on the left, who the drawing is for, and the one action on the right.
 */
export function EditorBar({ title, close, children }: {
  title: string;
  close: { href: string; label: string } | { onClick: () => void; label: string; back: true };
  children?: React.ReactNode;
}) {
  const target = "grid size-11 shrink-0 place-items-center rounded-control text-foreground transition-[background-color,scale] duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none";
  return <div className="flex h-14 items-center justify-between gap-3 pl-2 pr-4 sm:pl-5 sm:pr-8 md:px-0">
    {"href" in close
      ? <Link href={close.href} aria-label={close.label} title={close.label} className={target}><X className="size-5" aria-hidden="true" /></Link>
      : <button type="button" onClick={close.onClick} aria-label={close.label} title={close.label} className={target}><ChevronLeft className="size-6" aria-hidden="true" /></button>}
    <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
    {children ?? <span aria-hidden="true" className="size-11 shrink-0" />}
  </div>;
}
