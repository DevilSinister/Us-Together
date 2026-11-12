import { Cover, CoverSheet } from "@/components/app/cover";
import { PairingNotice } from "@/components/app/states";
import { SharedCalendar } from "@/components/entries/calendar";
import { loadSharedCalendar } from "@/app/actions/calendar";
import { planContext } from "@/lib/plans/data";
import { localDate } from "@/lib/plans/calendar";
import { monthParam } from "@/lib/entries/calendar";

export const metadata = { title: "Calendar" };

/**
 * The shared calendar, one month per address (`?month=YYYY-MM`). Today is read
 * in the couple's zone on the server and handed down, so the first paint and
 * the hydrated page agree on which day is today.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const { month: requested } = await searchParams;
  const context = await planContext();
  const today = localDate(new Date(), context.timezone);
  const month = monthParam(requested) ?? today.slice(0, 7);
  const initial = await loadSharedCalendar({ date: month === today.slice(0, 7) ? today : month + "-01" });

  if (!initial.paired) return <>
    <Cover labelledBy="calendar-title" height="band">
      <h1 id="calendar-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">Calendar</h1>
      <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Plans, memories and moments on one month</p>
    </Cover>
    <CoverSheet>
      <PairingNotice
        className="mt-0"
        title="Your calendar opens with your shared space."
        body="Plans, memories, and moments are read inside one couple boundary, so the calendar waits for both accounts."
      />
    </CoverSheet>
  </>;

  return <SharedCalendar key={initial.date} initial={initial} today={today} />;
}
