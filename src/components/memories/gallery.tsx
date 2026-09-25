"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { refreshWindow } from "@/lib/partner-sync";
import { filterMemories } from "@/app/actions/memories";
import { groupByMonth } from "@/lib/memories/grouping";
import { memoryInitial } from "@/lib/memories/initial";
import { mediaHref } from "@/lib/entries/media-url";
import { MediaThumb } from "@/components/entries/media-thumb";
import type { MemoryPage } from "@/lib/memories/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dayFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * What a memory without photographs shows in its thumbnail square: its own
 * initial in the story serif, on a blush field with a faint rose corner, rather
 * than the "no image" glyph, which read as a broken upload. A title with no
 * lettered word gets a small heart instead.
 */
function MemoryMonogram({ title }: { title: string }) {
  const initial = memoryInitial(title);
  return <span
    aria-hidden="true"
    className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--rose)_22%,transparent),transparent_65%)] text-primary"
  >
    {initial
      ? <span className="font-display text-3xl leading-none sm:text-4xl">{initial}</span>
      : <Heart className="size-5" />}
  </span>;
}

/**
 * Every memory you have kept, as a list you can actually scan.
 *
 * Rows carry a thumbnail, the title, the date and the first line of the story.
 * This supersedes the title-only shape of 2026-09-17, which was never seen in a
 * browser before it shipped - the verification journey timed out before it
 * reached this page.
 *
 * Headings are months, not days, because the date now rides on the row; see
 * lib/memories/grouping.ts. Nothing here costs a new query: the thumbnail,
 * excerpt and tags were already being fetched and thrown away at render.
 */
export function MemoryGallery({ initial }: { initial: MemoryPage }) {
  const [page, setPage] = useState(initial);
  const [favorite, setFavorite] = useState(false);
  const [tag, setTag] = useState("");
  const [applied, setApplied] = useState({ favorite: false, tag: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  usePartnerRefresh(async () => {
    const result = await refreshWindow<MemoryPage["memories"][number], NonNullable<MemoryPage["next"]>>(async cursor => {
      const response = await filterMemories({ ...applied, cursor });
      if (!response.page) throw Error("Refresh unavailable");
      return { items: response.page.memories, next: response.page.next };
    }, page.memories.length);
    setPage(current => current === page ? { memories: result.items, next: result.next } : current);
  }, pending);

  const load = (more = false) => start(async () => {
    const filters = more ? applied : { favorite, tag };
    try {
      const result = await filterMemories({ ...filters, cursor: more ? page.next : null });
      if (!result.page) { setError(result.error ?? "Could not load memories."); return; }
      setError("");
      setApplied(filters);
      setPage({
        memories: more
          ? [...page.memories, ...result.page.memories.filter(m => !page.memories.some(old => old.id === m.id))]
          : result.page.memories,
        next: result.page.next,
      });
    } catch {
      setError("Could not load memories. Check your connection and try again.");
    }
  });

  const filtered = applied.favorite || applied.tag;
  const groups = groupByMonth(page.memories);

  return <section className="mt-8" aria-label="Memories by date" aria-busy={pending}>
    <form method="post" onSubmit={e => { e.preventDefault(); load(); }} className="flex flex-wrap items-end gap-4 border-b pb-6">
      {/* Its own row on phones: beside the checkbox and button it was crushed to four letters. */}
      <div className="min-w-0 flex-1 basis-full space-y-2 sm:max-w-xs sm:basis-auto">
        <Label htmlFor="tag-filter">Find a tag</Label>
        <Input id="tag-filter" value={tag} onChange={e => setTag(e.target.value)} placeholder="All tags" maxLength={48}/>
      </div>
      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)} className="size-5 accent-[var(--primary)]"/>
        Favorites only
      </label>
      <Button type="submit" variant="outline" disabled={pending}>Apply filters</Button>
    </form>

    {error ? <p role="alert" className="status-message status-error mt-5">{error}</p> : null}
    <p className="sr-only" role="status">{pending ? "Loading memories" : page.memories.length + " memories shown"}</p>

    {!page.memories.length ? <div className="py-12">
      <h2 className="font-display text-3xl">
        {filtered ? "No memories match just yet." : "Start with the detail you never want to lose."}
      </h2>
      <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
        {filtered
          ? "Try another tag or turn off Favorites only."
          : "A memory does not need to be a milestone. Keep an ordinary moment that already feels like yours."}
      </p>
      <Button asChild className="mt-6"><Link href="/memories/new">Keep a memory</Link></Button>
    </div> : <div className="mt-8 max-w-3xl space-y-8">
      {groups.map(group => <section key={group.key} aria-labelledby={"month-" + group.key}>
        <h2 id={"month-" + group.key} className="text-sm font-semibold text-primary">{group.label}</h2>

        <ul className="mt-2 divide-y border-t">
          {group.memories.map(m => {
            const thumb = m.media[0];
            return <li key={m.id} id={m.id}>
              <Link
                href={"/memories/" + m.id}
                className="group -mx-3 flex items-start gap-4 rounded-panel px-3 py-4 transition-colors duration-200 hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-panel bg-secondary sm:size-20">
                  {/* Decorative: the title sits beside it, so an alt would only repeat. */}
                  {thumb ? <MediaThumb
                    src={mediaHref(thumb.id, "memory", "preview")}
                    mediaType={thumb.media_type}
                    alt=""
                  /> : <MemoryMonogram title={m.title}/>}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className="min-w-0 truncate font-display text-xl leading-tight transition-colors group-hover:text-primary motion-reduce:transition-none sm:text-2xl">
                      {m.title}
                    </span>
                    {m.is_favorite ? <>
                      {/* A glyph, not a colour: rose collapses into wine in dark mode. */}
                      <Heart className="mt-1 size-4 shrink-0 fill-current text-rose" aria-hidden="true"/>
                      <span className="sr-only">Favourite</span>
                    </> : null}
                  </span>

                  <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                    <time dateTime={m.memory_date}>{dayFormat.format(new Date(m.memory_date + "T00:00:00Z"))}</time>
                  </span>

                  {/* One line, always: `block` beside `line-clamp-1` let display:block win
                      and the clamp never applied, so long stories wrapped to three lines.
                      `truncate` also folds line breaks the story itself contains. */}
                  {m.description ? <span className="mt-1 block truncate text-sm leading-6 text-muted-foreground">
                    {m.description.replace(/\s+/g, " ")}
                  </span> : null}
                </span>
              </Link>
            </li>;
          })}
        </ul>
      </section>)}
    </div>}

    {page.next ? <Button className="mt-8" variant="outline" disabled={pending} onClick={() => load(true)}>
      {pending ? "Loading…" : "Load more memories"}
    </Button> : null}
  </section>;
}
