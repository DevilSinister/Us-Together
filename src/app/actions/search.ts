"use server";

import { z } from "zod";
import { planContext } from "@/lib/plans/data";
import { bucketPreview } from "@/lib/bucket/preview";
import { loadIdentities } from "@/lib/avatar/identities";
import { matchScore } from "@/lib/search/match";
import { activeFilterCount, searchSections, type SearchFilters, type SearchSection } from "@/lib/search/sections";

/**
 * Search across the couple's own entries.
 *
 * Privacy: the text typed arrives in this action's request body and is matched
 * here, on the app server, against rows each person can already read under row
 * level security. No database filter is ever built from it, so it never enters
 * a URL, a PostgREST request or a database log, and it is never logged here. A
 * partner's private note, a gift plan or a locked section is simply not among
 * the rows read. Each section reads its newest ROW_LIMIT entries, which covers a
 * couple's history many times over.
 */
const ROW_LIMIT = 400;
const PER_SECTION_EVERYWHERE = 5;
const PER_SECTION_SCOPED = 30;

const filtersSchema = z.object({
  favorites: z.boolean().optional(),
  tag: z.string().trim().toLowerCase().max(48).optional(),
  featured: z.boolean().optional(),
  when: z.enum(["upcoming", "past"]).optional(),
  lived: z.enum(["lived", "open"]).optional(),
  visibility: z.enum(["shared", "private"]).optional(),
  whose: z.enum(["mine", "partner"]).optional(),
});

const searchInput = z.object({
  query: z.string().max(120).transform((value) => value.trim().slice(0, 80)),
  section: z.enum(searchSections).nullable(),
  everywhere: z.boolean(),
  filters: filtersSchema.default({}),
});

export type SearchResult = { section: SearchSection; id: string; title: string; kicker: string; href: string };
export type SearchResponse = { results: SearchResult[]; tags: string[]; error?: string };

type Candidate = SearchResult & { others: Array<string | null | undefined>; at: string; keep: boolean };

const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const onDay = (date: string) => day.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));

