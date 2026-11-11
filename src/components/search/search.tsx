"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronRight, Flag, Gift, Images, ListChecks, NotebookPen, Search, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { searchEverything, type SearchResponse } from "@/app/actions/search";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { activeFilterCount, searchSections, sectionForPath, sectionLabels, type SearchFilters, type SearchSection } from "@/lib/search/sections";
import { cn } from "@/lib/utils";

const icons: Record<SearchSection, LucideIcon> = {
  memories: Images, moments: Flag, plans: CalendarDays, bucket: ListChecks, notes: NotebookPen, wishes: Gift,
};

const SearchContext = createContext<{ open: boolean; openSearch: () => void } | null>(null);

/**
 * One search sheet for the whole signed-in app, opened from the top bar on a
 * phone and the sidebar on wider screens. It searches the section of the screen
 * it was opened from, with that screen's own filters, and "Search everywhere"
 * widens it to every section. Each opening starts fresh.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const openSearch = () => { setSession((value) => value + 1); setOpen(true); };

  return (
    <SearchContext.Provider value={{ open, openSearch }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Search"
          className="mb-0 h-[min(88dvh,46rem)] w-full max-w-none rounded-b-none rounded-t-surface border-x-0 border-b-0 sm:mb-auto sm:h-[min(80dvh,42rem)] sm:w-[calc(100%-2rem)] sm:max-w-xl sm:rounded-panel sm:border"
        >
          <SearchPanel key={session} onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </SearchContext.Provider>
  );
}

export function SearchTrigger({ variant }: { variant: "icon" | "sidebar" }) {
  const context = useContext(SearchContext);
  if (!context) return null;
  if (variant === "sidebar") {
    return (
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={context.open}
        onClick={context.openSearch}
        className="mt-8 flex min-h-11 w-full items-center gap-3 rounded-navigation border px-4 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />Search
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label="Search"
      aria-haspopup="dialog"
      aria-expanded={context.open}
      onClick={context.openSearch}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Search className="size-5" aria-hidden="true" />
    </button>
  );
}

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const section = sectionForPath(usePathname());
  const [query, setQuery] = useState("");
  const [everywhere, setEverywhere] = useState(section === null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const latest = useRef(0);

  const scope = everywhere ? null : section;
  const filterCount = scope ? activeFilterCount(scope, filters) : 0;

  useEffect(() => {
    const request = ++latest.current;
    const timer = window.setTimeout(async () => {
      setPending(true);
      try {
        const result = await searchEverything({ query, section: scope, everywhere: scope === null, filters: scope ? filters : {} });
        if (latest.current === request) setResponse(result);
      } catch {
        if (latest.current === request) setResponse({ results: [], tags: [], error: "Search is unavailable right now. Try again in a moment." });
      } finally {
        if (latest.current === request) setPending(false);
      }
    }, query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [query, scope, filters]);

  const results = response?.results ?? [];
  const asking = Boolean(query) || filterCount > 0;
  const grouped = searchSections
    .map((kind) => ({ kind, items: results.filter((result) => result.section === kind) }))
    .filter((group) => group.items.length)
    .sort((a, b) => Number(b.kind === section) - Number(a.kind === section));

  return (
    <div className="flex flex-col">
      <div className="sticky -top-5 z-10 -mx-5 -mt-5 bg-card px-5 pb-3 pt-5 pr-14 sm:-top-7 sm:-mx-7 sm:-mt-7 sm:px-7 sm:pt-7 sm:pr-16">
        <label htmlFor="app-search" className="sr-only">Search</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="app-search"
            type="search"
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
            maxLength={80}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={scope ? `Search ${sectionLabels[scope].toLowerCase()}` : "Search everything"}
            className="h-12 w-full rounded-control border bg-field pl-12 pr-4 text-base outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-3 focus:ring-ring/25"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {section ? (
            <button
              type="button"
              aria-expanded={showFilters && !everywhere}
              aria-controls="search-filters"
              disabled={everywhere}
              onClick={() => setShowFilters((value) => !value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45",
                filterCount ? "border-primary text-primary" : null,
              )}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />Filters
              {filterCount ? <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">{filterCount}</span> : null}
            </button>
          ) : null}
          <label className={cn(
            "inline-flex min-h-11 items-center gap-2.5 rounded-control border px-3 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:text-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
            section ? "cursor-pointer" : "opacity-70",
          )}>
            <input type="checkbox" checked={everywhere} disabled={!section} onChange={(event) => setEverywhere(event.target.checked)} className="size-4 accent-[var(--primary)]" />
            Search everywhere
          </label>
        </div>

        {scope && showFilters ? (
          <div id="search-filters" className="mt-3 rounded-panel bg-secondary p-4">
            <SectionFilters section={scope} filters={filters} onChange={setFilters} tags={response?.tags ?? []} />
          </div>
        ) : null}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {pending ? "Searching" : asking ? `${results.length} ${results.length === 1 ? "result" : "results"}` : ""}
      </p>

      <div className="mt-2" aria-busy={pending}>
        {response?.error ? <p role="alert" className="status-message status-error">{response.error}</p>
          : !asking ? (
            <p className="py-6 text-sm leading-6 text-muted-foreground">
              {scope
                ? `Search your ${sectionLabels[scope].toLowerCase()} by title, story or place. Filters narrow it to what you need.`
                : "Search memories, moments, plans, bucket lists, notes and wishes at once."}
            </p>
          ) : !results.length && !pending ? (
            <p className="py-6 text-sm leading-6 text-muted-foreground">Nothing matches yet. Try fewer words{scope ? ", fewer filters, or search everywhere" : ""}.</p>
          ) : (
            <div className={cn("space-y-4 transition-opacity duration-200", pending ? "opacity-60" : null)}>
              {grouped.map(({ kind, items }) => (
                <section key={kind} aria-label={sectionLabels[kind]}>
                  {scope ? null : <h3 className="pt-1 font-display text-lg italic text-muted-foreground">{sectionLabels[kind]}</h3>}
                  <ul className="stagger divide-y divide-border">
                    {items.map((result) => {
                      const Icon = icons[result.section];
                      return (
                        <li key={result.section + result.id}>
                          <Link href={result.href} onClick={onNavigate} className="group flex min-h-16 items-center gap-3 rounded-control py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground"><Icon className="size-[1.125rem]" /></span>
                            <span className="flex min-w-0 flex-1 flex-col-reverse">
                              <span className="truncate font-semibold leading-snug transition-colors group-hover:text-primary">{result.title}</span>
                              <span className="truncate text-[0.8125rem] leading-5 text-muted-foreground">{result.kicker}</span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

/** The filters that belong to one screen. */
function SectionFilters({ section, filters, onChange, tags }: {
  section: SearchSection;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  tags: string[];
}) {
  const set = (patch: SearchFilters) => onChange({ ...filters, ...patch });

  if (section === "memories") {
    return (
      <div className="space-y-3">
        <Check label="Favorites only" checked={Boolean(filters.favorites)} onChange={(favorites) => set({ favorites })} />
        <div>
          <p className="text-sm font-semibold">Tag</p>
          {tags.length ? (
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tag">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={filters.tag === tag}
                  onClick={() => set({ tag: filters.tag === tag ? undefined : tag })}
                  className={cn(
                    "min-h-9 rounded-control border px-3 text-[0.8125rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    filters.tag === tag ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
                  )}
                >{tag}</button>
              ))}
            </div>
          ) : <p className="mt-1 text-sm text-muted-foreground">No tags yet.</p>}
        </div>
      </div>
    );
  }
  if (section === "moments") return <Check label="Featured only" checked={Boolean(filters.featured)} onChange={(featured) => set({ featured })} />;
  if (section === "plans") return <Choice label="When" value={filters.when} onChange={(when) => set({ when })} options={[["upcoming", "Coming up"], ["past", "Past"]]} />;
  if (section === "bucket") return <Choice label="Status" value={filters.lived} onChange={(lived) => set({ lived })} options={[["open", "Still a dream"], ["lived", "Lived"]]} />;
  if (section === "notes") return <Choice label="Kind" value={filters.visibility} onChange={(visibility) => set({ visibility })} options={[["shared", "Shared"], ["private", "Only you"]]} />;
  return <Choice label="Whose" value={filters.whose} onChange={(whose) => set({ whose })} options={[["mine", "Yours"], ["partner", "Your partner’s"]]} />;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-5 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: {
  label: string;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: Array<[T, string]>;
}) {
  const all: Array<[T | undefined, string]> = [[undefined, "Any"], ...options];
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {all.map(([option, text]) => (
          <label key={text} className={cn(
            "inline-flex min-h-10 cursor-pointer items-center rounded-control border px-3 text-[0.8125rem] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
            value === option ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
          )}>
            <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
