import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { loadDrawings } from "@/lib/drawings/data";

export const metadata = { title: "Drawings" };
export default async function DrawingsPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const view = await loadDrawings(after);
  const format = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
  return <div className="reveal-on-load">
    <PageHeader eyebrow="A little something from you" title="Drawn notes." lede="Make a note by hand and send it to your partner."
      actions={view.paired ? <Button asChild><Link href="/drawings/new">Draw a note</Link></Button> : null} />
    {view.error ? <p role="alert" className="status-message status-error mt-8">{view.error}</p> : null}
    {!view.paired && !view.error ? <PairingNotice title="Drawings open with your shared space." /> : null}
    {view.paired && !view.error ? <section className="mt-10">
      {view.notes.length ? <ul className="grid gap-5 sm:grid-cols-2">
        {view.notes.map((note) => <li key={note.id}><Link href={"/drawings/" + note.id}
          className="block overflow-hidden rounded-panel border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={"/api/drawing-notes/" + note.id + "/image"} alt={"Drawing " + (note.mine ? "you sent" : "from your partner")}
            className="aspect-[4/3] w-full bg-white object-contain" />
          <span className="block px-4 py-3 text-sm text-muted-foreground">{note.mine ? "You sent this" : "From your partner"} · {note.sent_at ? format.format(new Date(note.sent_at)) : ""}</span>
        </Link></li>)}
      </ul> : <div className="rounded-panel bg-secondary p-6">
        <p className="font-display text-2xl">The first page is blank.</p>
        <p className="mt-2 text-muted-foreground">Draw something small for your partner to find on their phone.</p>
        <Button asChild className="mt-5"><Link href="/drawings/new">Draw the first note</Link></Button>
      </div>}
      {view.next ? <Link href={"/drawings?after=" + encodeURIComponent(view.next)} className="mt-6 inline-block text-sm font-semibold text-primary underline underline-offset-4">Older drawings</Link> : null}
    </section> : null}
  </div>;
}
