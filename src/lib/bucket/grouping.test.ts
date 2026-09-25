import { describe, expect, it } from "vitest";
import { categoryMark, groupBucketItems, NO_CATEGORY, priorityLevel, suggestedPlanType } from "./grouping";
import type { BucketItem } from "./schema";

const item = (id: string, patch: Partial<BucketItem>): BucketItem => ({
  id, status: "idea", priority: "medium", category: null, title: id,
  ...patch,
} as BucketItem);

describe("groupBucketItems", () => {
  const items = [
    item("a", { status: "completed", priority: "low", category: "Dates" }),
    item("b", { status: "planned", priority: "dream", category: "Travel & Getaways" }),
    item("c", { status: "idea", priority: "high", category: null }),
    item("d", { status: "completed", priority: "high", category: "Food & Dining" }),
    item("e", { status: "in_progress", priority: "medium", category: "  " }),
  ];

  it("reads forward by status, with completed last", () => {
    const groups = groupBucketItems(items, "status");
    expect(groups.map((g) => g.label)).toEqual(["In progress", "Planned", "Ideas", "Completed"]);
    expect(groups.at(-1)!.items.map((i) => i.id)).toEqual(["a", "d"]);
  });

  it("orders priority from dream down and drops empty sections", () => {
    expect(groupBucketItems(items, "priority").map((g) => g.key)).toEqual(["dream", "high", "medium", "low"]);
    expect(groupBucketItems([items[0]], "priority").map((g) => g.label)).toEqual(["Low priority"]);
  });

  it("puts default categories first, custom ones alphabetically, and none last", () => {
    const groups = groupBucketItems(items, "category");
    expect(groups.map((g) => g.label)).toEqual(["Travel & Getaways", "Food & Dining", "Dates", NO_CATEGORY]);
    expect(groups.at(-1)!.items.map((i) => i.id)).toEqual(["c", "e"]);
  });

  it("keeps an unknown status instead of losing it", () => {
    const groups = groupBucketItems([item("x", { status: "archived" as BucketItem["status"] }), items[1]], "status");
    expect(groups.map((g) => g.key)).toEqual(["planned", "archived"]);
  });
});

describe("categoryMark", () => {
  it("reads default and invented categories by their words", () => {
    expect(categoryMark("Travel & Getaways")).toBe("travel");
    expect(categoryMark("Outdoors & Adventures")).toBe("outdoors");
    expect(categoryMark("Dates")).toBe("romance");
    expect(categoryMark("Movie nights")).toBe("film");
    expect(categoryMark("Theatre")).toBe("culture");
    expect(categoryMark("Arts & Culture")).toBe("culture");
    expect(categoryMark("Party")).toBe("other");
    expect(categoryMark("Something else")).toBe("other");
    expect(categoryMark(null)).toBe("other");
  });
});

describe("suggestedPlanType", () => {
  it("guesses a plan kind from the category, defaulting to a date", () => {
    expect(suggestedPlanType("Travel & Getaways")).toBe("trip");
    expect(suggestedPlanType("Outdoors & Adventures")).toBe("activity");
    expect(suggestedPlanType("Milestones")).toBe("event");
    expect(suggestedPlanType("Dates")).toBe("date");
    expect(suggestedPlanType(null)).toBe("date");
  });
});

describe("priorityLevel", () => {
  it("maps low through dream to one through four", () => {
    expect(["low", "medium", "high", "dream"].map(priorityLevel)).toEqual([1, 2, 3, 4]);
  });
});
