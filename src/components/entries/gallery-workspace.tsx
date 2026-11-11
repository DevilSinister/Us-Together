"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, ListFilter } from "lucide-react";
import { loadGallery } from "@/app/actions/gallery";
import { Cover, CoverSheet } from "@/components/app/cover";
import { usePartnerRefresh } from "@/components/providers/partner-sync";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  galleryCountLabel,
  galleryDayLabel,
  galleryGroupComplete,
  galleryTotalsLabel,
  groupGallery,
  type GalleryItem,
  type GalleryPage,
} from "@/lib/entries/gallery";
import { previewMedia } from "@/lib/entries/preview-media";
import { MediaTile } from "./media-tile";
import { MediaViewer } from "./media-viewer";

export type GalleryScope = { kind: "memory" | "moment"; entry: string };
type GalleryFilters = { kind: string; media: string; date: string; group: "memory" | "date" };

const thisYear = new Date().getUTCFullYear();
const longDay = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
const selectClass = "min-h-11 w-full min-w-0 rounded-control border bg-field px-3 text-sm";
const gridClass = "grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 xl:grid-cols-6";
const entryHref = (kind: string, id: string) => (kind === "memory" ? "/memories/" : "/milestones/") + id;

/** A refresh that returns the same files should not replace every tile. */
function same(a: GalleryItem[], b: GalleryItem[]) {
  return a.length === b.length && a.every((item, i) => item.sortKey === b[i].sortKey && item.caption === b[i].caption && item.state === b[i].state);
}

/**
 * The gallery's cover is a band: the screen beneath is already all
 * photographs, so the cover carries only the name and how much is kept. One
 * entry's gallery is named for that entry and brings its own way back.
 */
export function GalleryCover({ scope, title, line }: { scope?: GalleryScope; title?: string; line: string }) {
  const noun = scope?.kind === "memory" ? "Memory" : "Moment";
  return (
    <Cover
      labelledBy="gallery-title"
      height="band"
      back={scope ? { href: entryHref(scope.kind, scope.entry), label: "Back to " + noun.toLowerCase() } : undefined}
    >
      {scope && title ? <p className="mb-1 text-[0.8125rem] font-semibold text-muted-foreground">{noun} gallery</p> : null}
      <h1
        id="gallery-title"
        className={
          "font-display leading-[1.05] tracking-[-0.02em] text-balance [overflow-wrap:anywhere] " +
          (scope ? "line-clamp-2 text-[2rem]" : "text-[2.5rem]")
        }
      >
        {scope ? title || noun + " gallery" : "Gallery"}
      </h1>
      {/* Holds its line while the count is read, so the title does not shift when it arrives. */}
      <p className="mt-1.5 min-h-[1.5rem] text-[0.9375rem] leading-6 text-muted-foreground">{line}</p>
    </Cover>
  );
}

/**
 * The gallery as a Cover screen: a band, then a sheet with one Filter control
 * and every photo and video as a tight contact sheet under the memory or
 * moment (or the day) it belongs to. Tiles open the full-screen viewer, which
 * swipes in the order the grid reads.
 */
