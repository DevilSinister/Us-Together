import type { ChecklistItem, Reminder } from "@/lib/plans/types";
import { deflateSync, inflateSync } from "node:zlib";
import { cookies } from "next/headers";

const DEV_SESSION_COOKIE = "us_together_dev_session";
const DEV_STATE_COOKIE = "us_together_dev_state";

export type DevState = {
  bucketSessionId: string;
  displayName: string;
  timezone: string;
  avatarStyle: string;
  relationshipStartedOn: string;
  onboardingCompleted: boolean;
  coupleStatus: "solo" | "waiting" | "paired";
  partnerProfile?: {
    displayName: string;
    timezone: string;
    avatarStyle: string;
  };
  inviteCode?: string;
  planChecklist?: ChecklistItem[];
  planReminders?: Reminder[];
  entryReminders?: Array<{id:string;kind:"memory"|"moment";entryId:string;dueAt:string;state:string;readAt?:string|null}>;
  plans: Array<{
    latitude?: number | null;
    longitude?: number | null;
    mapUrl?: string | null;
    version?: number;
    budgetMinor?: number | null;
    currency?: string | null;
    sourceBucketId?: string;
    id: string;
    title: string;
    description: string;
    type: string;
    status: "planned" | "completed" | "cancelled";
    startsAt: string;
    endsAt: string | null;
    timezone: string;
    location: string;
  }>;
  memories: Array<{
    latitude?: number | null;
    longitude?: number | null;
    version?: number;
    tags?: string[];
    sourceBucketId?: string;
    id: string;
    title: string;
    description: string;
    memoryDate: string;
    location: string;
    rating: number | null;
    favorite: boolean;
    sourcePlanId: string | null;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    milestoneDate: string;
    location?: string;
    featured: boolean;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    category: "plan" | "memory" | "milestone" | "note" | "system" | "bucket" | "wishlist" | "drawing";
    targetType: string | null;
    targetId: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
  notificationPreferences: {
    inAppEnabled: boolean;
    plansEnabled: boolean;
    memoriesEnabled: boolean;
    milestonesEnabled: boolean;
    notesEnabled: boolean;
    onThisDayEnabled: boolean;
    bucketEnabled: boolean;
    wishlistEnabled: boolean;
    drawingsEnabled: boolean;
  };
};

const previewSamples = {
  plans: [
    { id: "00000000-0000-4000-8000-000000000401", title: "Coffee, a long walk, and no rush", description: "A slow Saturday for catching up with each other.", type: "date", status: "planned" as const, startsAt: "2026-11-22T08:00:00.000Z", endsAt: null, timezone: "Asia/Karachi", location: "F-6 Markaz" },
    { id: "00000000-0000-4000-8000-000000000406", title: "Pottery class, round two", description: "Evening slot. Bring old clothes.", type: "activity", status: "planned" as const, startsAt: "2026-11-29T13:00:00.000Z", endsAt: "2026-11-29T15:00:00.000Z", timezone: "Asia/Karachi", location: "F-7" },
    { id: "00000000-0000-4000-8000-000000000407", title: "Weekend in Nathia Gali", description: "Two nights, a fireplace, and no laptops.", type: "trip", status: "planned" as const, startsAt: "2026-12-12T05:00:00.000Z", endsAt: "2026-12-14T12:00:00.000Z", timezone: "Asia/Karachi", location: "Nathia Gali" },
    { id: "00000000-0000-4000-8000-000000000408", title: "Sunset at Daman-e-Koh", description: "Pack the flask.", type: "date", status: "completed" as const, startsAt: "2026-06-07T13:30:00.000Z", endsAt: null, timezone: "Asia/Karachi", location: "Daman-e-Koh" },
  ],
  memories: [
    { id: "00000000-0000-4000-8000-000000000402", title: "Rainy chai after work", description: "We stayed out a little longer because neither of us wanted the evening to end.", memoryDate: "2026-10-02", location: "Home", rating: 5, favorite: true, sourcePlanId: null },
    { id: "00000000-0000-4000-8000-000000000403", title: "Sunday breakfast experiment", description: "The pancakes were uneven, the laughter was not.", memoryDate: "2026-09-21", location: "Kitchen", rating: 4, favorite: false, sourcePlanId: null },
    { id: "00000000-0000-4000-8000-000000000409", title: "Monsoon drive to the lake", description: "Windows down, the wrong road twice, and the best corn on the way back.", memoryDate: "2025-07-20", location: "Rawal Lake", rating: 5, favorite: true, sourcePlanId: null, tags: ["drives", "rain"] },
    { id: "00000000-0000-4000-8000-000000000410", title: "Birthday picnic in the park", description: "Too much cake for two people, so we shared it with the ducks.", memoryDate: "2024-03-03", location: "Fatima Jinnah Park", rating: 4, favorite: false, sourcePlanId: null, tags: ["birthday"] },
  ],
  milestones: [
    { id: "00000000-0000-4000-8000-000000000404", title: "First little trip together", description: "A whole weekend made from a train ride, too many photos, and one very good view.", type: "travel", milestoneDate: "2025-12-14", location: "Murree", featured: false },
    { id: "00000000-0000-4000-8000-000000000405", title: "The night we made a promise", description: "One quiet conversation that changed the shape of everything after it.", type: "relationship", milestoneDate: "2024-08-14", location: "Islamabad", featured: false },
    { id: "00000000-0000-4000-8000-000000000411", title: "Moved into our first flat", description: "Twelve boxes, one plant, and a door that stuck for a week.", type: "achievement", milestoneDate: "2025-03-02", location: "Islamabad", featured: true },
  ],
  notifications: [
    { id: "00000000-0000-4000-8000-000000000412", title: "Maya left you a note", category: "note" as const, targetType: "note", targetId: "00000000-0000-4000-8000-000000000501", readAt: null, createdAt: "2026-11-11T18:40:00.000Z" },
    { id: "00000000-0000-4000-8000-000000000413", title: "Maya sent you a drawing", category: "drawing" as const, targetType: "drawing", targetId: "00000000-0000-4000-8000-000000000701", readAt: null, createdAt: "2026-11-12T09:20:00.000Z" },
    { id: "00000000-0000-4000-8000-000000000414", title: "Coffee, a long walk, and no rush is in ten days", category: "plan" as const, targetType: "plan", targetId: "00000000-0000-4000-8000-000000000401", readAt: "2026-11-12T08:00:00.000Z", createdAt: "2026-11-12T07:00:00.000Z" },
  ],
};

/**
 * Adds any sample whose id is not already present, so a preview that began
 * before new samples were added still gains them. A sample you delete in the
 * preview comes back on the next read; it is test data.
 */
function withSamples<T extends { id: string }>(current: T[], samples: T[]): T[] {
  const present = new Set(current.map((item) => item.id));
  const missing = samples.filter((item) => !present.has(item.id));
  return missing.length ? [...current, ...missing] : current;
}

function pairedPreviewSamples(state: DevState): DevState {
  if (process.env.DEV_SEED_CONTENT !== "true" || state.coupleStatus !== "paired") return state;
  return {
    ...state,
    plans: withSamples(state.plans, previewSamples.plans),
    memories: withSamples(state.memories, previewSamples.memories),
    milestones: withSamples(state.milestones, previewSamples.milestones),
    notifications: withSamples(state.notifications, previewSamples.notifications),
  };
}

function createDeveloperState(fixture: "paired" | "solo" = "solo"): DevState {
  if (fixture === "paired") {
    const paired: DevState = {
      bucketSessionId: crypto.randomUUID(),
      displayName: "Alex",
      timezone: "Asia/Karachi",
      avatarStyle: "wine",
      relationshipStartedOn: "2022-08-14",
      onboardingCompleted: true,
      coupleStatus: "paired",
      partnerProfile: { displayName: "Maya", timezone: "Asia/Karachi", avatarStyle: "rose" },
      plans: [],
      memories: [],
      milestones: [{ id: "00000000-0000-4000-8000-000000000301", title: "The day we chose us", description: "A date worth keeping close.", type: "relationship", milestoneDate: "2022-08-14", featured: true }],
      notifications: [{ id: "00000000-0000-4000-8000-000000000302", title: "A milestone was added", category: "milestone", targetType: "milestone", targetId: "00000000-0000-4000-8000-000000000301", readAt: null, createdAt: "2026-08-31T12:00:00.000Z" }],
      notificationPreferences: { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true, onThisDayEnabled: true, bucketEnabled: true, wishlistEnabled: true, drawingsEnabled: true },
    };
    return pairedPreviewSamples(paired);
  }
  return {
    bucketSessionId: crypto.randomUUID(),
    displayName: "",
    timezone: "UTC",
    avatarStyle: "rose",
    relationshipStartedOn: "",
    onboardingCompleted: false,
    coupleStatus: "solo",
    plans: [],
    memories: [],
    milestones: [],
    notifications: [],
    notificationPreferences: { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true, onThisDayEnabled: true, bucketEnabled: true, wishlistEnabled: true, drawingsEnabled: true },
  };
}

export function isDeveloperLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN_ENABLED === "true";
}

