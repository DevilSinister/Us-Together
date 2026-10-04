import { redirect } from "next/navigation";
import { PartnerSync } from "@/components/providers/partner-sync";
import { IdentitiesProvider } from "@/components/providers/identities";
import { AppShell } from "@/components/app/app-shell";
import { getUnreadNotificationCount } from "@/app/actions/notifications";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { loadIdentities } from "@/lib/avatar/identities";
import { isDeveloperSeedEnabled, readDeveloperState } from "@/lib/auth/dev-session";
import { PreviewSampleMedia } from "@/components/dev/preview-sample-media";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  // Resolved once per request so client components deep in the gallery can show
  // a face without prop-drilling one through every workspace between here and
  // the comment thread.
  const identities = await loadIdentities();
  const unreadCount = await getUnreadNotificationCount();
  const previewState = identity.kind === "developer" && isDeveloperSeedEnabled() ? await readDeveloperState() : null;
  return <PartnerSync enabled={identity.kind === "supabase"}>
    <IdentitiesProvider value={identities}><AppShell unreadCount={unreadCount}>{previewState ? <PreviewSampleMedia sessionId={previewState.bucketSessionId} /> : null}{children}</AppShell></IdentitiesProvider>
  </PartnerSync>;
}
