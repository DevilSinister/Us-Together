"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fillPixels, HEIGHT, hexRgb, SWATCHES, WIDTH } from "@/lib/drawings/canvas";

type Tool = "pencil" | "marker" | "highlighter" | "fill" | "rectangle" | "ellipse" | "dropper" | "eraser";
const TOOLS: { id: Tool; label: string }[] = [
  { id: "pencil", label: "Pencil" }, { id: "marker", label: "Marker" },
  { id: "highlighter", label: "Highlighter" }, { id: "fill", label: "Paint bucket" },
  { id: "rectangle", label: "Filled rectangle" }, { id: "ellipse", label: "Filled ellipse" },
  { id: "dropper", label: "Eyedropper" }, { id: "eraser", label: "Eraser" },
];
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
    const saved = localStorage.getItem(DRAFT_KEY);
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
    context.lineWidth = tool === "highlighter" ? 22 : tool === "marker" ? 10 : tool === "eraser" ? 18 : 2;
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
  return <section className="mt-8 space-y-5">
    <p className="text-sm text-muted-foreground">Your work stays on this device until you send it. A finished drawing cannot be changed.</p>
    {!review ? <>
      <div role="toolbar" aria-label="Drawing tools" className="flex flex-wrap gap-2">
        {TOOLS.map((item) => <button key={item.id} type="button" aria-pressed={tool === item.id}
          onClick={() => setTool(item.id)}
          className={"min-h-11 rounded-control border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
            (tool === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary")}>{item.label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Color</span>
        {SWATCHES.map((swatch) => <button key={swatch} type="button" aria-label={"Color " + swatch} aria-pressed={color === swatch}
          onClick={() => setColor(swatch)} style={{ backgroundColor: swatch }}
          className={"size-11 rounded-full border-2 " + (color === swatch ? "outline-2 outline-offset-2 outline-primary" : "border-border")} />)}
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">Custom color
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)}
            className="size-10 cursor-pointer rounded-control border border-border bg-card" />
        </label>
      </div>
      <div className="relative overflow-hidden rounded-panel border border-border bg-white shadow-paper">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} role="img"
          aria-label="Drawing canvas. Use a pointer to draw. With keyboard, arrow keys move the cursor; Space draws a mark; Enter uses fill or eyedropper."
          className="block aspect-[4/3] w-full touch-none outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
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
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!history.undo} onClick={() => restore(undo, redo)}>Undo</Button>
        <Button type="button" variant="outline" disabled={!history.redo} onClick={() => restore(redo, undo)}>Redo</Button>
        <Button type="button" variant="outline" onClick={() => {
          const context = ctx(); if (!context) return;
          remember(context); context.fillStyle = "#ffffff"; context.globalAlpha = 1; context.fillRect(0, 0, WIDTH, HEIGHT); changed();
        }}>Clear page</Button>
        <Button type="button" onClick={() => {
          const preview = canvasRef.current?.toDataURL("image/png") ?? null;
          pausedReview.current = preview;
          setReview(preview); setMessage("");
        }}>Review to send</Button>
      </div>
    </> : <div className="space-y-5">
      <h2 className="font-display text-3xl">Ready for your partner?</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={review} alt="Preview of the finished drawing" className="aspect-[4/3] w-full rounded-panel border border-border bg-white object-contain" />
      <p className="text-sm text-muted-foreground">Sending puts this drawing in your shared history and on your partner&apos;s Android widget. It cannot be revised.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={() => setReview(null)}>Keep drawing</Button>
        <Button type="button" disabled={pending} onClick={send}>{pending ? "Sending..." : "Send drawing"}</Button>
      </div>
    </div>}
    {message ? <p role="alert" className="status-message status-error">{message}</p> : null}
  </section>;
}
