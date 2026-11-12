import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronDown, ChevronRight, Clock, LogOut, Moon, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import { AppearanceSetting } from "@/components/profile/appearance-setting";
import { AppearanceSummary } from "@/components/profile/appearance-summary";
import { UploadSignOutForm } from "@/components/providers/upload-owner";
import { Avatar } from "@/components/app/avatar";
import { Cover, CoverSheet } from "@/components/app/cover";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { loadIdentities } from "@/lib/avatar/identities";
import { privacyLockStatus } from "@/lib/privacy/server";

export const metadata: Metadata = { title: "Profile" };

/**
 * Profile as a Cover screen (ADR-053): your face and name in the band, then
 * one ruled list of everything about your account. Name and picture, and
 * Appearance, open in place; Notifications, Privacy locks and Partner lead to
 * their own pages; your local time is shown as it is, read from this device.
 * Sign out closes the page.
 */
export default async function ProfilePage() {
  const identity = await getCurrentIdentity();
  let profile: { display_name: string | null; timezone: string } | null = null;
  let paired = false;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    profile = { display_name: state.displayName, timezone: state.timezone };
    paired = state.coupleStatus === "paired";
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [result, membership] = await Promise.all([
      supabase.from("profiles").select("display_name, timezone").eq("user_id", identity.userId).maybeSingle(),
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
    ]);
    profile = result.data;
    if (membership.data) {
      const { count } = await supabase.from("couple_memberships").select("user_id", { count: "exact", head: true }).eq("couple_id", membership.data.couple_id).is("left_at", null);
      paired = (count ?? 0) > 1;
    }
  }
  const [identities, locks] = await Promise.all([loadIdentities(), privacyLockStatus().catch(() => null)]);
  const name = profile?.display_name || identities.me.name;
  const lockLine = identity?.kind === "developer" || !locks
    ? "Needs a connected account"
    : !locks.configured ? "Off" : locks.areas.length ? `${locks.areas.length} ${locks.areas.length === 1 ? "section" : "sections"} locked` : "No sections locked";

  return (
    <>
      <Cover labelledBy="profile-title" height="band">
        <div className="flex items-center gap-3.5">
          <Avatar name={identities.me.name} src={identities.me.src} style={identities.me.style} size="lg" eager className="ring-[3px] ring-[var(--cover-field)]" />
          <div className="min-w-0">
            <h1 id="profile-title" className="break-words font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">{name}</h1>
            <p className="mt-0.5 text-[0.9375rem] leading-6 text-muted-foreground">Your account</p>
          </div>
        </div>
      </Cover>

      <CoverSheet>
        <div className="flex max-w-2xl flex-col gap-6">
          <ul className="flex flex-col">
            <Disclosure icon={UserRound} kicker="Name and picture" title={name}>
              <ProfileForm displayName={profile?.display_name ?? ""} timezone={profile?.timezone ?? "UTC"} avatarSrc={identities.me.src} />
            </Disclosure>
            <li className="flex min-h-[4.25rem] items-center gap-3 border-b border-border py-3">
              <Dot icon={Clock} />
              <Words kicker="Your local time · taken from this device" title={profile?.timezone ?? "UTC"} />
            </li>
            <Disclosure icon={Moon} kicker="Appearance" title={<AppearanceSummary />}>
              <p className="mb-4 text-sm leading-6 text-muted-foreground">Dark is easier on the eyes at night; matching your device follows its own setting.</p>
              <AppearanceSetting />
            </Disclosure>
            <Row href="/notifications" icon={Bell} kicker="Notifications" title="In the app and on this phone" />
            <Row href="/privacy" icon={ShieldCheck} kicker="Privacy locks" title={lockLine} />
            <li className="border-b border-border last:border-0">
              <Link href="/pairing" className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <Avatar name={identities.partner.name} src={identities.partner.src} style={identities.partner.style} size="md" className="size-11 shrink-0" />
                <Words kicker="Partner" title={paired ? identities.partner.name : "Connect your partner"} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          </ul>

          <div className="flex flex-col gap-2">
            <UploadSignOutForm>
              <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border px-3.5 text-sm font-semibold transition-colors duration-150 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
                <LogOut className="size-4" aria-hidden="true" />Sign out
              </button>
            </UploadSignOutForm>
            <p className="text-center text-[0.8125rem] leading-5 text-muted-foreground">Signing out also clears any photos still waiting to send from this device.</p>
          </div>
        </div>
      </CoverSheet>
    </>
  );
}

function Dot({ icon: Icon }: { icon: LucideIcon }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary"><Icon className="size-5" aria-hidden="true" /></span>;
}

function Words({ kicker, title }: { kicker: string; title: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
      <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{title}</span>
      <span className="text-[0.8125rem] leading-5 text-muted-foreground">{kicker}</span>
    </span>
  );
}

function Row({ href, icon, kicker, title }: { href: string; icon: LucideIcon; kicker: string; title: string }) {
  return (
    <li className="border-b border-border last:border-0">
      <Link href={href} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Dot icon={icon} />
        <Words kicker={kicker} title={title} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** A row that opens in place: its summary is the row, its body the editor. */
function Disclosure({ icon, kicker, title, children }: { icon: LucideIcon; kicker: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="border-b border-border">
      <details className="group">
        <summary className="flex min-h-[4.25rem] cursor-pointer list-none items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <Dot icon={icon} />
          <Words kicker={kicker} title={title} />
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="pb-5 pt-1">{children}</div>
      </details>
    </li>
  );
}
