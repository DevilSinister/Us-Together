import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { MilestoneForm } from "@/components/dashboard/milestone-form";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";

export const metadata: Metadata = { title: "New moment" };

export default async function NewMilestonePage() {
  const identity = await getCurrentIdentity();

  return (
    <div className="mx-auto max-w-3xl reveal-on-load">
      <PageHeader
        eyebrow="Mark the timeline"
        title="Keep a date that changed your story."
        lede="Moments are shared with your active partner. Feature one when it belongs in the relationship thread on Home."
        back={<InlineLink href="/milestones"><ArrowLeft className="size-4" aria-hidden="true" />Back to moments</InlineLink>}
      />
      <section className="mt-9">
        <MilestoneForm previewSession={identity?.kind === "developer" ? (await readDeveloperState()).bucketSessionId : undefined} />
      </section>
      <aside className="mt-8 flex gap-3 rounded-panel border p-4 text-sm leading-6 text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p>Notifications use a generic “moment added” message. The private title and description are read only after the recipient passes couple membership checks.</p>
      </aside>
    </div>
  );
}
