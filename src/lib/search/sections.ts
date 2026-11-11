/**
 * What can be searched, and which screen searches which section. Shared by the
 * search sheet (to know where it was opened) and the server action (to know
 * what to read), so the two can never disagree on a section's name.
 */
export const searchSections = ["memories", "moments", "plans", "bucket", "notes", "wishes"] as const;
export type SearchSection = (typeof searchSections)[number];

export const sectionLabels: Record<SearchSection, string> = {
  memories: "Memories",
  moments: "Moments",
  plans: "Plans",
  bucket: "Bucket lists",
  notes: "Notes",
  wishes: "Wishlists",
};

/** The section a screen belongs to, or null for screens that search everything (Home, Gallery, settings). */
export function sectionForPath(pathname: string): SearchSection | null {
  switch ("/" + (pathname.split("/")[1] ?? "")) {
    case "/memories": return "memories";
    case "/milestones": return "moments";
    case "/plans":
    case "/calendar": return "plans";
    case "/bucket": return "bucket";
    case "/notes": return "notes";
    case "/wishlist": return "wishes";
    default: return null;
  }
}

/** Every screen filter; each section uses only its own (see `filterKeys`). */
export type SearchFilters = {
  favorites?: boolean;
  tag?: string;
  featured?: boolean;
  when?: "upcoming" | "past";
  lived?: "lived" | "open";
  visibility?: "shared" | "private";
  whose?: "mine" | "partner";
};

export const filterKeys: Record<SearchSection, Array<keyof SearchFilters>> = {
  memories: ["favorites", "tag"],
  moments: ["featured"],
  plans: ["when"],
  bucket: ["lived"],
  notes: ["visibility"],
  wishes: ["whose"],
};

/** How many of a section's own filters are set; filters from another section never count. */
export function activeFilterCount(section: SearchSection, filters: SearchFilters) {
  return filterKeys[section].filter((key) => {
    const value = filters[key];
    return value !== undefined && value !== false && value !== "";
  }).length;
}
