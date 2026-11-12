import { Cover, CoverSheet } from "@/components/app/cover";
import { PrivacySettings } from "@/components/privacy/privacy-settings";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { privacyLockStatus } from "@/lib/privacy/server";

export const metadata = { title: "Privacy locks" };

/** Privacy lock settings under a band with a way back to Profile (ADR-053); the settings themselves are unchanged. */
export default async function PrivacyPage() {
  const identity = await getCurrentIdentity();
  const status = identity?.kind === "developer" ? null : await privacyLockStatus();
  return <>
    <Cover labelledBy="privacy-title" height="band" back={{ href: "/profile", label: "Back to profile" }}>
      <h1 id="privacy-title" className="font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">Privacy locks</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Choose which parts of your shared space need an extra unlock.</p>
    </Cover>
    <CoverSheet className="max-w-3xl">
      {status ? <PrivacySettings configured={status.configured} initialAreas={status.areas} pinLength={status.pinLength} userId={status.userId} /> : <p className="rounded-panel bg-secondary p-5 text-sm leading-6">Privacy locks are available when you sign in to a connected account.</p>}
    </CoverSheet>
  </>;
}
