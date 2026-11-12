import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { loadPlanList } from "@/lib/plans/data";
import { dateTile, planLine, whenNext } from "@/lib/plans/list";
import type { Plan } from "@/lib/plans/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plans" };

const spoken = (day: string) => new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));

/**
 * Plans as a Cover screen (ADR-053). The band says how many are coming up and
 * how many were kept. The next plan leads as a raised card that says how far
 * off it is; the rest coming up are ruled rows with a date tile; plans whose
 * days have all passed without being marked ask "Did these happen?"; kept plans
 * follow, each linking to the memory it became when there is one. Cancelled
 * plans stay out of the way behind one link. Months and weeks live on the
 * shared Calendar, which shows memories and moments beside plans.
 */
export default async function PlansPage({ searchParams }: { searchParams: Promise<{ show?: string; kept?: string }> }) {
  const params = await searchParams;
  const showCancelled = params.show === "cancelled", everyKept = params.kept === "all";
  const list = await loadPlanList({ showCancelled, allKept: everyKept });
  const { timezone } = list;
  const [next, ...later] = list.upcoming;
  const coming = list.upcoming.length + (list.upcomingMore ? "+" : "");
  const line = list.upcoming.length || list.keptCount || list.unmarked.length
    ? [list.upcoming.length ? `${coming} coming up` : "Nothing coming up", list.keptCount ? `${list.keptCount.toLocaleString("en")} kept` : null].filter(Boolean).join(" · ")
    : "A quiet evening or a whole adventure";
  const add = <Button asChild><Link href="/plans/new"><Plus className="size-4" aria-hidden="true" />New plan</Link></Button>;
  const keep = (extra: Record<string, string>) => {
    const query = new URLSearchParams({ ...(showCancelled ? { show: "cancelled" } : {}), ...(everyKept ? { kept: "all" } : {}), ...extra });
    for (const [key, value] of [...query]) if (!value) query.delete(key);
    return "/plans" + (query.size ? "?" + query : "");
  };

  return (
    <>
      <Cover labelledBy="plans-title" height="band" action={list.paired ? add : null}>
        <h1 id="plans-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">Plans</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">{list.paired ? line : "Time you are making for each other"}</p>
      </Cover>

      <CoverSheet>
        {!list.paired ? (
          <PairingNotice
            className="mt-0"
            title="Plans open with your shared space."
            body="Both accounts share one plan list, so planning waits until your partner is connected."
          />
        ) : (
          <div className="flex max-w-2xl flex-col gap-7">
            {next ? (
              <Link
                href={"/plans/" + next.id}
                className="group flex items-center gap-3.5 rounded-panel bg-secondary p-3.5 transition-colors duration-150 hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <DateTile instant={next.starts_at} timezone={timezone} large />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[0.8125rem] font-semibold leading-5 text-primary">Next · {whenNext(next, timezone)}</span>
                  <span className="break-words text-lg font-semibold leading-[1.3]">{next.title}</span>
                  <span className="text-sm leading-5 text-secondary-foreground">
                    <span className="sr-only">{spoken(dateTile(next.starts_at, timezone).date)}, </span>{planLine(next, timezone)}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            ) : (
              <EmptyState
                className="mt-0"
                icon={CalendarDays}
                title="A little room for something good."
                body={list.keptCount ? "Nothing is planned yet. The next one can be small." : "A quiet evening or a whole adventure. Keep the details together, then carry it into a memory."}
                action={<Button asChild><Link href="/plans/new">Plan something</Link></Button>}
              />
            )}

            {later.length ? (
              <PlanSection title="Coming up">
                {later.map(plan => <PlanRow key={plan.id} href={"/plans/" + plan.id} plan={plan} timezone={timezone} kicker={planLine(plan, timezone)} />)}
                {list.upcomingMore ? <li className="pt-3 text-[0.8125rem] leading-5 text-muted-foreground">Later plans are on the <Link href="/calendar" className="text-primary underline-offset-4 hover:underline">calendar</Link>.</li> : null}
              </PlanSection>
            ) : null}

            {list.unmarked.length ? (
              <PlanSection title="Did these happen?" id="plans-unmarked">
                {list.unmarked.map(plan => <PlanRow key={plan.id} href={"/plans/" + plan.id} plan={plan} timezone={timezone} muted kicker={"Not marked yet · " + planLine(plan, timezone, false)} />)}
              </PlanSection>
            ) : null}

            {list.kept.length ? (
              <PlanSection title="Kept">
                {list.kept.map(plan => (
                  <PlanRow
                    key={plan.id}
                    href={plan.memoryId ? "/memories/" + plan.memoryId : "/plans/" + plan.id}
                    plan={plan}
                    timezone={timezone}
                    muted
                    kicker={plan.memoryId ? "Became a memory" : "No memory yet · " + planLine(plan, timezone, false)}
                  />
                ))}
                {list.keptCount > list.kept.length ? (
                  <li className="pt-3"><Link href={keep({ kept: "all" })} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">Show all {list.keptCount.toLocaleString("en")} kept plans</Link></li>
                ) : null}
              </PlanSection>
            ) : null}

            {showCancelled && list.cancelled.length ? (
              <PlanSection title="Cancelled">
                {list.cancelled.map(plan => <PlanRow key={plan.id} href={"/plans/" + plan.id} plan={plan} timezone={timezone} muted kicker={"Cancelled · " + planLine(plan, timezone, false)} />)}
              </PlanSection>
            ) : null}

            {list.cancelledCount ? (
              <Link
                href={showCancelled ? keep({ show: "" }) : keep({ show: "cancelled" })}
                className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {showCancelled ? "Hide cancelled plans" : `${list.cancelledCount.toLocaleString("en")} cancelled ${list.cancelledCount === 1 ? "plan" : "plans"}`}
              </Link>
            ) : null}
          </div>
        )}
      </CoverSheet>

      {list.paired ? <FloatingAction href="/plans/new" label="New plan" /> : null}
    </>
  );
}

