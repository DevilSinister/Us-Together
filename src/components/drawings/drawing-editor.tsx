"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Circle, Eraser, Highlighter, PaintBucket, PenLine, Pencil, Pipette, Redo2, Send, Square, Trash2, Undo2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fillPixels, HEIGHT, hexRgb, SWATCHES, WIDTH } from "@/lib/drawings/canvas";

type Tool = "pencil" | "marker" | "highlighter" | "fill" | "rectangle" | "ellipse" | "dropper" | "eraser";
const TOOLS: { id: Tool; label: string; icon: LucideIcon }[] = [
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "marker", label: "Marker", icon: PenLine },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "fill", label: "Paint bucket", icon: PaintBucket },
  { id: "rectangle", label: "Filled rectangle", icon: Square },
  { id: "ellipse", label: "Filled ellipse", icon: Circle },
  { id: "dropper", label: "Eyedropper", icon: Pipette },
  { id: "eraser", label: "Eraser", icon: Eraser },
];
const COLOR_NAMES = ["Ink", "Wine", "Pink", "Coral", "Orange", "Yellow", "Leaf", "Sage", "Sky", "Violet", "White"] as const;
function brushWidth(tool: Tool, size: number) {
  if (tool === "marker") return size * 2.5;
  if (tool === "highlighter") return size * 5;
  if (tool === "eraser") return size * 4.5;
  return size;
}
const DRAFT_KEY = "us-together-drawing-draft-v1";
const HISTORY_LIMIT = 20;
function point(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(WIDTH - 1, (clientX - rect.left) * WIDTH / rect.width)),
    y: Math.max(0, Math.min(HEIGHT - 1, (clientY - rect.top) * HEIGHT / rect.height)) };
}
function colorAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return "#" + [p[0], p[1], p[2]].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export function DrawingEditor() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<{ x: number; y: number; base?: ImageData } | null>(null);
  const pausedReview = useRef<string | null>(null);
  const undo = useRef<ImageData[]>([]);
  const redo = useRef<ImageData[]>([]);
  const keyboardPoint = useRef({ x: WIDTH / 2, y: HEIGHT / 2 });
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>(SWATCHES[1]);
  const [brushSize, setBrushSize] = useState(4);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [keyboardCursor, setKeyboardCursor] = useState<{ x: number; y: number } | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const ctx = () => canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;
  const changed = useCallback(() => { setRevision((n) => n + 1); setHistory({ undo: undo.current.length, redo: redo.current.length }); }, []);

  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, WIDTH, HEIGHT);
    let saved: string | null = null;
    try { saved = localStorage.getItem(DRAFT_KEY); } catch { saved = null; }
    if (saved) {
      const image = new Image();
      image.onload = () => { context.drawImage(image, 0, 0, WIDTH, HEIGHT); changed(); };
      image.src = saved;
    }
  }, [changed]);
  useEffect(() => {
    if (review !== null || !pausedReview.current || !canvasRef.current) return;
    const saved = pausedReview.current;
    pausedReview.current = null;
    const image = new Image();
    image.onload = () => {
      const context = canvasRef.current?.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, WIDTH, HEIGHT);
      context.drawImage(image, 0, 0, WIDTH, HEIGHT);
      changed();
    };
    image.src = saved;
  }, [review, changed]);
  useEffect(() => {
    if (!revision || review) return;
    const timer = window.setTimeout(() => {
      try { if (canvasRef.current) localStorage.setItem(DRAFT_KEY, canvasRef.current.toDataURL("image/png")); }
      catch { setMessage("This browser cannot keep a local draft. Keep the tab open until you send."); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [revision, review]);

  function remember(context: CanvasRenderingContext2D) {
    undo.current.push(context.getImageData(0, 0, WIDTH, HEIGHT));
    if (undo.current.length > HISTORY_LIMIT) undo.current.shift();
    redo.current = [];
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
    context.globalAlpha = tool === "highlighter" ? 0.28 : tool === "marker" ? 0.88 : 1;
    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.fillStyle = context.strokeStyle;
    context.lineWidth = brushWidth(tool, brushSize);
    context.lineCap = "round"; context.lineJoin = "round";
    context.beginPath(); context.arc(x, y, context.lineWidth / 2, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.moveTo(x, y);
    changed();
  }
  function move(x: number, y: number) {
    const context = ctx(), start = stroke.current;
    if (!context || !start) return;
    if (start.base) paintShape(context, start, { x, y }, start.base);
    else { context.lineTo(x, y); context.stroke(); }
    changed();
  }
  function end() { stroke.current = null; const context = ctx(); if (context) context.globalAlpha = 1; }
  function restore(source: React.RefObject<ImageData[]>, target: React.RefObject<ImageData[]>) {
    const context = ctx(), previous = source.current.pop();
    if (!context || !previous) return;
    target.current.push(context.getImageData(0, 0, WIDTH, HEIGHT));
    context.putImageData(previous, 0, 0); changed();
  }
  async function send() {
    if (!review || pending) return;
    setPending(true); setMessage("");
    try {
      const blob = await (await fetch(review)).blob();
      const form = new FormData(); form.set("image", blob, "drawing.png");
      const response = await fetch("/api/drawing-notes", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error ?? "Could not send. Try again.");
      localStorage.removeItem(DRAFT_KEY);
      router.push("/drawings/" + result.id); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not send. Try again."); }
    finally { setPending(false); }
  }
  const selectedTool = TOOLS.find((item) => item.id === tool)?.label ?? "Pencil";
  const hasSize = tool === "pencil" || tool === "marker" || tool === "highlighter" || tool === "eraser";
  return <section className="mt-6 space-y-4" aria-label="Drawing workspace">
    {!review ? <>
      <div className="rounded-[1.5rem] bg-[#f5dfe2] p-3 dark:bg-[#4b303a] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#713143] dark:text-[#f5c9d3]">
          <span>For your partner</span><span>Private draft</span>
        </div>
        <div className="relative overflow-hidden rounded-[1rem] bg-white p-1.5 shadow-paper sm:p-2">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} role="img"
            aria-label="Drawing canvas. Use a pointer to draw. With keyboard, arrow keys move the cursor; Space draws a mark; Enter uses fill or eyedropper."
            className="block aspect-[4/3] w-full rounded-[0.7rem] bg-white touch-none outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
            onFocus={() => setKeyboardCursor({ ...keyboardPoint.current })}
            onBlur={() => setKeyboardCursor(null)}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const p = point(event.currentTarget, event.clientX, event.clientY); begin(p.x, p.y); }}
            onPointerMove={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const p = point(event.currentTarget, event.clientX, event.clientY); move(p.x, p.y); }}
            onPointerUp={end} onPointerCancel={end}
            onKeyDown={(event) => {
              const cursor = keyboardPoint.current;
              const step = event.shiftKey ? 20 : 5;
              if (event.key === "ArrowLeft") cursor.x = Math.max(0, cursor.x - step);
              else if (event.key === "ArrowRight") cursor.x = Math.min(WIDTH - 1, cursor.x + step);
              else if (event.key === "ArrowUp") cursor.y = Math.max(0, cursor.y - step);
              else if (event.key === "ArrowDown") cursor.y = Math.min(HEIGHT - 1, cursor.y + step);
              else if (event.key === " " || event.key === "Enter") { begin(cursor.x, cursor.y); if (tool === "rectangle" || tool === "ellipse") move(Math.min(WIDTH - 1, cursor.x + 40), Math.min(HEIGHT - 1, cursor.y + 30)); end(); }
              else return;
              setKeyboardCursor({ ...cursor });
              event.preventDefault();
            }} />
          {keyboardCursor ? <span aria-hidden="true" className="pointer-events-none absolute size-3 rounded-full border-2 border-primary bg-white shadow-sm" style={{ left: (keyboardCursor.x / WIDTH * 100) + "%", top: (keyboardCursor.y / HEIGHT * 100) + "%", transform: "translate(-50%, -50%)" }} /> : null}
        </div>
      </div>
      <div className="rounded-[1.25rem] border bg-card p-3 sm:p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-sm font-bold text-foreground">Your tools</h2>
          <span className="text-xs text-muted-foreground" aria-live="polite">{selectedTool}</span>
        </div>
        <div role="toolbar" aria-label="Drawing tools" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TOOLS.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" title={item.label} aria-label={item.label} aria-pressed={tool === item.id}
            onClick={() => setTool(item.id)}
            className={"grid min-h-12 place-items-center rounded-xl border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
              (tool === item.id ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-secondary/70 text-foreground hover:border-border hover:bg-secondary")}>
            <Icon className="size-5" aria-hidden="true" />
          </button>; })}
        </div>
        <div className="mt-4 border-t pt-4">
          <p className="mb-3 px-1 text-sm font-bold">Colors</p>
          <div role="group" aria-label="Preset colors" className="flex flex-wrap gap-2">
            {SWATCHES.map((swatch, index) => <button key={swatch} type="button" title={COLOR_NAMES[index]}
              aria-label={COLOR_NAMES[index] + " color"} aria-pressed={color === swatch}
              onClick={() => setColor(swatch)} style={{ backgroundColor: swatch }}
              className={"size-10 rounded-full border-2 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
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
          <div className="flex items-center gap-2" aria-label="Edit drawing">
            <button type="button" title="Undo" aria-label="Undo" disabled={!history.undo} onClick={() => restore(undo, redo)} className="grid size-11 place-items-center rounded-xl bg-secondary text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary"><Undo2 className="size-5" aria-hidden="true" /></button>
            <button type="button" title="Redo" aria-label="Redo" disabled={!history.redo} onClick={() => restore(redo, undo)} className="grid size-11 place-items-center rounded-xl bg-secondary text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary"><Redo2 className="size-5" aria-hidden="true" /></button>
            <button type="button" title="Clear page" aria-label="Clear page" onClick={() => {
              const context = ctx(); if (!context) return;
              remember(context); context.fillStyle = "#ffffff"; context.globalAlpha = 1; context.fillRect(0, 0, WIDTH, HEIGHT); changed();
            }} className="grid size-11 place-items-center rounded-xl bg-secondary text-foreground focus-visible:outline-2 focus-visible:outline-primary"><Trash2 className="size-5" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">Saved on this device until you send. Sent drawings stay as they are.</p>
        <Button type="button" className="min-h-12 shrink-0 gap-2 rounded-xl" onClick={() => {
          const preview = canvasRef.current?.toDataURL("image/png") ?? null;
          pausedReview.current = preview;
          setReview(preview); setMessage("");
        }}>Review drawing <ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
    </> : <div className="space-y-5">
      <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">One last look</p><h2 className="mt-2 font-display text-3xl">Ready for your partner?</h2></div>
      <div className="rounded-[1.5rem] bg-[#f5dfe2] p-3 dark:bg-[#4b303a] sm:p-5">
        <div className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#713143] dark:text-[#f5c9d3]">Your finished drawing</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={review} alt="Preview of the finished drawing" className="aspect-[4/3] w-full rounded-[1rem] bg-white object-contain shadow-paper" />
      </div>
      <p className="text-center text-sm text-muted-foreground">Sending adds this page to your shared history and your partner&apos;s widget. It cannot be revised.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" className="min-h-12 rounded-xl" disabled={pending} onClick={() => setReview(null)}>Keep drawing</Button>
        <Button type="button" className="min-h-12 gap-2 rounded-xl" disabled={pending} onClick={send}>{pending ? "Sending..." : "Send drawing"}<Send className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>}
    {message ? <p role="alert" className="status-message status-error">{message}</p> : null}
  </section>;
}
