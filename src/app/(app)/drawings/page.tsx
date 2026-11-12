import Link from "next/link";
import { Brush } from "lucide-react";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import { EmptyState, PairingNotice } from "@/components/app/states";
import { DrawingWall } from "@/components/drawings/drawing-wall";
import { Button } from "@/components/ui/button";
import { loadDrawings } from "@/lib/drawings/data";
import { getViewerTimeZone } from "@/lib/time/viewer";

export const metadata = { title: "Drawings" };

/**
 * Drawings as a Cover screen. The drawings themselves are the pictures, so the
 * cover is a band; the sheet leads with a partner's newest drawing and Draw
 * back, then every drawing on its mat, newest first, with a link to older pages.
 */
export default async function DrawingsPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const timeZone = await getViewerTimeZone();
  const { after } = await searchParams;
  const view = await loadDrawings(after);
  const partner = view.partner ?? "your partner";

  return (
    <>
      <Cover
        labelledBy="drawings-title"
        height="band"
        action={view.paired ? <Button asChild><Link href="/drawings/new"><Brush className="size-4" aria-hidden="true" />Make a drawing</Link></Button> : null}
      >
        <h1 id="drawings-title" className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.02em]">Drawings</h1>
        <p className="mt-1.5 text-[0.9375rem] leading-6 text-muted-foreground">Little things, drawn by hand</p>
      </Cover>

      <CoverSheet>
        {view.error ? <p role="alert" className="status-message status-error">{view.error}</p> : null}
        {!view.paired && !view.error ? <PairingNotice className="mt-0" title="Drawings open with your shared space." /> : null}
        {view.paired && !view.error ? (
          view.notes.length ? (
            <>
              <DrawingWall notes={view.notes} partner={partner} timeZone={timeZone} newest={!after} />
              {view.next ? (
                <Link
                  href={"/drawings?after=" + encodeURIComponent(view.next)}
                  className="mt-4 inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Older drawings
                </Link>
              ) : null}
            </>
          ) : (
            <EmptyState
              className="mt-2"
              icon={Brush}
              title="Your first page is waiting."
              body={`Draw a quick hello for ${partner} to find.`}
              action={<Button asChild><Link href="/drawings/new">Make the first drawing</Link></Button>}
            />
          )
        ) : null}
      </CoverSheet>

      {view.paired ? <FloatingAction href="/drawings/new" label="Make a drawing" /> : null}
    </>
  );
}
