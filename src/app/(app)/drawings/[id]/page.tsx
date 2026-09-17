import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { InlineLink } from "@/components/ui/inline-link";
import { ArrowLeft } from "lucide-react";
import { loadDrawing } from "@/lib/drawings/data";

export const metadata = { title: "Drawing note" };
export default async function DrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadDrawing(id);
  if (!note) notFound();
  return <div className="mx-auto max-w-3xl reveal-on-load">
    <PageHeader scale="compact" eyebrow={note.mine ? "You sent this" : "From your partner"}
      title="A note in your own hand."
      back={<InlineLink href="/drawings"><ArrowLeft className="size-4" aria-hidden="true" />Back to drawings</InlineLink>}
      actions={<Link href="/drawings/new" className="text-sm font-semibold text-primary underline underline-offset-4">Draw another</Link>} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={"/api/drawing-notes/" + id + "/image"} alt="Hand-drawn note"
      className="mt-8 aspect-[4/3] w-full rounded-panel border border-border bg-white object-contain" />
    <p className="mt-4 text-sm text-muted-foreground">
      {note.sent_at ? new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(note.sent_at)) : ""}
      {" · "}Finished notes stay as sent. <Link href="/drawings/new" className="underline">Send another</Link> to add a thought.
    </p>
  </div>;
}
