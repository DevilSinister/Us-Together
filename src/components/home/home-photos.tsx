"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MediaThumb } from "@/components/entries/media-thumb";
import { mediaHref } from "@/lib/entries/media-url";
import { previewMedia } from "@/lib/entries/preview-media";
import type { EntryKind } from "@/lib/entries/types";

/** A ready photograph the server already found, addressed through the authorized media route. */
export type HomePhoto = { id: string; kind: EntryKind; entryId: string };
/** An entry whose photos live in this browser, in the developer preview. */
export type PreviewEntry = { kind: EntryKind; id: string };

type Source = { src: string; kind: EntryKind; entryId: string };

/**
 * The developer preview keeps its files in this browser, so there Home reads
 * them from local storage instead of asking the server. Entries are scanned in
 * order until `limit` photos are found; every blob URL not shown is released.
 * Null while reading.
 */
function usePreviewImages(session: string | undefined, entries: PreviewEntry[], limit: number): Source[] | null {
  const key = entries.map((entry) => `${entry.kind}:${entry.id}`).join(",");
  const [found, setFound] = useState<Source[] | null>(null);

  useEffect(() => {
    if (!session || !key) return;
    const list = key.split(",").map((part) => {
      const [kind, id] = part.split(":");
      return { kind: kind as EntryKind, id };
    });
    let live = true;
    let kept: string[] = [];
    void (async () => {
      const sources: Source[] = [];
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
 * The photograph behind Home's cover, with the scrim that keeps the title
 * readable. Absent until there is a photo, so the cover's own field shows
 * through instead. Decorative: the link under the title names the memory.
 */
export function CoverPhoto({ hosted, previewSession, previewEntry }: {
  hosted: HomePhoto | null;
  previewSession?: string;
  previewEntry: PreviewEntry | null;
}) {
  const preview = usePreviewImages(previewSession, previewSession && previewEntry ? [previewEntry] : [], 1);
  const src = previewSession ? preview?.[0]?.src : hosted ? mediaHref(hosted.id, hosted.kind, "preview") : null;
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

/** The four newest photographs across memories and moments, each opening its own gallery. */
export function RecentPhotos({ hosted, previewSession, previewEntries }: {
  hosted: HomePhoto[];
  previewSession?: string;
  previewEntries: PreviewEntry[];
}) {
  const preview = usePreviewImages(previewSession, previewSession ? previewEntries : [], 4);

  if (previewSession && preview === null) {
    return (
      <ul aria-hidden="true" className="grid grid-cols-4 gap-2 lg:grid-cols-2">
        {[0, 1, 2, 3].map((index) => <li key={index} className="media-skeleton aspect-square rounded-control" />)}
      </ul>
    );
  }

  const photos: Source[] = previewSession
    ? preview ?? []
    : hosted.map((photo) => ({ src: mediaHref(photo.id, photo.kind, "preview"), kind: photo.kind, entryId: photo.entryId }));

  if (!photos.length) {
    return <p className="text-sm leading-6 text-muted-foreground">Photos you add to memories and moments gather here.</p>;
  }

  return (
    <ul className="grid grid-cols-4 gap-2 lg:grid-cols-2">
      {photos.map((photo, index) => (
        <li key={photo.src}>
          <Link
            href={`/gallery?kind=${photo.kind}&entry=${encodeURIComponent(photo.entryId)}`}
            aria-label={`Photo ${index + 1}, open its ${photo.kind} gallery`}
            className="relative block aspect-square overflow-hidden rounded-control bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <MediaThumb src={photo.src} alt="" sizes="(min-width: 1024px) 10rem, 25vw" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
