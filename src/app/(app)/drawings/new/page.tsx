import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PairingNotice } from "@/components/app/states";
import { DrawingEditor } from "@/components/drawings/drawing-editor";
import { loadDrawings } from "@/lib/drawings/data";

export const metadata = { title: "Make a drawing" };
export default async function NewDrawingPage() {
  const view = await loadDrawings();
  return <div className="mx-auto max-w-[46rem] pb-8 reveal-on-load">
    <Link href="/drawings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
      <ArrowLeft className="size-4" aria-hidden="true" />All drawings
    </Link>
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">Make something for them</p>
      <h1 className="mt-2 font-display text-4xl tracking-[-0.03em] sm:text-5xl">A little drawing.</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">A few lines are enough. It will arrive in your partner&apos;s drawings and on their widget.</p>
    </div>
    {view.paired ? <DrawingEditor /> : <div className="mt-8"><PairingNotice title="Drawings open with your shared space." /></div>}
  </div>;
}
