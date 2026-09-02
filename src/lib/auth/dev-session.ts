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
    category: "plan" | "memory" | "milestone" | "note" | "system";
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
  };
};

function createDeveloperState(fixture: "paired" | "solo" = "solo"): DevState {
  if (fixture === "paired") {
    return {
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
      notificationPreferences: { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true },
    };
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
    notificationPreferences: { inAppEnabled: true, plansEnabled: true, memoriesEnabled: true, milestonesEnabled: true, notesEnabled: true },
  };
}

export function isDeveloperLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN_ENABLED === "true";
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
    return { ...fallback, ...JSON.parse((raw.startsWith("z.") ? inflateSync(Buffer.from(raw.slice(2), "base64url"), { maxOutputLength: 262144 }) : Buffer.from(raw, "base64url")).toString("utf8")) } as DevState;
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
