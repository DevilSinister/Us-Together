import Link from "next/link";
import { ArrowUpRight, Brush } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { loadDrawings } from "@/lib/drawings/data";

export const metadata = { title: "Drawings" };
const mats = ["bg-[#f7e2e5] dark:bg-[#49323b]", "bg-[#e6f0ed] dark:bg-[#2e4141]", "bg-[#f6ecd3] dark:bg-[#49402d]"];
export default async function DrawingsPage({ searchParams }: { searchParams: Promise<{ after?: string }> }) {
  const { after } = await searchParams;
  const view = await loadDrawings(after);
  const format = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
  return <div className="reveal-on-load">
    <PageHeader eyebrow="Little things sent by hand" title="Drawings."
      lede="A place for the sketches you send each other."
      actions={view.paired ? <Button asChild className="gap-2"><Link href="/drawings/new"><Brush className="size-4" aria-hidden="true" />Make a drawing</Link></Button> : null} />
    {view.error ? <p role="alert" className="status-message status-error mt-8">{view.error}</p> : null}
    {!view.paired && !view.error ? <PairingNotice title="Drawings open with your shared space." /> : null}
    {view.paired && !view.error ? <section className="mt-9">
      {view.notes.length ? <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {view.notes.map((note, index) => <li key={note.id}><Link href={"/drawings/" + note.id}
          className={"group block rounded-[1.25rem] p-3 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none " + mats[index % mats.length]}>
          <div className="overflow-hidden rounded-[0.8rem] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={"/api/drawing-notes/" + note.id + "/image"} alt={"Drawing " + (note.mine ? "you sent" : "from your partner")}
              className="aspect-[4/3] w-full object-contain" />
          </div>
          <span className="flex items-center justify-between gap-2 px-1 pt-3 text-sm font-semibold text-foreground">
            <span>{note.mine ? "From you" : "From your partner"}</span><ArrowUpRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </span>
          <span className="block px-1 pt-1 text-xs text-muted-foreground">{note.sent_at ? format.format(new Date(note.sent_at)) : ""}</span>
        </Link></li>)}
      </ul> : <div className="max-w-xl rounded-[1.25rem] bg-[#f7e2e5] p-7 dark:bg-[#49323b]">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-white text-primary dark:bg-card"><Brush className="size-6" aria-hidden="true" /></div>
        <p className="font-display text-3xl">Your first page is waiting.</p>
        <p className="mt-2 text-muted-foreground">Draw a quick hello for your partner to find.</p>
        <Button asChild className="mt-5"><Link href="/drawings/new">Make the first drawing</Link></Button>
      </div>}
      {view.next ? <Link href={"/drawings?after=" + encodeURIComponent(view.next)} className="mt-6 inline-block text-sm font-semibold text-primary underline underline-offset-4">Older drawings</Link> : null}
    </section> : null}
  </div>;
}
