import "server-only";
import { isDeveloperSeedEnabled, readDeveloperState } from "@/lib/auth/dev-session";
import type { BucketItem, BucketList, BucketSubtask } from "@/lib/bucket/schema";
import type { DrawingNote } from "@/lib/drawings/data";
import type { Note } from "@/lib/notes/schema";
import type { PurchaseSecret, WishlistItem } from "@/lib/wishlist/schema";

/**
 * Fictional sample content for the paired developer preview, so every screen
 * can be seen with something on it. It is read-only and never written to the
 * preview cookies, which are capped at a few kilobytes: saving in these
 * sections still says it needs a connected account. It exists only when
 * developer login and DEV_SEED_CONTENT are both on, which production never is.
 */

const me = "preview-me";
const partner = "preview-partner";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** The partner's name when the preview is paired and seeded, else null. */
export async function seededPreview(): Promise<{ partner: string; sessionId: string } | null> {
  if (!isDeveloperSeedEnabled()) return null;
  const state = await readDeveloperState();
  if (state.coupleStatus !== "paired") return null;
  return { partner: state.partnerProfile?.displayName || "Your partner", sessionId: state.bucketSessionId };
}

// Notes ---------------------------------------------------------------------

const note = (n: number, type: "shared" | "private", author: string, at: string, title: string, body: string, read = true): Note => ({
  id: id(n), type, title, body, author_id: author, created_at: at, updated_at: at, mine: author === me, read: author === me || read,
});

export const sampleNotes: Note[] = [
  note(501, "shared", partner, "2026-11-11T18:40:00.000Z", "For the drive home", "Leave the umbrella in the car this time. I put the good playlist on your phone, the one with the song from the wedding.\n\nSee you at seven.", false),
  note(502, "shared", me, "2026-11-09T21:05:00.000Z", "Things I noticed today", "You hum when you are reading something you like. You did it three times this evening and I did not say anything because I did not want you to stop."),
  note(503, "private", me, "2026-11-06T08:15:00.000Z", "Anniversary ideas", "Pottery class again? The place near F-7 does evening slots.\nRecreate the first dinner, same table if possible.\nWrite the letter early this year."),
  note(504, "shared", partner, "2026-10-28T12:30:00.000Z", "Sorry about Tuesday", "I was tired and short with you, and it was not about you at all. Thank you for making tea anyway."),
  note(505, "shared", me, "2026-10-14T19:50:00.000Z", "A list of small good things", "Warm bread. Your laugh at the wrong moment in films. Rain on the window when we are both home."),
  note(506, "shared", partner, "2026-09-30T07:10:00.000Z", "Good luck today", "You have prepared for this for weeks. Go and be brilliant, then come home and tell me everything."),
];

// Wishlists -----------------------------------------------------------------

const wish = (n: number, owner: string, title: string, rest: Partial<WishlistItem> = {}): WishlistItem => ({
  id: id(n), title, description: null, product_url: null, price_minor: null, currency: null, category: null,
  priority: "want", notes: null, owner_id: owner, mine: owner === me, ...rest,
});

export const sampleWishes: WishlistItem[] = [
  wish(601, partner, "The big pasta cookbook", { price_minor: 4500, currency: "EUR", category: "Bookshop on Mill Street", priority: "really_want", product_url: "https://example.com/pasta-book", notes: "The one with the green cover, not the paperback." }),
  wish(602, partner, "Pour-over coffee set", { price_minor: 6000, currency: "EUR", category: "Ceramics studio", description: "Glass, not ceramic. The small one is enough for two cups." }),
  wish(603, partner, "Linen bedsheets in sage", { priority: "nice_to_have", category: "Home" }),
  wish(604, partner, "A day at the hot springs", { priority: "really_want", description: "Somewhere we can stay the night and not look at our phones." }),
  wish(605, me, "Film camera strap", { price_minor: 2800, currency: "EUR", category: "Camera shop" }),
  wish(606, me, "Running shoes, half a size up", { price_minor: 12000, currency: "EUR", priority: "really_want", product_url: "https://example.com/shoes" }),
  wish(607, me, "A plant that is hard to kill", { priority: "nice_to_have", notes: "Not another fern." }),
];

export const sampleSecrets: Record<string, PurchaseSecret> = {
  [id(601)]: { id: id(651), status: "purchased", notes: "Ordered, arrives Thursday. Hidden in the top cupboard.", purchased_at: "2026-11-10T10:00:00.000Z" } as PurchaseSecret,
  [id(604)]: { id: id(652), status: "planned", notes: null, purchased_at: null } as PurchaseSecret,
};

// Drawings ------------------------------------------------------------------

const drawing = (n: number, author: string, at: string, read = true): DrawingNote => ({
  id: id(n), author_id: author, recipient_id: author === me ? partner : me, sent_at: at, mine: author === me, read: author === me || read,
});

export const sampleDrawings: DrawingNote[] = [
  drawing(701, partner, "2026-11-12T09:20:00.000Z", false),
  drawing(702, me, "2026-11-08T20:45:00.000Z"),
  drawing(703, partner, "2026-11-02T16:05:00.000Z"),
  drawing(704, me, "2026-10-21T22:30:00.000Z"),
  drawing(705, partner, "2026-10-03T11:00:00.000Z"),
];

