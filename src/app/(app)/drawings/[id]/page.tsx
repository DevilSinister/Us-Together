import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Brush, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineLink } from "@/components/ui/inline-link";
import { DrawingActions } from "@/components/drawings/drawing-actions";
import { loadDrawing } from "@/lib/drawings/data";
import { absoluteTime, relativeTime } from "@/lib/time/relative";

export const metadata = { title: "Drawing" };
export default async function DrawingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadDrawing(id);
  if (!note) notFound();
  const partner = note.partner ?? "your partner";
  return <div className="mx-auto max-w-[46rem] pb-8 reveal-on-load">
    <Link href="/drawings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"><ArrowLeft className="size-4" aria-hidden="true" />All drawings</Link>
    {sent === "1" && note.mine ? <p role="status" className="status-message status-success mt-3"><CircleCheck className="size-5 shrink-0" aria-hidden="true" />Sent to {partner}. It is on their drawings page and their widget.</p> : null}
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">{note.mine ? "Sent to " + partner : "From " + partner}</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.03em] sm:text-5xl">A little drawing.</h1></div>
      <Button asChild className="gap-2"><Link href="/drawings/new"><Brush className="size-4" aria-hidden="true" />{note.mine ? "Draw another" : "Draw back"}</Link></Button>
    </div>
    <div className="mt-7 rounded-[1.5rem] bg-[#f5dfe2] p-3 dark:bg-[#4b303a] sm:p-5">
      <div className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#713143] dark:text-[#f5c9d3]">{note.mine ? "For " + partner : "From " + partner}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={"/api/drawing-notes/" + id + "/image"} alt={"Hand-drawn note " + (note.mine ? "you sent to " + partner : "from " + partner)}
        className="aspect-[4/3] w-full rounded-[1rem] bg-white object-contain shadow-paper" />
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {note.sent_at ? <time dateTime={note.sent_at} title={absoluteTime(note.sent_at)}>{relativeTime(note.sent_at)} · {absoluteTime(note.sent_at)}</time> : null}
        {" · "}Finished drawings stay as sent.
      </p>
      <DrawingActions id={id} />
    </div>
    {note.newer || note.older ? <nav aria-label="Other drawings" className="mt-6 flex items-center justify-between gap-4 border-t pt-4">
      {note.newer ? <InlineLink href={"/drawings/" + note.newer}><ArrowLeft className="size-4" aria-hidden="true" />Newer</InlineLink> : <span />}
      {note.older ? <InlineLink href={"/drawings/" + note.older}>Older<ArrowRight className="size-4" aria-hidden="true" /></InlineLink> : <span />}
    </nav> : null}
  </div>;
}
