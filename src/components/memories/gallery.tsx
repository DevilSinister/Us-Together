"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Heart } from "lucide-react";

import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { refreshWindow } from "@/lib/partner-sync";
import { filterMemories } from "@/app/actions/memories";
import { groupByMonth } from "@/lib/memories/grouping";
import { memoryInitial } from "@/lib/memories/initial";
import { mediaHref } from "@/lib/entries/media-url";
import { MediaThumb } from "@/components/entries/media-thumb";
import { staggerIndex } from "@/components/app/cover";
import type { MemoryPage } from "@/lib/memories/types";
import { Button } from "@/components/ui/button";

const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * What a memory without photographs shows in its thumbnail square: its own
 * initial in the story serif, on a faint rose corner, rather than the "no
 * image" glyph, which read as a broken upload. A title with no lettered word
 * gets a small heart instead.
 */
function MemoryMonogram({ title }: { title: string }) {
  const initial = memoryInitial(title);
  return <span
    aria-hidden="true"
    className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--rose)_22%,transparent),transparent_65%)] text-primary"
  >
    {initial
      ? <span className="font-display text-xl leading-none">{initial}</span>
      : <Heart className="size-4" />}
  </span>;
}

/**
 * Every memory you have kept, newest first, under italic month names.
 *
 * Each row is the photograph (or the memory's initial), the date, and the
 * title. Nothing else: the story, place and tags wait on the memory itself.
 * The date reads first, as in the Cover mockups, but the title comes first in
 * the markup, so a row's link is named by what it is called.
 */
export function MemoryGallery({ initial }: { initial: MemoryPage }) {
  const [page, setPage] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  usePartnerRefresh(async () => {
    const result = await refreshWindow<MemoryPage["memories"][number], NonNullable<MemoryPage["next"]>>(async cursor => {
      const response = await filterMemories({ cursor });
      if (!response.page) throw Error("Refresh unavailable");
      return { items: response.page.memories, next: response.page.next };
    }, page.memories.length);
    setPage(current => current === page ? { memories: result.items, next: result.next } : current);
  }, pending);

  const loadMore = () => start(async () => {
    try {
      const result = await filterMemories({ cursor: page.next });
      if (!result.page) { setError(result.error ?? "Could not load more memories."); return; }
      setError("");
      setPage({
        memories: [...page.memories, ...result.page.memories.filter(m => !page.memories.some(old => old.id === m.id))],
        next: result.page.next,
      });
    } catch {
      setError("Could not load more memories. Check your connection and try again.");
    }
  });

  const groups = groupByMonth(page.memories);
  let row = 0;

  return <section aria-label="Memories by date" aria-busy={pending}>
    <p className="sr-only" role="status">{pending ? "Loading memories" : page.memories.length + " memories shown"}</p>

    {!page.memories.length ? <div className="py-6">
      <h2 className="font-display text-section-title">Start with the detail you never want to lose.</h2>
      <p className="mt-3 max-w-prose leading-7 text-muted-foreground">
        A memory does not need to be a milestone. Keep an ordinary moment that already feels like yours.
      </p>
      <Button asChild className="mt-6"><Link href="/memories/new">Keep a memory</Link></Button>
    </div> : <div className="max-w-3xl space-y-3">
      {groups.map(group => <section key={group.key} aria-labelledby={"month-" + group.key}>
        <h2 id={"month-" + group.key} className="pt-2 font-display text-lg italic text-muted-foreground">{group.label}</h2>

        <ul className="stagger divide-y divide-border">
          {group.memories.map(m => {
            const thumb = m.media[0];
            return <li key={m.id} id={m.id} style={staggerIndex(row++)}>
              <Link
                href={"/memories/" + m.id}
                className="group flex min-h-[4.25rem] items-center gap-3 rounded-control py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="relative size-11 shrink-0 overflow-hidden rounded-control bg-secondary">
                  <span className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-110 motion-reduce:transition-none">
                    {/* Decorative: the title sits beside it, so an alt would only repeat. */}
                    {thumb ? <MediaThumb
                      src={mediaHref(thumb.id, "memory", "preview")}
                      mediaType={thumb.media_type}
                      alt=""
                      sizes="44px"
                    /> : <MemoryMonogram title={m.title}/>}
                  </span>
                </span>

                <span className="flex min-w-0 flex-1 flex-col-reverse">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-[1.0625rem] font-semibold leading-snug transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">
                      {m.title}
                    </span>
                    {m.is_favorite ? <>
                      <Heart className="size-3.5 shrink-0 fill-current text-primary" aria-hidden="true"/>
                      <span className="sr-only">Favourite</span>
                    </> : null}
                  </span>
                  <span className="text-[0.8125rem] leading-5 text-muted-foreground">
                    <time dateTime={m.memory_date}>{dayFormat.format(new Date(m.memory_date + "T00:00:00Z"))}</time>
                    {thumb ? null : " · no photos yet"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true"/>
              </Link>
            </li>;
          })}
        </ul>
      </section>)}
    </div>}

    {error ? <p role="alert" className="status-message status-error mt-5">{error}</p> : null}

    {page.next ? <Button className="mt-6" variant="outline" disabled={pending} onClick={loadMore}>
      {pending ? "Loading…" : "Load more memories"}
    </Button> : null}
  </section>;
}
