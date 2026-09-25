"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { mediaHref } from "@/lib/entries/media-url";
import { previewMedia } from "@/lib/entries/preview-media";
import { cn } from "@/lib/utils";

/**
 * A memory's first photographs as a small stack of prints: the lead photo on
 * top, tilted a little, with up to two more peeking out behind it. Alternate
 * entries lean the other way, so a long timeline reads as a handled album
 * rather than a column of identical thumbnails. Hovering or focusing the entry
 * straightens the lead print.
 *
 * Addresses always go through the authorized media route - the ids only say
 * which files to ask for. The developer preview keeps its files in this
 * browser, so there the stack reads them from local storage instead, and
 * renders nothing when the entry has no photos.
 */
export function StoryPrints({ kind, entryId, ids, previewSession, title, lean }: {
  kind: "memory" | "moment";
  entryId: string;
  ids: string[];
  previewSession?: string;
  title: string;
  lean: 1 | -1;
}) {
  const [local, setLocal] = useState<string[] | null>(null);

  useEffect(() => {
    if (!previewSession) return;
    let urls: string[] = [];
    let live = true;
    previewMedia({ kind, id: entryId, previewSession })
      .then((files) => {
        const images = files.filter((file) => file.media_type === "image").slice(0, 3);
        urls = images.map((file) => file.previewUrl ?? file.url ?? "").filter(Boolean);
        // Every file hands back two blob URLs; the ones not shown are released now.
        for (const file of files) for (const url of [file.url, file.previewUrl]) if (url && !urls.includes(url)) URL.revokeObjectURL(url);
        if (live) setLocal(urls); else urls.forEach((url) => URL.revokeObjectURL(url));
      })
      .catch(() => { if (live) setLocal([]); });
    return () => { live = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [kind, entryId, previewSession]);

  const sources = previewSession ? local ?? [] : ids.map((id) => mediaHref(id, kind, "preview"));
  if (!sources.length) return null;
  const [lead, ...behind] = sources;

  return (
    <div className="relative mx-1 mb-2 mt-4 aspect-[4/3] w-[calc(100%-0.5rem)] max-w-md">
      {behind.map((src, i) => (
        <Print
          key={src}
          src={src}
          alt=""
          className={cn("absolute inset-0", i === 0 ? "opacity-95" : "opacity-85")}
          style={{ transform: `rotate(${lean * (i === 0 ? 3.5 : -2.5)}deg) translate(${lean * (i === 0 ? 10 : -8)}px, ${i === 0 ? -6 : 4}px)` }}
        />
      ))}
      <Print
        src={lead}
        alt={title}
        className="absolute inset-0 rotate-(--lean) shadow-paper transition-[rotate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-0 group-focus-visible:rotate-0 motion-reduce:transition-none"
        style={{ "--lean": `${lean * -1.25}deg` } as React.CSSProperties}
      />
    </div>
  );
}

function Print({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return (
    <span className={cn("block overflow-hidden rounded-control border bg-card p-1.5 sm:p-2", className)} style={style}>
      <span className="relative block size-full overflow-hidden rounded-[calc(var(--radius-control)-2px)] bg-secondary">
        {status === "loading" ? <span aria-hidden="true" className="media-skeleton absolute inset-0" /> : null}
        {status === "error"
          ? <span className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageOff className="size-5" aria-hidden="true" /></span>
          : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setStatus("ready")}
              onError={() => setStatus("error")}
              className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none", status === "ready" ? "opacity-100" : "opacity-0")}
            />
          )}
      </span>
    </span>
  );
}
