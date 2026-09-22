import { redirect } from "next/navigation";
import { PartnerSync } from "@/components/providers/partner-sync";
import { IdentitiesProvider } from "@/components/providers/identities";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { loadIdentities } from "@/lib/avatar/identities";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  // Resolved once per request so client components deep in the gallery can show
  // a face without prop-drilling one through every workspace between here and
  // the comment thread.
  const identities = await loadIdentities();
  return <PartnerSync enabled={identity.kind === "supabase"}>
    <IdentitiesProvider value={identities}><AppShell>{children}</AppShell></IdentitiesProvider>
  </PartnerSync>;
}
