import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronRight, CircleCheck, Clock } from "lucide-react";
import { ConnectStepForms, PartnerStepForm } from "@/components/onboarding/onboarding-forms";
import { LeaveSpace, WaitingConnectionActions } from "@/components/pairing/connection-actions";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadIdentities } from "@/lib/avatar/identities";
import { relationshipDayCount } from "@/lib/dashboard/model";
import { getViewerTimeZone } from "@/lib/time/viewer";
import { Avatar, AvatarPair } from "@/components/app/avatar";
import { Cover, CoverSheet } from "@/components/app/cover";
import { Button } from "@/components/ui/button";
import { forgetPartnerPresentationAction } from "@/app/actions/partner";

export const metadata: Metadata = { title: "Partner" };

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The partner page as a Cover screen (ADR-053). Paired, the band is the two of
 * you, with how long you have shared the space; a raised panel says it is
 * connected and closed to anyone else; rows hold what you call them (and the
 * picture you see), their local time and where it began; leaving sits at the
 * foot behind a typed confirmation. Before pairing, the band says what is
 * waiting and the sheet holds the invitation forms, unchanged.
 */
export default async function PairingPage() {
  const identity = await getCurrentIdentity();
  let status: "solo" | "waiting" | "paired" = "solo";
  // The name and face come from the resolved identities - what you chose for
  // your partner, falling back to their own name - so this page matches every
  // other place they appear.
  const identities = await loadIdentities();
  let partner: { timezone: string } | null = null;
  // How your partner appears to you: your own record, never shown to them.
  let chosen = { name: "", avatarStyle: "rose" };
  let startedOn: string | null = null;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    status = state.coupleStatus;
    if (state.partnerProfile) partner = { timezone: state.partnerProfile.timezone };
    chosen = { name: state.partnerProfile?.displayName ?? "", avatarStyle: state.partnerProfile?.avatarStyle ?? "rose" };
    startedOn = state.relationshipStartedOn || null;
  }
  if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const [{ data: membership }, { data: presentation }, { data: own }] = await Promise.all([
      supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle(),
      supabase.from("partner_presentations").select("display_name, avatar_style").eq("owner_id", identity.userId).maybeSingle(),
      supabase.from("profiles").select("relationship_started_on").eq("user_id", identity.userId).maybeSingle(),
    ]);
    chosen = { name: presentation?.display_name ?? "", avatarStyle: presentation?.avatar_style ?? "rose" };
    if (membership) {
      const [{ data: memberships }, { data: couple }] = await Promise.all([
        supabase.from("couple_memberships").select("user_id").eq("couple_id", membership.couple_id).is("left_at", null),
        supabase.from("couples").select("relationship_started_on").eq("id", membership.couple_id).maybeSingle(),
      ]);
      startedOn = couple?.relationship_started_on ?? own?.relationship_started_on ?? null;
      const partnerId = memberships?.find((item) => item.user_id !== identity.userId)?.user_id;
      status = partnerId ? "paired" : "waiting";
      if (partnerId) {
        const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", partnerId).maybeSingle();
        if (profile) partner = { timezone: profile.timezone };
      }
    }
  }

  if (status !== "paired") {
    const waiting = status === "waiting";
    return (
      <>
        <Cover labelledBy="partner-title" height="band">
          <h1 id="partner-title" className="font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">{waiting ? "Your invitation is waiting." : "Bring your two accounts together."}</h1>
          <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">{waiting ? "Your shared space is ready for its second account." : "One of you creates the invitation; the other joins with its short-lived code."}</p>
        </Cover>
        <CoverSheet className="max-w-2xl">
          {waiting ? <WaitingConnectionActions /> : <ConnectStepForms />}
        </CoverSheet>
      </>
    );
  }

  const days = startedOn ? relationshipDayCount(startedOn, await getViewerTimeZone()) : null;
  const since = startedOn
    ? `Together here since ${longDate.format(new Date(startedOn + "T12:00:00Z"))}${days !== null ? ` · ${days.toLocaleString("en")} ${days === 1 ? "day" : "days"}` : ""}`
    : "Two accounts, one shared space";

  return (
    <>
      <Cover labelledBy="partner-title" height="band">
        <AvatarPair me={identities.me} partner={identities.partner} size="lg" className="[&>*]:ring-[var(--cover-field)]" />
        <h1 id="partner-title" className="mt-3 break-words font-display text-[2.125rem] leading-[1.1] tracking-[-0.02em]">{identities.me.name} and {identities.partner.name}</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">{since}</p>
      </Cover>

      <CoverSheet>
        <div className="flex max-w-2xl flex-col gap-6">
          <div className="flex gap-3 rounded-panel bg-secondary p-4">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="text-[1.0625rem] font-semibold leading-[1.35]">Connected</p>
              <p className="text-sm leading-6 text-secondary-foreground">Two accounts share this space. Nobody else can be added, and shared access lasts only while both memberships are active.</p>
            </div>
          </div>

          <ul className="flex flex-col">
            <li className="border-b border-border" id="partner">
              <details className="group">
                <summary className="flex min-h-[4.25rem] cursor-pointer list-none items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <Avatar name={identities.partner.name} src={identities.partner.src} style={identities.partner.style} size="md" className="size-11 shrink-0" />
                  <Words kicker="What you call your partner" title={identities.partner.name} />
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <div className="flex flex-col gap-5 pb-5 pt-1">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {chosen.name ? "Yours, not theirs: they never see the name or picture you chose." : `Right now they appear as “${identities.partner.name}”, the name they chose.`}
                  </p>
                  <PartnerStepForm partnerName={chosen.name} partnerAvatarStyle={chosen.avatarStyle} partnerAvatarSrc={identities.partner.src} returnTo="pairing" />
                  {chosen.name || identities.partner.src ? (
                    <form action={forgetPartnerPresentationAction} className="border-t pt-4">
                      <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10 hover:text-danger">Forget these details</Button>
                      <p className="mt-1 text-xs text-muted-foreground">Leaving a couple never erases this on its own; forgetting is always something you choose.</p>
                    </form>
                  ) : null}
                </div>
              </details>
            </li>
            <li className="flex min-h-[4.25rem] items-center gap-3 border-b border-border py-3 last:border-0">
              <Dot><Clock className="size-5" aria-hidden="true" /></Dot>
              <Words kicker="Their local time" title={partner?.timezone ?? "Not shared yet"} />
            </li>
            {startedOn ? (
              <li className="border-b border-border last:border-0">
                <Link href="/story" className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <Dot><CalendarDays className="size-5" aria-hidden="true" /></Dot>
                  <Words kicker="Where it began" title={longDate.format(new Date(startedOn + "T12:00:00Z"))} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ) : null}
          </ul>

          <LeaveSpace />
        </div>
      </CoverSheet>
    </>
  );
}

function Dot({ children }: { children: React.ReactNode }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary">{children}</span>;
}

function Words({ kicker, title }: { kicker: string; title: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
      <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{title}</span>
      <span className="text-[0.8125rem] leading-5 text-muted-foreground">{kicker}</span>
    </span>
  );
}