export function GalleryWorkspace({ initial, scope }: { initial: GalleryPage; scope?: GalleryScope }) {
  const preview = !!initial.previewEntries;
  const [items, setItems] = useState(initial.items);
  const [next, setNext] = useState(initial.next);
  const [totals, setTotals] = useState(initial.totals);
  const [settled, setSettled] = useState(!preview);
  const [error, setError] = useState(initial.error ?? "");
  // The first read starts as soon as the screen mounts, so it opens as loading.
  const [pending, setPending] = useState(true);
  const [kind, setKind] = useState<string>(scope?.kind ?? "all");
  const [media, setMedia] = useState("all");
  const [date, setDate] = useState("");
  const [group, setGroup] = useState<"memory" | "date">("memory");
  const [selected, setSelected] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<GalleryFilters>({ kind: scope?.kind ?? "all", media: "all", date: "", group: "memory" });
  // The entry's name, taken once from the unfiltered first read so a filter that empties the grid cannot unname the screen.
  const [title] = useState(initial.items[0]?.entryTitle ?? initial.previewEntries?.[0]?.title);
  const scopeEntry = scope?.entry;
  const urls = useRef<string[]>([]);
  const generation = useRef(0);
  const count = useRef(initial.items.length);
  const shown = useRef(initial.items);
  useEffect(() => { count.current = items.length; shown.current = items; }, [items]);

  const reload = useCallback(async (background = false) => {
    const run = ++generation.current;
    if (!background) setPending(true);
    try {
      const loaded: GalleryItem[] = [];
      let cursor: GalleryPage["next"] = null;
      let counted: GalleryPage["totals"];
      if (initial.previewEntries) {
        for (const entry of initial.previewEntries) {
          const files = await previewMedia(entry.access);
          loaded.push(...files.map(file => ({ ...file, access: entry.access, entryTitle: entry.title, entryDate: entry.date, sortKey: entry.access.kind + ":" + file.id })));
        }
        loaded.sort((a, b) => b.entryDate.localeCompare(a.entryDate) || a.sortKey.localeCompare(b.sortKey));
      } else {
        do {
          const page: GalleryPage = await loadGallery({ kind, entry: scopeEntry, media, date, cursor });
          if (page.error) throw Error(page.error);
          if (!cursor) counted = page.totals;
          loaded.push(...page.items);
          cursor = page.next;
        } while (cursor && loaded.length < count.current);
      }
      if (run !== generation.current) {
        for (const item of loaded) for (const url of [item.url, item.previewUrl]) if (url) URL.revokeObjectURL(url);
        return;
      }
      // The preview's files are blob URLs. When the same files come back the
      // tiles keep the ones they already hold, so it is the fresh copies that
      // are released; releasing the held ones would blank every tile that
      // mounts afterwards (a regrouping, a filter).
      const fresh = loaded.flatMap(item => [item.url, item.previewUrl].filter((url): url is string => !!url));
      if (same(shown.current, loaded)) {
        for (const url of fresh) URL.revokeObjectURL(url);
      } else {
        for (const url of urls.current) URL.revokeObjectURL(url);
        urls.current = fresh;
        shown.current = loaded;
        setItems(loaded);
      }
      setNext(cursor);
      if (counted) setTotals(counted);
      setSettled(true);
      setError("");
    } catch (problem) {
      if (run === generation.current) setError(problem instanceof Error ? problem.message : "Could not load gallery.");
    } finally {
      if (run === generation.current) setPending(false);
    }
  }, [initial.previewEntries, kind, media, date, scopeEntry]);

  useEffect(() => {
    const lifecycle = generation;
    const timer = setTimeout(() => void reload(), 0);
    return () => { clearTimeout(timer); lifecycle.current++; };
  }, [reload]);
  useEffect(() => () => { for (const url of urls.current) URL.revokeObjectURL(url); }, []);
  usePartnerRefresh(() => reload(true), pending);

  const visible = items.filter(item => (kind === "all" || item.access.kind === kind) && (media === "all" || item.media_type === media) && (!date || item.entryDate === date));
  const groups = groupGallery(visible, group);
  const ordered = groups.flatMap(g => g.items);
  const position = new Map(ordered.map((item, i) => [item.sortKey, i]));
  const index = selected ? position.get(selected) ?? -1 : -1;
  const activeFilterCount = Number(kind !== (scope?.kind ?? "all")) + Number(media !== "all") + Number(!!date) + Number(group !== "memory");

  // The preview keeps every file in this browser, so there the count is simply what was read.
  const kept = preview
    ? settled ? { photos: items.filter(item => item.media_type === "image").length, videos: items.filter(item => item.media_type !== "image").length } : undefined
    : totals;
  const summary = activeFilterCount
    ? (media === "all" ? "Photos + videos" : media === "image" ? "Photos" : "Videos")
      + (kind !== (scope?.kind ?? "all") ? ` · ${kind === "memory" ? "Memories" : "Moments"}` : "")
      + (date ? ` · ${date}` : "")
      + (group === "date" ? " · By date" : "")
    : scope ? "" : "Grouped by memory and moment";

  function openFilters() { setDraft({ kind, media, date, group }); setFiltersOpen(true); }
  function applyFilters() {
    if (draft.kind !== kind || draft.media !== media || draft.date !== date) count.current = 0;
    setKind(draft.kind); setMedia(draft.media); setDate(draft.date); setGroup(draft.group); setFiltersOpen(false);
  }
  async function more() {
    if (!next) return;
    setPending(true);
    try {
      const page = await loadGallery({ kind, entry: scopeEntry, media, date, cursor: next });
      if (page.error) throw Error(page.error);
      setItems(old => [...old, ...page.items.filter(item => !old.some(o => o.sortKey === item.sortKey))]);
      setNext(page.next);
      setError("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not load more.");
    } finally {
      setPending(false);
    }
  }

  return <>
    <GalleryCover scope={scope} title={title} line={kept ? galleryTotalsLabel(kept) : ""} />

    <CoverSheet>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={openFilters}
          aria-label={activeFilterCount ? `Gallery filters, ${activeFilterCount} active` : "Gallery filters"}
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          className="shrink-0"
        >
          <ListFilter aria-hidden="true" className="size-4" />
          Filter
          {activeFilterCount ? <span aria-hidden="true" className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-bold leading-5 text-primary-foreground">{activeFilterCount}</span> : null}
        </Button>
        {summary ? <p className="min-w-0 truncate text-[0.8125rem] text-muted-foreground">{summary}</p> : null}
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent
          title="Gallery filters"
          className="mb-0 w-full max-w-none rounded-b-none rounded-t-surface border-x-0 border-b-0 sm:mb-auto sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-panel sm:border"
        >
          <DialogHeader>
            <DialogTitle>Gallery filters</DialogTitle>
            <DialogDescription>Choose how to see the photos and videos you kept.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="min-w-0 space-y-2">
              <Label className="block" htmlFor="gallery-group">Group by</Label>
              <select id="gallery-group" value={draft.group} onChange={event => setDraft(current => ({ ...current, group: event.target.value as GalleryFilters["group"] }))} className={selectClass}>
                <option value="memory">Memory / moment</option>
                <option value="date">Date</option>
              </select>
            </div>
            {!scope ? <div className="min-w-0 space-y-2">
              <Label className="block" htmlFor="gallery-kind">From</Label>
              <select id="gallery-kind" value={draft.kind} onChange={event => setDraft(current => ({ ...current, kind: event.target.value }))} className={selectClass}>
                <option value="all">All entries</option>
                <option value="memory">Memories</option>
                <option value="moment">Moments</option>
              </select>
            </div> : null}
            <div className="min-w-0 space-y-2">
              <Label className="block" htmlFor="gallery-media">Show</Label>
              <select id="gallery-media" value={draft.media} onChange={event => setDraft(current => ({ ...current, media: event.target.value }))} className={selectClass}>
                <option value="all">Photos + videos</option>
                <option value="image">Photos</option>
                <option value="video">Videos</option>
              </select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label className="block" htmlFor="gallery-date">On date</Label>
              <Input id="gallery-date" type="date" value={draft.date} onChange={event => setDraft(current => ({ ...current, date: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft({ kind: scope?.kind ?? "all", media: "all", date: "", group: "memory" })}>Reset</Button>
            <Button onClick={applyFilters}>Show gallery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="sr-only" role="status">{pending ? "Loading your gallery" : ""}</p>

      {error ? <div className="mt-5 space-y-3">
        <p role="alert" className="status-message status-error">{error}</p>
        <Button variant="outline" onClick={() => void reload()}>Try again</Button>
      </div> : null}

      {pending && !error && !visible.length ? <div aria-hidden="true" className={gridClass + " mt-5"}>
        {Array.from({ length: 6 }, (_, i) => <span key={i} className="media-skeleton aspect-square rounded-control" />)}
      </div> : null}

      {!pending && !error && !visible.length ? <section className="py-10">
        <h2 className="font-display text-section-title">Room for your favorite moments.</h2>
        <p className="mt-3 max-w-prose leading-7 text-muted-foreground">
          {kind !== (scope?.kind ?? "all") || media !== "all" || date
            ? "No files match these filters. Try another date or show everything."
            : "Add photos or videos to a memory or moment and they will appear here."}
        </p>
        <Button asChild variant="outline" className="mt-5">
          {scope
            ? <Link href={entryHref(scope.kind, scope.entry)}>Back to {scope.kind}</Link>
            : <Link href="/memories/new">Add a memory</Link>}
        </Button>
      </section> : null}

      {groups.length ? <div className="stagger mt-4 space-y-5">
        {groups.map(g => {
          const first = g.items[0];
          const size = galleryGroupComplete(g.date, items, !!next) ? galleryCountLabel(g.items.length, media) : null;
          const byDate = group === "date";
          const name = byDate ? longDay.format(new Date(g.date + "T00:00:00Z")) : g.title;
          return <section key={byDate ? g.date : first.access.kind + first.access.id} aria-label={name}>
            {byDate ? <div className="mb-2.5">
              <h2 className="font-display text-[1.1875rem] leading-snug">{name}</h2>
              {size ? <p className="text-[0.8125rem] leading-5 text-muted-foreground">{size}</p> : null}
            </div> : !scope ? <Link
              href={entryHref(first.access.kind, first.access.id)}
              className="group mb-1.5 block w-fit max-w-full rounded-control py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <h2 className="flex items-center gap-1 font-display text-[1.1875rem] leading-snug transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">
                <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </h2>
              <p className="text-[0.8125rem] leading-5 text-muted-foreground">
                {[first.access.kind === "memory" ? "Memory" : "Moment", galleryDayLabel(g.date, thisYear), size].filter(Boolean).join(" · ")}
              </p>
            </Link> : null}
            <div className={gridClass}>
              {g.items.map(item => {
                const at = position.get(item.sortKey) ?? 0;
                return <MediaTile
                  key={item.sortKey}
                  dense
                  item={item}
                  eager={at < 9}
                  label={"Open " + (item.media_type === "image" ? "photo" : "video") + " " + (at + 1)}
                  onOpen={() => setSelected(item.sortKey)}
                />;
              })}
            </div>
          </section>;
        })}
      </div> : null}

      {next ? <Button variant="outline" disabled={pending} onClick={() => void more()} className="mt-7">
        {pending ? "Loading…" : "Load more photos and videos"}
      </Button> : null}

      {scope ? <div className="mt-8 border-t pt-3">
        <Link href="/gallery" className="group inline-flex min-h-11 items-center gap-1 rounded-control text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Open the whole gallery
          <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </Link>
      </div> : null}
    </CoverSheet>

    {/* The viewer swipes in the order the grid reads, group by group. */}
    {index >= 0 ? <MediaViewer items={ordered} index={index} onIndex={i => setSelected(ordered[i].sortKey)} onClose={() => setSelected(null)} onChange={reload} /> : null}
  </>;
}
