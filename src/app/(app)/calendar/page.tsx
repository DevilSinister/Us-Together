import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { SharedCalendar } from "@/components/entries/calendar";
import { loadSharedCalendar } from "@/app/actions/calendar";
import { planContext } from "@/lib/plans/data";
import { localDate } from "@/lib/plans/calendar";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const context = await planContext();
  const initial = await loadSharedCalendar({ date: localDate(new Date(), context.timezone) });

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="A date for every part of your story"
        title="Your shared calendar."
        lede="Plans ahead, memories kept, and moments worth marking, together in one place."
        actions={<Button asChild><Link href="/plans/new">New plan</Link></Button>}
      />
      {initial.paired ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-6">
            <InlineLink href="/memories/new">Add a memory</InlineLink>
            <InlineLink href="/milestones/new">Add a moment</InlineLink>
            <InlineLink href="/plans">Manage plans</InlineLink>
          </div>
          <SharedCalendar initial={initial} />
        </>
      ) : (
        <PairingNotice
          title="Your calendar opens with your shared space."
          body="Plans, memories, and moments are read inside one couple boundary, so the calendar waits for both accounts."
        />
      )}
    </div>
  );
}
