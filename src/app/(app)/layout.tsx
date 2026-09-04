import { redirect } from "next/navigation";
import { PartnerSync } from "@/components/providers/partner-sync";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentIdentity } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const identity = await getCurrentIdentity();
  if (!identity) redirect("/sign-in");
  return <PartnerSync enabled={identity.kind === "supabase"}><AppShell>{children}</AppShell></PartnerSync>;
}