export async function searchEverything(raw: unknown): Promise<SearchResponse> {
  const parsed = searchInput.safeParse(raw);
  if (!parsed.success) return { results: [], tags: [], error: "That search could not be read. Try different words." };
  const { query, section, everywhere, filters: requested } = parsed.data;

  try {
    const context = await planContext();
    if (!context.paired) return { results: [], tags: [] };
    const scoped = !everywhere && section !== null;
    const filters: SearchFilters = scoped ? requested : {};
    const sections: SearchSection[] = scoped ? [section] : [...searchSections];
    const now = new Date().toISOString();
    const partner = (await loadIdentities()).partner.name;

    const load = async (kind: SearchSection): Promise<Candidate[]> => {
      if (context.kind === "preview") {
        const state = context.state;
        if (kind === "memories") return state.memories.map((m) => ({
          section: kind, id: m.id, title: m.title, kicker: `Memory · ${onDay(m.memoryDate)}`, href: `/memories/${m.id}`,
          others: [m.description, m.location, ...(m.tags ?? [])], at: m.memoryDate,
          keep: (!filters.favorites || m.favorite) && (!filters.tag || (m.tags ?? []).includes(filters.tag)),
        }));
        if (kind === "moments") return state.milestones.map((m) => ({
          section: kind, id: m.id, title: m.title, kicker: `Moment · ${onDay(m.milestoneDate)}`, href: `/milestones/${m.id}`,
          others: [m.description, m.location], at: m.milestoneDate, keep: !filters.featured || m.featured,
        }));
        if (kind === "plans") return state.plans.map((p) => ({
          section: kind, id: p.id, title: p.title, kicker: `Plan · ${onDay(p.startsAt)}`, href: `/plans/${p.id}`,
          others: [p.description, p.location], at: p.startsAt,
          keep: !filters.when || (filters.when === "upcoming" ? p.startsAt >= now : p.startsAt < now),
        }));
        if (kind === "bucket") return (await bucketPreview(state.bucketSessionId)).items.map((item) => bucketCandidate(item, filters));
        return [];
      }

      const { db, coupleId, userId } = context;
      if (!coupleId) return [];
      if (kind === "memories") {
        const { data, error } = await db.from("memories").select("id,title,description,memory_date,location,is_favorite,memory_tag_links(memory_tags(name))").eq("couple_id", coupleId).order("memory_date", { ascending: false }).limit(ROW_LIMIT);
        if (error) throw error;
        return (data ?? []).map((m) => {
          const tags = m.memory_tag_links.flatMap((link) => (link.memory_tags ? [link.memory_tags.name] : []));
          return {
            section: kind, id: m.id, title: m.title, kicker: `Memory · ${onDay(m.memory_date)}`, href: `/memories/${m.id}`,
            others: [m.description, m.location, ...tags], at: m.memory_date,
            keep: (!filters.favorites || m.is_favorite) && (!filters.tag || tags.includes(filters.tag)),
          };
        });
      }
      if (kind === "moments") {
        const { data, error } = await db.from("milestones").select("id,title,description,milestone_date,location,is_featured").eq("couple_id", coupleId).order("milestone_date", { ascending: false }).limit(ROW_LIMIT);
        if (error) throw error;
        return (data ?? []).map((m) => ({
          section: kind, id: m.id, title: m.title, kicker: `Moment · ${onDay(m.milestone_date)}`, href: `/milestones/${m.id}`,
          others: [m.description, m.location], at: m.milestone_date, keep: !filters.featured || m.is_featured,
        }));
      }
      if (kind === "plans") {
        const planDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: context.timezone });
        const { data, error } = await db.from("plans").select("id,title,description,location,starts_at").eq("couple_id", coupleId).order("starts_at", { ascending: false }).limit(ROW_LIMIT);
        if (error) throw error;
        return (data ?? []).map((p) => ({
          section: kind, id: p.id, title: p.title, kicker: `Plan · ${planDay.format(new Date(p.starts_at))}`, href: `/plans/${p.id}`,
          others: [p.description, p.location], at: p.starts_at,
          keep: !filters.when || (filters.when === "upcoming" ? p.starts_at >= now : p.starts_at < now),
        }));
      }
      if (kind === "bucket") {
        const { data, error } = await db.from("bucket_list_items").select("id,title,description,location,status,created_at").eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(ROW_LIMIT);
        if (error) throw error;
        return (data ?? []).map((item) => bucketCandidate(item, filters));
      }
      if (kind === "notes") {
        // Row level security returns only notes this person may read; a partner's private note never arrives.
        const { data, error } = await db.from("notes").select("id,title,body,type,author_id,updated_at").eq("couple_id", coupleId).order("updated_at", { ascending: false }).limit(ROW_LIMIT);
        if (error) throw error;
        return (data ?? []).map((n) => ({
          section: kind, id: n.id, title: n.title, kicker: n.type === "private" ? "Note · only you" : n.author_id === userId ? "Note · from you" : `Note · from ${partner}`, href: `/notes/${n.id}`,
          others: [n.body], at: n.updated_at,
          keep: !filters.visibility || (filters.visibility === "private" ? n.type === "private" : n.type !== "private"),
        }));
      }
      // Wishes: only the title and description, never the purchase state, which lives in its own table.
      const { data, error } = await db.from("wishlist_items").select("id,title,description,owner_id,created_at").eq("couple_id", coupleId).order("created_at", { ascending: false }).limit(ROW_LIMIT);
      if (error) throw error;
      return (data ?? []).map((w) => ({
        section: kind, id: w.id, title: w.title, kicker: w.owner_id === userId ? "Wish · yours" : `Wish · ${partner}’s`, href: `/wishlist/${w.id}`,
        others: [w.description], at: w.created_at,
        keep: !filters.whose || (filters.whose === "mine" ? w.owner_id === userId : w.owner_id !== userId),
      }));
    };

    const loaded = await Promise.all(sections.map(async (kind) => [kind, await load(kind)] as const));
    // Memory tags sit after the description and place in `others`.
    const tags = scoped && section === "memories"
      ? [...new Set(loaded[0][1].flatMap((c) => c.others.slice(2)).filter((tag): tag is string => Boolean(tag)))].sort()
      : [];

    const filtering = scoped && activeFilterCount(section, filters) > 0;
    if (!query && !filtering) return { results: [], tags };

    const results = loaded.flatMap(([, candidates]) => {
      const kept = candidates.filter((candidate) => candidate.keep);
      const ranked = query
        ? kept.map((candidate) => ({ candidate, score: matchScore(query, candidate.title, candidate.others) })).filter((entry) => entry.score > 0)
        : kept.map((candidate) => ({ candidate, score: 1 }));
      return ranked
        .sort((a, b) => b.score - a.score || b.candidate.at.localeCompare(a.candidate.at))
        .slice(0, scoped ? PER_SECTION_SCOPED : PER_SECTION_EVERYWHERE)
        .map(({ candidate: { section: kind, id, title, kicker, href } }) => ({ section: kind, id, title, kicker, href }));
    });
    return { results, tags };
  } catch {
    // Deliberately no logging of the error here: it could carry the row text being matched.
    return { results: [], tags: [], error: "Search is unavailable right now. Try again in a moment." };
  }
}

function bucketCandidate(item: { id: string; title: string; description: string | null; location: string | null; status: string; created_at: string }, filters: SearchFilters): Candidate {
  const lived = item.status === "completed";
  return {
    section: "bucket", id: item.id, title: item.title, kicker: `Bucket idea · ${lived ? "lived" : "still a dream"}`, href: `/bucket/${item.id}`,
    others: [item.description, item.location], at: item.created_at,
    keep: !filters.lived || (filters.lived === "lived" ? lived : !lived),
  };
}
