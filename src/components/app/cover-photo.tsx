"use client";

import { useEffect, useState } from "react";
import { mediaHref } from "@/lib/entries/media-url";
import { previewMedia } from "@/lib/entries/preview-media";
import type { EntryKind } from "@/lib/entries/types";

/** A ready photograph the server already found, addressed through the authorized media route. */
export type CoverImage = { id: string; kind: EntryKind; entryId: string };
/** An entry whose photos live in this browser, in the developer preview. */
export type PreviewEntry = { kind: EntryKind; id: string };
export type PhotoSource = { src: string; kind: EntryKind; entryId: string };

/**
 * The developer preview keeps its files in this browser, so there a page reads
 * them from local storage instead of asking the server. Entries are scanned in
 * order until `limit` photos are found; every blob URL not shown is released.
 * Null while reading.
 */
export function usePreviewImages(session: string | undefined, entries: PreviewEntry[], limit: number): PhotoSource[] | null {
  const key = entries.map((entry) => `${entry.kind}:${entry.id}`).join(",");
  const [found, setFound] = useState<PhotoSource[] | null>(null);

  useEffect(() => {
    if (!session || !key) return;
    const list = key.split(",").map((part) => {
      const [kind, id] = part.split(":");
      return { kind: kind as EntryKind, id };
    });
    let live = true;
    let kept: string[] = [];
    void (async () => {
      const sources: PhotoSource[] = [];
      for (const entry of list) {
        if (sources.length >= limit) break;
        const files = await previewMedia({ ...entry, previewSession: session }).catch(() => []);
        for (const file of files) {
          const url = file.previewUrl ?? file.url;
          const shown = file.media_type === "image" && url && sources.length < limit ? url : null;
          if (shown) sources.push({ src: shown, kind: entry.kind, entryId: entry.id });
          for (const candidate of [file.url, file.previewUrl]) if (candidate && candidate !== shown) URL.revokeObjectURL(candidate);
        }
      }
      kept = sources.map((source) => source.src);
      if (live) setFound(sources);
      else kept.forEach((url) => URL.revokeObjectURL(url));
    })();
    return () => {
      live = false;
      kept.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [session, key, limit]);

  return key ? found : [];
}

/**
 * The photograph behind a cover, with the scrim that keeps the title readable.
 * Absent until there is a photo, so the cover's own field shows through
 * instead. Decorative: the cover's text names what is pictured.
 */
export function CoverPhoto({ photo, previewSession, previewEntry }: {
  photo: CoverImage | null;
  previewSession?: string;
  previewEntry: PreviewEntry | null;
}) {
  const preview = usePreviewImages(previewSession, previewSession && previewEntry ? [previewEntry] : [], 1);
  const src = previewSession ? preview?.[0]?.src : photo ? mediaHref(photo.id, photo.kind, "preview") : null;
  if (!src) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full object-cover"
      />
      <span aria-hidden="true" className="cover-scrim absolute inset-0" />
    </>
  );
}
