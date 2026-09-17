import { privacyAreaOpen, privacyLockStatus } from "@/lib/privacy/server";
import type { LockArea } from "@/lib/privacy/areas";
import { UnlockPanel } from "@/components/privacy/unlock-panel";

export async function LockGate({ area, children }: { area: LockArea; children: React.ReactNode }) {
  if (await privacyAreaOpen(area)) return <>{children}</>;
  const status = await privacyLockStatus();
  return <UnlockPanel area={area} userId={status.userId} pinLength={status.pinLength} />;
}
