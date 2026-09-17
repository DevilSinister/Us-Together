import { PageHeader } from "@/components/app/page-header";
import { PrivacySettings } from "@/components/privacy/privacy-settings";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { privacyLockStatus } from "@/lib/privacy/server";

export const metadata = { title: "Privacy locks" };

export default async function PrivacyPage() {
  const identity = await getCurrentIdentity();
  const status = identity?.kind === "developer" ? null : await privacyLockStatus();
  return <div className="mx-auto max-w-3xl reveal-on-load">
    <PageHeader scale="compact" eyebrow="Your account" title="Privacy locks." lede="Choose which parts of your shared space need an extra unlock." />
    {status ? <PrivacySettings configured={status.configured} initialAreas={status.areas} pinLength={status.pinLength} userId={status.userId} /> : <p className="rounded-panel border bg-card p-6 text-sm">Privacy locks are available when you sign in to a Supabase account.</p>}
  </div>;
}