function PlanSection({ title, id = "plans-" + title.toLowerCase(), children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <h2 id={id} className="font-display text-[1.375rem] leading-[1.3]">{title}</h2>
      <ul className="mt-1 flex flex-col">{children}</ul>
    </section>
  );
}

function PlanRow({ href, plan, timezone, kicker, muted = false }: { href: string; plan: Plan; timezone: string; kicker: string; muted?: boolean }) {
  return (
    <li className="border-b border-border last:border-0">
      <Link href={href} className="group flex min-h-[4.25rem] items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <DateTile instant={plan.starts_at} timezone={timezone} muted={muted} />
        <span className="flex min-w-0 flex-1 flex-col-reverse gap-px">
          <span className="break-words text-[1.0625rem] font-semibold leading-[1.35] transition-colors duration-150 group-hover:text-primary motion-reduce:transition-none">{plan.title}</span>
          <span className="text-[0.8125rem] leading-5 text-muted-foreground">
            <span className="sr-only">{spoken(dateTile(plan.starts_at, timezone).date)}, </span>{kicker}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** "NOV" over "14": the day a plan starts, in the couple's zone. A kept plan's tile is quieter. */
function DateTile({ instant, timezone, muted = false, large = false }: { instant: string; timezone: string; muted?: boolean; large?: boolean }) {
  const tile = dateTile(instant, timezone);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-control text-[0.6875rem] font-bold leading-[1.1] tracking-[0.06em] text-muted-foreground",
        large ? "h-16 w-14 bg-background" : "size-11 bg-secondary",
      )}
    >
      {tile.month}
      <span className={cn("font-display font-normal leading-none tracking-normal", large ? "text-[1.75rem]" : "text-[1.1875rem]", muted ? "text-muted-foreground" : "text-foreground")}>{tile.day}</span>
    </span>
  );
}
