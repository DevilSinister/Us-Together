import type { Metadata } from "next";
import Link from "next/link";
import { Flag, Plus } from "lucide-react";
import { EntryPreview } from "@/components/entries/entry-preview";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import type { CoverImage } from "@/components/app/cover-photo";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { momentKindLabel, tallyMomentMedia, type MomentMediaTally } from "@/lib/dashboard/moments";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moments" };
type MilestoneRow = { id: string; title: string; description: string | null; type: string; milestone_date: string; is_featured: boolean };

/** Enough for fifty moments' files; a fuller answer than this is treated as unknown rather than trusted. */
const MEDIA_ROWS = 1000;

/**
 * Moments as a Cover screen: the newest pictured moment on the cover, and each
 * date beneath as a title, its day, a line of its story and a strip of small
 * photographs. One read of the listed moments' ready files chooses the cover
 * and tells each row how many photographs to hold room for, so a moment with
 * none asks for nothing and the strips do not shift the page as they arrive.
 */
export default async function MilestonesPage() {
  const identity = await getCurrentIdentity();
  let paired = false;
  let previewSession: string | undefined;
  let milestones: MilestoneRow[] = [];
  // Null when the files could not be counted (the developer preview keeps them in the browser).
  let media: Map<string, MomentMediaTally> | null = null;
  if (identity?.kind === "developer") {
    const state = await readDeveloperState();
    paired = state.coupleStatus === "paired";
    previewSession = state.bucketSessionId;
    milestones = state.milestones
      .map((item) => ({ id: item.id, title: item.title, description: item.description || null, type: item.type, milestone_date: item.milestoneDate, is_featured: item.featured }))
      .sort((a, b) => b.milestone_date.localeCompare(a.milestone_date) || b.id.localeCompare(a.id));
  } else if (identity?.kind === "supabase") {
    const supabase = await createServerSupabaseClient();
    const { data: membership } = await supabase.from("couple_memberships").select("couple_id").eq("user_id", identity.userId).is("left_at", null).maybeSingle();
    if (membership) {
      const { count } = await supabase.from("couple_memberships").select("id", { count: "exact", head: true }).eq("couple_id", membership.couple_id).is("left_at", null);
      paired = count === 2;
      if (paired) {
        const { data } = await supabase.from("milestones").select("id,title,description,type,milestone_date,is_featured").eq("couple_id", membership.couple_id).order("milestone_date", { ascending: false }).order("id", { ascending: false }).limit(50);
        milestones = (data ?? []) as MilestoneRow[];
        if (milestones.length) {
          // Only finished files: a partner's half-sent photo is never ready, so never counted or shown.
          const { data: files, error } = await supabase
            .from("milestone_media")
            .select("id,milestone_id,media_type")
            .eq("state", "ready")
            .in("milestone_id", milestones.map((item) => item.id))
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .limit(MEDIA_ROWS);
          if (!error && files && files.length < MEDIA_ROWS) media = tallyMomentMedia(files);
        }
      }
    }
  }
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
  const tallies = media;
  const pictured = milestones.find((item) => tallies?.get(item.id)?.cover);
  const cover = pictured ? tallies?.get(pictured.id)?.cover : null;
  const photo: CoverImage | null = pictured && cover ? { id: cover, kind: "moment", entryId: pictured.id } : null;
  const newest = milestones[0];

  return (
    <>
      <Cover
        labelledBy="moments-title"
        photo={photo}
        previewSession={previewSession}
        previewEntry={newest ? { kind: "moment", id: newest.id } : null}
        action={paired ? <Button asChild><Link href="/milestones/new"><Plus className="size-4" aria-hidden="true" />Add a moment</Link></Button> : null}
      >
        <h1 id="moments-title" className="font-display text-[2.75rem] leading-none tracking-[-0.02em]">Moments</h1>
        <p className="mt-2 text-[0.9375rem] text-muted-foreground">The dates that hold the thread</p>
      </Cover>

      <CoverSheet>
        {!paired ? (
          <PairingNotice
            className="mt-0"
            title="Moments begin with a connected partner."
            body="Connect both accounts so each date stays inside one clear couple boundary."
          />
        ) : milestones.length === 0 ? (
          <EmptyState
            className="mt-2"
            icon={Flag}
            title="Which date first made this feel like us?"
            body="Start with one date. You can feature it on Home or simply keep it in your shared timeline."
            action={<Button asChild><Link href="/milestones/new">Keep the first moment</Link></Button>}
          />
        ) : (
          <section className="stagger max-w-3xl divide-y divide-border" aria-label="Moment timeline">
            {milestones.map((milestone) => {
              const kind = momentKindLabel(milestone.type);
              const tally = tallies?.get(milestone.id);
              return (
                <article id={milestone.id} key={milestone.id} className="py-5 first:pt-1 last:pb-0">
                  <h2 className="text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere]">
                    {/* The padding is the touch target; the negative margin keeps the row's rhythm. */}
                    <Link
                      href={`/milestones/${milestone.id}`}
                      className="-my-3 inline-block rounded-control py-3 transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                    >
                      {milestone.title}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-[0.8125rem] leading-5 text-muted-foreground">
                    <time dateTime={milestone.milestone_date}>{formatter.format(new Date(`${milestone.milestone_date}T00:00:00Z`))}</time>
                    {kind ? ` · ${kind}` : null}
                    {milestone.is_featured ? <> · <span className="font-semibold text-primary">Featured</span></> : null}
                  </p>
                  {milestone.description ? <p className="mt-2 line-clamp-2 max-w-[65ch] text-sm leading-6 text-muted-foreground">{milestone.description}</p> : null}
                  {!tallies || tally ? (
                    <div className="mt-2.5">
                      <EntryPreview
                        access={{ kind: "moment", id: milestone.id, previewSession }}
                        entryTitle={milestone.title}
                        entryDate={milestone.milestone_date}
                        expect={tally?.photos}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}
      </CoverSheet>

      {paired ? <FloatingAction href="/milestones/new" label="Add a moment" /> : null}
    </>
  );
}
