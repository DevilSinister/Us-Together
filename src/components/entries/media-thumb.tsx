"use client";
import { useState } from "react";
import Image from "next/image";
import { Film, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small, non-interactive preview of one file.
 *
 * Deliberately not `MediaTile`: that component owns a `<button>` overlay, so it
 * cannot live inside a `<Link>`. This one renders spans and an image only, which
 * is what a whole-row link needs. The caller owns the box — size, radius,
 * `overflow-hidden`, `position: relative` and the resting `bg-secondary` — so the
 * same thumb serves a 64px row square and a full-width hero.
 *
 * A video is never fetched for a thumbnail; it shows its own mark instead.
 */
export function MediaThumb({ src, mediaType = "image", alt, sizes = "80px", eager = false, className }: {
  /** Resolved address, or null when the entry has no media at all. */
  src?: string | null;
  mediaType?: string;
  alt: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
}) {
  const image = mediaType === "image";
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  if (!src || !image) {
    return <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-muted-foreground">
      {src && !image ? <Film className="size-5"/> : <ImageOff className="size-4"/>}
    </span>;
  }

  return <>
    {status === "loading" ? <span aria-hidden="true" className="media-skeleton absolute inset-0"/> : null}

    {status === "error"
      ? <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-muted-foreground"><ImageOff className="size-4"/></span>
      : <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          className={cn(
            "object-cover transition-opacity duration-500 motion-reduce:transition-none",
            status === "ready" ? "opacity-100" : "opacity-0",
            className,
          )}
        />}
  </>;
}
