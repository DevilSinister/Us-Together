"use client";

import Link from "next/link";
import { MediaThumb } from "@/components/entries/media-thumb";
import { usePreviewImages, type CoverImage, type PhotoSource, type PreviewEntry } from "@/components/app/cover-photo";
import { mediaHref } from "@/lib/entries/media-url";

/** The four newest photographs across memories and moments, each opening its own gallery. */
export function RecentPhotos({ hosted, previewSession, previewEntries }: {
  hosted: CoverImage[];
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

  const photos: PhotoSource[] = previewSession
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
