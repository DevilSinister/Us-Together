import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      {/* Compact, and no lede: on a phone the display scale plus a lede plus
          four links filled the first screen before a single date was visible.
          The creation links now live in the selected day's foot, where they can
          act on the chosen date. */}
      <PageHeader
        scale="compact"
        eyebrow="Plans, memories, and moments"
        title="Your shared calendar."
        actions={<Button asChild><Link href="/plans/new">New plan</Link></Button>}
      />
      {initial.paired ? (
        <SharedCalendar initial={initial} />
      ) : (
        <PairingNotice
          title="Your calendar opens with your shared space."
          body="Plans, memories, and moments are read inside one couple boundary, so the calendar waits for both accounts."
        />
      )}
    </div>
  );
}