export function isDeveloperSeedEnabled() {
  return isDeveloperLoginEnabled() && process.env.DEV_SEED_CONTENT === "true";
}

export async function hasDeveloperSession() {
  if (!isDeveloperLoginEnabled()) return false;
  return (await cookies()).get(DEV_SESSION_COOKIE)?.value === "local-test-user";
}

export async function startDeveloperSession(fixture: "paired" | "solo" = "paired") {
  if (!isDeveloperLoginEnabled()) throw new Error("Developer login is disabled.");
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, "local-test-user", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  cookieStore.set(DEV_STATE_COOKIE, encodeState(createDeveloperState(fixture)), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function endDeveloperSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SESSION_COOKIE);
  cookieStore.delete(DEV_STATE_COOKIE);
}

export async function readDeveloperState(): Promise<DevState> {
  const fallback = createDeveloperState();
  if (!(await hasDeveloperSession())) return fallback;
  const raw = (await cookies()).get(DEV_STATE_COOKIE)?.value;
  if (!raw) return fallback;
  try {
    return pairedPreviewSamples({ ...fallback, ...JSON.parse((raw.startsWith("z.") ? inflateSync(Buffer.from(raw.slice(2), "base64url"), { maxOutputLength: 262144 }) : Buffer.from(raw, "base64url")).toString("utf8")) } as DevState);
  } catch {
    return fallback;
  }
}

export async function writeDeveloperState(next: DevState) {
  if (!(await hasDeveloperSession())) throw new Error("Developer session is not active.");
  (await cookies()).set(DEV_STATE_COOKIE, encodeState(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

function encodeState(state: DevState) {
  const encoded = "z." + deflateSync(Buffer.from(JSON.stringify(state), "utf8")).toString("base64url");
  if (encoded.length > 3600) throw new Error("This temporary preview is full. Remove a plan or use your connected account.");
  return encoded;
}
