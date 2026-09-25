"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Crosshair, ImagePlus, RotateCcw, RotateCw, SlidersHorizontal, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { clampCrop, drawPlan, imageBox, INITIAL_CROP, MAX_ZOOM, MIN_ZOOM, OUTPUT_SIZE, rotate, type Crop } from "@/lib/avatar/crop";
import { cn } from "@/lib/utils";

const SOURCE_LIMIT = 25 * 1024 * 1024;

type Source = { file: File; url: string; bitmap: ImageBitmap; width: number; height: number };

/**
 * A profile picture you frame before it is saved.
 *
 * Choosing a photo opens an editor: drag to move it, pinch, scroll or slide to
 * zoom, turn it a quarter at a time, and snap it back to the centre. The circle
 * in the editor is the avatar exactly as it will be cut.
 *
 * The server never sees the original. "Use photo" draws the framing onto a
 * 640px square canvas and places that JPEG into an ordinary named file input,
 * so the existing server action, its validation and the bucket's own limits
 * apply unchanged. A 640px JPEG is a small fraction of the 2 MB cap, which is
 * also why the chooser can now take any photo the browser can open.
 */
export function AvatarField({ name, label, currentSrc, fallback, previewAlt }: {
  /** The form field the framed JPEG is submitted under. */
  name: string;
  label: React.ReactNode;
  /** The picture already saved, if any, shown until a new one is framed. */
  currentSrc?: string | null;
  /** What the circle shows with no picture at all - the initials. */
  fallback: React.ReactNode;
  previewAlt: string;
}) {
  const id = useId();
  const chooser = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [crop, setCrop] = useState<Crop>(INITIAL_CROP);
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<{ url: string; crop: Crop } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Blob URLs and decoded bitmaps are released whenever they are replaced.
  useEffect(() => () => { if (source) { URL.revokeObjectURL(source.url); source.bitmap.close(); } }, [source]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  function attach(file: File | null) {
    if (!output.current) return;
    const transfer = new DataTransfer();
    if (file) transfer.items.add(file);
    output.current.files = transfer.files;
  }

  async function choose(file: File | undefined) {
    if (chooser.current) chooser.current.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose a photo rather than another kind of file.");
    if (file.size > SOURCE_LIMIT) return setError("Choose a photo under 25 MB.");
    try {
      // `from-image` applies the camera's orientation flag, so a phone portrait
      // arrives upright rather than on its side.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      setSource({ file, url: URL.createObjectURL(file), bitmap, width: bitmap.width, height: bitmap.height });
      setCrop(INITIAL_CROP);
      setEditing(true);
    } catch {
      setError("This photo could not be opened here. Try a JPG, PNG or WebP.");
    }
  }

  async function apply() {
    if (!source) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw Error();
      // A JPEG has no transparency; a transparent PNG lands on paper, not black.
      context.fillStyle = "#fbf7f3";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.imageSmoothingQuality = "high";
      const plan = drawPlan(crop, source.width, source.height);
      context.translate(plan.translateX, plan.translateY);
      context.rotate(plan.radians);
      context.drawImage(source.bitmap, -plan.drawWidth / 2, -plan.drawHeight / 2, plan.drawWidth, plan.drawHeight);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw Error();
      attach(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      setResult({ url: URL.createObjectURL(blob), crop });
      setEditing(false);
      setError("");
    } catch {
      setError("We could not prepare that photo. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setEditing(false);
    // Backing out of a first edit forgets the photo; backing out of a re-edit
    // keeps the framing already chosen.
    if (result) setCrop(result.crop);
    else setSource(null);
  }

  function discard() {
    attach(null);
    setResult(null);
    setSource(null);
  }

  const shown = result?.url ?? currentSrc ?? null;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border bg-secondary font-display text-4xl text-primary">
        {fallback}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shown ? <img src={shown} alt={previewAlt} className="absolute inset-0 size-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <Label htmlFor={id}>{label}</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label htmlFor={id} className="col-span-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border bg-field px-4 text-sm font-semibold hover:bg-secondary focus-within:ring-2 focus-within:ring-ring">
            <ImagePlus className="size-4" aria-hidden="true" />{shown ? "Choose another" : "Choose a photo"}
            <input ref={chooser} id={id} type="file" accept="image/*" className="sr-only" onChange={(event) => void choose(event.target.files?.[0])} />
          </label>
          {result ? (
            <>
              <Button type="button" variant="outline" onClick={() => setEditing(true)}><SlidersHorizontal className="size-4" aria-hidden="true" />Adjust</Button>
              <Button type="button" variant="ghost" onClick={discard}><Undo2 className="size-4" aria-hidden="true" />Undo</Button>
            </>
          ) : null}
        </div>
        {/* The framed JPEG, and only it, is what the form submits. */}
        <input ref={output} name={name} type="file" accept="image/jpeg" tabIndex={-1} aria-hidden="true" className="sr-only" />
        {error
          ? <p role="alert" className="field-error mt-2">{error}</p>
          : <p className="mt-2 text-xs leading-5 text-muted-foreground">{result ? "Framed and ready. It is saved with the rest of this form." : "Any photo from your device. You frame it before it is saved."}</p>}
      </div>

      <Dialog open={editing && !!source} onOpenChange={(open) => { if (!open) cancel(); }}>
        <DialogContent title="Frame the photo" dismissible={!busy} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Frame the photo</DialogTitle>
            <DialogDescription>Drag to move it. Pinch, scroll or use the slider to zoom. The circle is exactly what will show.</DialogDescription>
          </DialogHeader>
          {source ? <CropStage source={source} crop={crop} onCrop={setCrop} /> : null}
          <div className="mt-5 flex items-center gap-3">
            <button type="button" aria-label="Zoom out" onClick={() => source && setCrop((c) => clampCrop({ ...c, zoom: c.zoom - 0.25 }, source.width, source.height))} className="grid size-11 shrink-0 place-items-center rounded-control text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <ZoomOut className="size-5" aria-hidden="true" />
            </button>
            <input
              type="range"
              aria-label="Zoom"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              onChange={(event) => source && setCrop((c) => clampCrop({ ...c, zoom: Number(event.target.value) }, source.width, source.height))}
              className="h-11 min-w-0 flex-1 accent-primary"
            />
            <button type="button" aria-label="Zoom in" onClick={() => source && setCrop((c) => clampCrop({ ...c, zoom: c.zoom + 0.25 }, source.width, source.height))} className="grid size-11 shrink-0 place-items-center rounded-control text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <ZoomIn className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <StageTool label="Rotate left" short="Left" icon={RotateCcw} onClick={() => source && setCrop((c) => clampCrop({ ...c, rotation: rotate(c.rotation, -1) }, source.width, source.height))} />
            <StageTool label="Rotate right" short="Right" icon={RotateCw} onClick={() => source && setCrop((c) => clampCrop({ ...c, rotation: rotate(c.rotation, 1) }, source.width, source.height))} />
            <StageTool label="Center the photo" short="Center" icon={Crosshair} disabled={crop.x === 0 && crop.y === 0} onClick={() => setCrop((c) => ({ ...c, x: 0, y: 0 }))} />
            <StageTool label="Reset framing" short="Reset" icon={Undo2} disabled={crop.x === 0 && crop.y === 0 && crop.zoom === 1 && crop.rotation === 0} onClick={() => setCrop(INITIAL_CROP)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>Cancel</Button>
            <Button type="button" disabled={busy} onClick={() => void apply()}>{busy ? "Preparing…" : "Use photo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StageTool({ label, short, icon: Icon, onClick, disabled }: { label: string; short: string; icon: typeof RotateCw; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-control border text-xs font-semibold text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="size-4" aria-hidden="true" />{short}
    </button>
  );
}

/**
 * The window you frame through. Pointer input is handled here: one finger or
 * the mouse pans, two fingers pinch, the wheel zooms, and the arrow keys pan
 * when the window has focus. Every change is clamped, so the photo can never
 * be dragged off the circle.
 */
function CropStage({ source, crop, onCrop }: { source: Source; crop: Crop; onCrop: React.Dispatch<React.SetStateAction<Crop>> }) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const hintId = useId();
  const { width, height } = source;

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const update = useCallback((change: (c: Crop) => Crop) => onCrop((c) => clampCrop(change(c), width, height)), [onCrop, width, height]);

  // React registers wheel listeners as passive, and a passive listener cannot
  // stop the dialog from scrolling underneath the zoom.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      update((c) => ({ ...c, zoom: c.zoom * Math.exp(-event.deltaY * 0.0015) }));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [update]);

  function spread() {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  }

  const box = imageBox(width, height, crop.rotation, crop.zoom);

  return (
    <div className="mt-5">
      <div
        ref={stage}
        tabIndex={0}
        role="application"
        aria-roledescription="photo framing window"
        aria-label="Photo framing window"
        aria-describedby={hintId}
        className={cn(
          "relative mx-auto aspect-square w-full max-w-[20rem] touch-none select-none overflow-hidden rounded-panel bg-[#1c1417] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={(event) => {
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* a released pointer cannot be captured */ }
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          pinch.current = spread();
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId);
          if (!previous || !size) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size > 1) {
            const now = spread();
            if (now && pinch.current) {
              const factor = now / pinch.current;
              update((c) => ({ ...c, zoom: c.zoom * factor }));
            }
            pinch.current = now;
            return;
          }
          const dx = (event.clientX - previous.x) / size;
          const dy = (event.clientY - previous.y) / size;
          update((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = spread();
          if (!pointers.current.size) setDragging(false);
        }}
        onPointerCancel={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
          if (!pointers.current.size) setDragging(false);
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.08 : 0.02;
          const moves: Record<string, (c: Crop) => Crop> = {
            ArrowLeft: (c) => ({ ...c, x: c.x - step }),
            ArrowRight: (c) => ({ ...c, x: c.x + step }),
            ArrowUp: (c) => ({ ...c, y: c.y - step }),
            ArrowDown: (c) => ({ ...c, y: c.y + step }),
            "+": (c) => ({ ...c, zoom: c.zoom + 0.1 }),
            "=": (c) => ({ ...c, zoom: c.zoom + 0.1 }),
            "-": (c) => ({ ...c, zoom: c.zoom - 0.1 }),
          };
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          update(move);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source.url}
          alt=""
          draggable={false}
          className={cn("pointer-events-none absolute left-1/2 top-1/2 max-w-none", dragging ? null : "transition-transform duration-200 ease-out motion-reduce:transition-none")}
          style={{
            width: box.width * 100 + "%",
            height: box.height * 100 + "%",
            transform: `translate(calc(-50% + ${crop.x * size}px), calc(-50% + ${crop.y * size}px)) rotate(${crop.rotation}deg)`,
          }}
        />
        {/* Everything outside the circle is dimmed; the circle is the avatar. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_rgb(28_20_23/0.62)] ring-1 ring-white/70" />
        {dragging ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute inset-y-0 left-1/3 w-px bg-white/35" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-white/35" />
            <span className="absolute inset-x-0 top-1/3 h-px bg-white/35" />
            <span className="absolute inset-x-0 top-2/3 h-px bg-white/35" />
          </span>
        ) : null}
      </div>
      <p id={hintId} className="sr-only">Use the arrow keys to move the photo, and plus or minus to zoom.</p>
    </div>
  );
}