const doodles: Record<string, string> = {
  [id(701)]: '<path d="M320 380c-90-60-150-110-150-170 0-45 35-80 78-80 32 0 56 18 72 44 16-26 40-44 72-44 43 0 78 35 78 80 0 60-60 110-150 170Z" fill="#e45a83"/><path d="M200 420h240" stroke="#6f1730" stroke-width="6" stroke-linecap="round"/>',
  [id(702)]: '<circle cx="320" cy="220" r="80" fill="#f4a646"/><g stroke="#f4a646" stroke-width="10" stroke-linecap="round"><path d="M320 90v-40M320 390v-40M190 220h-40M490 220h-40M228 128l-28-28M440 340l-28-28M228 312l-28 28M440 100l-28 28"/></g><path d="M120 420c80-30 320-30 400 0" stroke="#86b65b" stroke-width="10" fill="none" stroke-linecap="round"/>',
  [id(703)]: '<path d="M250 240h140v90a70 70 0 0 1-140 0Z" fill="#fff" stroke="#2f2527" stroke-width="8"/><path d="M390 260h20a30 30 0 0 1 0 60h-20" fill="none" stroke="#2f2527" stroke-width="8"/><path d="M285 200c-10-20 10-30 0-50M325 200c-10-20 10-30 0-50M365 200c-10-20 10-30 0-50" stroke="#b75a6d" stroke-width="6" fill="none" stroke-linecap="round"/>',
  [id(704)]: '<g fill="#e45a83"><circle cx="320" cy="180" r="45"/><circle cx="380" cy="230" r="45"/><circle cx="260" cy="230" r="45"/><circle cx="350" cy="295" r="45"/><circle cx="290" cy="295" r="45"/></g><circle cx="320" cy="240" r="30" fill="#f2d958"/><path d="M320 340v120" stroke="#5c8d78" stroke-width="10" stroke-linecap="round"/>',
  [id(705)]: '<path d="M120 400 260 200l80 110 60-70 120 160Z" fill="#5c8d78"/><circle cx="470" cy="140" r="40" fill="#f2d958"/><path d="M80 420h480" stroke="#2f2527" stroke-width="6" stroke-linecap="round"/>',
};

/** A sample drawing as a small SVG on white paper, or null for any other id. */
export function sampleDrawingSvg(drawingId: string): string | null {
  const art = doodles[drawingId];
  return art ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480"><rect width="640" height="480" fill="#fff"/>${art}</svg>` : null;
}

// Bucket lists --------------------------------------------------------------

type BucketPreview = { lists: BucketList[]; items: BucketItem[]; subtasks: BucketSubtask[] };

/** A starting bucket preview. Unlike the sections above it is editable: the first change saves it to the bucket cookie. */
export function sampleBucket(sessionId: string): BucketPreview {
  const stamp = "2026-11-01T10:00:00.000Z";
  const item = (n: number, list: number, title: string, rest: Partial<BucketItem> = {}): BucketItem => ({
    id: id(n), list_id: id(list), couple_id: "preview", title, description: null, category: null, priority: "medium", status: "idea",
    location: null, target_date: null, estimated_cost_minor: null, currency: null, lived_on: null, completed_at: null, completed_by: null,
    created_at: stamp, created_by: sessionId, updated_at: stamp, version: 1, ...rest,
  });
  const task = (n: number, itemN: number, label: string, position: number, done = false): BucketSubtask => ({
    id: id(n), item_id: id(itemN), label, position, is_completed: done, created_at: stamp, updated_at: stamp,
  });
  return {
    lists: [{ id: id(801), title: "Before we turn 30" }, { id: id(802), title: "Little weekend things" }],
    items: [
      item(811, 801, "See the northern lights", { category: "Travel & Getaways", priority: "dream", description: "Somewhere cold, with a cabin and a window." }),
      item(812, 801, "Learn to make proper biryani", { category: "Food & Dining", priority: "high", status: "in_progress" }),
      item(813, 801, "Road trip to Hunza", { category: "Outdoors & Adventures", priority: "high", status: "planned", target_date: "2027-05-10", location: "Hunza" }),
      item(814, 801, "Sleep under the stars", { category: "Outdoors & Adventures", status: "completed", lived_on: "2025-09-12", completed_at: "2025-09-13T08:00:00.000Z", completed_by: sessionId }),
      item(815, 802, "Breakfast somewhere new every month", { category: "Little Rituals", priority: "low" }),
      item(816, 802, "Build a reading corner", { category: "Home & Cozy", status: "in_progress" }),
      item(817, 802, "A museum we have never been to", { category: "Arts & Culture", priority: "low" }),
    ],
    subtasks: [
      task(821, 812, "Buy the good basmati", 0, true),
      task(822, 812, "Ask Ammi for the masala ratio", 1, true),
      task(823, 812, "First attempt", 2),
      task(824, 816, "Find a chair", 0, true),
      task(825, 816, "Floor lamp", 1),
    ],
  };
}
