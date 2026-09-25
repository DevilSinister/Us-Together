import { DEFAULT_BUCKET_CATEGORIES, type BucketItem } from "./schema";

/**
 * How an opened list is sectioned. Status is the default because the question
 * a couple asks of a list is "what have we done, what's next" - completed ideas
 * separate from the ones still ahead.
 */
export const bucketGroupings = ["status", "category", "priority"] as const;
export type BucketGrouping = (typeof bucketGroupings)[number];

export const bucketGroupingLabels: Record<BucketGrouping, string> = {
  status: "Status",
  category: "Category",
  priority: "Priority",
};

// What is moving first, what is dated next, what is still a dream, then what
// you have already lived - kept last so the list reads forward.
const statusOrder = ["in_progress", "planned", "idea", "completed"] as const;
const statusLabels: Record<string, string> = {
  in_progress: "In progress",
  planned: "Planned",
  idea: "Ideas",
  completed: "Completed",
};

const priorityOrder = ["dream", "high", "medium", "low"] as const;
const priorityLabels: Record<string, string> = {
  dream: "Dream",
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export const NO_CATEGORY = "No category";

export type BucketGroup = { key: string; label: string; items: BucketItem[] };

/**
 * Sections `items` by `by`, keeping each item's incoming order inside its
 * section and dropping empty sections. Unknown values - a status added to the
 * database before the interface knows it - fall to the end rather than vanish.
 */
export function groupBucketItems(items: readonly BucketItem[], by: BucketGrouping): BucketGroup[] {
  const buckets = new Map<string, BucketItem[]>();
  for (const item of items) {
    const key = by === "category" ? item.category?.trim() || NO_CATEGORY : item[by];
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }

  const keys = [...buckets.keys()];
  let ordered: string[];
  if (by === "category") {
    const defaults: readonly string[] = DEFAULT_BUCKET_CATEGORIES;
    ordered = keys.sort((a, b) => {
      if (a === NO_CATEGORY || b === NO_CATEGORY) return a === NO_CATEGORY ? 1 : -1;
      const ai = defaults.indexOf(a), bi = defaults.indexOf(b);
      if (ai >= 0 || bi >= 0) return ai < 0 ? 1 : bi < 0 ? -1 : ai - bi;
      return a.localeCompare(b, "en", { sensitivity: "base" });
    });
  } else {
    const order: readonly string[] = by === "status" ? statusOrder : priorityOrder;
    const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
    ordered = keys.sort((a, b) => rank(a) - rank(b));
  }

  const labels = by === "status" ? statusLabels : by === "priority" ? priorityLabels : null;
  return ordered.map((key) => ({ key, label: labels?.[key] ?? key, items: buckets.get(key)! }));
}

export type CategoryMark = "travel" | "food" | "ritual" | "outdoors" | "home" | "culture" | "milestone" | "romance" | "film" | "music" | "games" | "other";

// Checked in order: a category is read by the first word that names it, so
// custom categories a couple invents still get a fitting mark.
const categoryMarks: [RegExp, CategoryMark][] = [
  [/travel|getaway|trip|holiday|vacation|journey/i, "travel"],
  [/food|dining|dinner|restaurant|cook|\beat|brunch/i, "food"],
  [/ritual|coffee|caf[eé]|tea\b|morning/i, "ritual"],
  [/outdoor|adventure|hike|nature|mountain|beach|camp/i, "outdoors"],
  [/home|cozy|cosy|house/i, "home"],
  [/\barts?\b|culture|museum|theat(er|re)|book/i, "culture"],
  [/milestone|anniversar|birthday/i, "milestone"],
  [/date|love|romance|romantic/i, "romance"],
  [/movie|film|cinema/i, "film"],
  [/music|concert|gig|song/i, "music"],
  [/game|gaming|play/i, "games"],
];

export function categoryMark(category: string | null | undefined): CategoryMark {
  if (!category) return "other";
  return categoryMarks.find(([pattern]) => pattern.test(category))?.[1] ?? "other";
}

/**
 * The kind of plan an idea most likely becomes, for prefilling a new plan made
 * from it. A guess the partner can change, never a rule.
 */
export function suggestedPlanType(category: string | null | undefined) {
  const mark = categoryMark(category);
  if (mark === "travel") return "trip";
  if (mark === "milestone") return "event";
  if (mark === "outdoors" || mark === "culture" || mark === "film" || mark === "music" || mark === "games") return "activity";
  return "date";
}

/** Low to dream as one to four filled marks. */
export function priorityLevel(priority: string) {
  const level = ["low", "medium", "high", "dream"].indexOf(priority);
  return level < 0 ? 1 : level + 1;
}
