import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDrawing } from "@/lib/drawings/data";

export const metadata = { title: "Drawing" };
export default async function DrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadDrawing(id);
  if (!note) notFound();
  return <div className="mx-auto max-w-[46rem] pb-8 reveal-on-load">
    <Link href="/drawings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"><ArrowLeft className="size-4" aria-hidden="true" />All drawings</Link>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">{note.mine ? "Sent by you" : "Sent to you"}</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.03em] sm:text-5xl">A little drawing.</h1></div>
      <Button asChild variant="outline" className="gap-2"><Link href="/drawings/new"><Brush className="size-4" aria-hidden="true" />Draw another</Link></Button>
    </div>
    <div className="mt-7 rounded-[1.5rem] bg-[#f5dfe2] p-3 dark:bg-[#4b303a] sm:p-5">
      <div className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#713143] dark:text-[#f5c9d3]">{note.mine ? "For your partner" : "From your partner"}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={"/api/drawing-notes/" + id + "/image"} alt="Hand-drawn note"
        className="aspect-[4/3] w-full rounded-[1rem] bg-white object-contain shadow-paper" />
    </div>
    <p className="mt-4 text-sm text-muted-foreground">
      {note.sent_at ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(note.sent_at)) : ""}
      {" · "}Finished drawings stay as sent.
    </p>
  </div>;
}
