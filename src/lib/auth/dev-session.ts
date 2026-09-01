import { cookies } from "next/headers";

const DEV_SESSION_COOKIE = "us_together_dev_session";
const DEV_STATE_COOKIE = "us_together_dev_state";

export type DevState = {
  displayName: string;
  timezone: string;
  avatarStyle: string;
  relationshipStartedOn: string;
  onboardingCompleted: boolean;
  coupleStatus: "solo" | "waiting" | "paired";
  inviteCode?: string;
};

const defaultState: DevState = {
  displayName: "",
  timezone: "UTC",
  avatarStyle: "rose",
  relationshipStartedOn: "",
  onboardingCompleted: false,
  coupleStatus: "solo",
};

export function isDeveloperLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN_ENABLED === "true";
}

export async function hasDeveloperSession() {
  if (!isDeveloperLoginEnabled()) return false;
  return (await cookies()).get(DEV_SESSION_COOKIE)?.value === "local-test-user";
}

export async function startDeveloperSession() {
  if (!isDeveloperLoginEnabled()) throw new Error("Developer login is disabled.");
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, "local-test-user", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  cookieStore.set(DEV_STATE_COOKIE, encodeState(defaultState), {
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
  if (!(await hasDeveloperSession())) return defaultState;
  const raw = (await cookies()).get(DEV_STATE_COOKIE)?.value;
  if (!raw) return defaultState;
  try {
    return { ...defaultState, ...JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) } as DevState;
  } catch {
    return defaultState;
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
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}
