import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { CalendarWorkspace } from "@/components/plans/calendar-workspace";
import { loadPlans } from "@/lib/plans/data";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const page = await loadPlans({});

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="Shared time"
        title="Make time for us."
        lede="A quiet evening or a whole adventure. Keep the details together, then carry the experience into a memory."
        actions={page.paired ? <Button asChild><Link href="/plans/new">Plan something</Link></Button> : null}
      />
      {page.paired ? (
        <>
          <div className="mt-4">
            <InlineLink href="/calendar">Open calendar with memories and moments</InlineLink>
          </div>
          <CalendarWorkspace initial={page} />
        </>
      ) : (
        <PairingNotice
          title="Plans open with your shared space."
          body="Both accounts share one plan list, so planning waits until your partner is connected."
        />
      )}
    </div>
  );
}
