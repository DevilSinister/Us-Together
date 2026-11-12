"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mediaHref } from "@/lib/entries/media-url";
import { previewMedia } from "@/lib/entries/preview-media";
import { cn } from "@/lib/utils";

/**
 * A memory or moment on the story's thread as a small cover of its own: the
 * lead photograph under a scrim with the kicker and title laid over it, and,
 * when there are three, a 2:1 grid with two more beside it. Without a
 * photograph the entry falls back to the plain row the thread uses for plans.
 *
 * Addresses always go through the authorized media route; the ids only say
 * which files to ask for. The developer preview keeps its files in this
 * browser, so there the card reads them from local storage instead.
 */
export function StoryCard({ kind, entryId, ids, previewSession, href, title, date }: {
  kind: "memory" | "moment";
  entryId: string;
  ids: string[];
  previewSession?: string;
  href: string;
  title: string;
  /** The day, already formatted. A moment says so with a pill on its photo, and in words on a row. */
  date: string;
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

  const sources = previewSession ? local : ids.map((id) => mediaHref(id, kind, "preview"));
  const named = (kind === "memory" ? "Memory" : "Moment") + " · " + date;
  if (sources && !sources.length) return <StoryRow href={href} title={title} kicker={named} />;
  const kicker = kind === "memory" ? named : date;

  const grid = (sources?.length ?? 0) >= 3;
  const words = (
    <span className="absolute inset-x-4 bottom-3.5 flex flex-col-reverse">
      <span className={cn("break-words font-display leading-[1.15] text-foreground", grid ? "text-2xl" : "text-[1.75rem]")}>{title}</span>
      <span className="text-[0.8125rem] leading-5 text-muted-foreground">{kicker}</span>
      {kind === "moment" ? <span className="mb-1.5 self-start rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-bold leading-4 text-primary-foreground">Moment</span> : null}
    </span>
  );

  return (
    <Link
      href={href}
      className={cn(
        "on-cover group block overflow-hidden rounded-panel bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        grid ? "grid h-[12.5rem] grid-cols-[2fr_1fr] grid-rows-2 gap-[3px]" : "relative h-[14.375rem]",
      )}
    >
      {grid ? (
        <>
          <span className="relative row-span-2 block min-h-0">
            <Photo src={sources![0]} />
            <Scrim />
            {words}
          </span>
          <span className="relative block min-h-0"><Photo src={sources![1]} /></span>
          <span className="relative block min-h-0"><Photo src={sources![2]} /></span>
        </>
      ) : (
        <>
          {sources ? <Photo src={sources[0]} /> : <span aria-hidden="true" className="media-skeleton absolute inset-0" />}
          <Scrim />
          {words}
        </>
      )}
    </Link>
  );
}

/** A plan kept, a dream lived, or an entry without a photograph: a kicker over a title, on the thread. */
export function StoryRow({ href, title, kicker }: { href: string; title: string; kicker: string }) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-11 flex-col-reverse justify-center gap-px rounded-control py-1 before:absolute before:-left-[1.4375rem] before:top-1/2 before:-mt-0.5 before:size-[5px] before:rounded-full before:bg-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="break-words text-[1.0625rem] font-semibold leading-snug transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">{title}</span>
      <span className="text-[0.8125rem] leading-5 text-muted-foreground">{kicker}</span>
    </Link>
  );
}

function Scrim() {
  return <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_7_6/0)_30%,rgb(8_7_6/0.9)_100%)]" />;
}

function Photo({ src }: { src: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return (
    <>
      {status !== "ready" ? <span aria-hidden="true" className={cn("absolute inset-0 bg-secondary", status === "loading" && "media-skeleton")} /> : null}
      {status !== "error" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          className={cn("absolute inset-0 size-full object-cover transition-[opacity,scale] duration-500 group-hover:scale-[1.02] motion-reduce:transition-none", status === "ready" ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </>
  );
}
