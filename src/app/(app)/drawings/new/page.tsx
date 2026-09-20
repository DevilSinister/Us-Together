import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PairingNotice } from "@/components/app/states";
import { DrawingEditor } from "@/components/drawings/drawing-editor";
import { loadDrawingWorkspace } from "@/lib/drawings/data";

export const metadata = { title: "Make a drawing" };
export default async function NewDrawingPage() {
  const { state, partner } = await loadDrawingWorkspace();
  const name = partner ?? "your partner";
  return <div className="mx-auto max-w-[46rem] pb-8 reveal-on-load">
    <Link href="/drawings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
      <ArrowLeft className="size-4" aria-hidden="true" />All drawings
    </Link>
    <div className="mt-2 sm:mt-3">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">Make something for {name}</p>
      <h1 className="mt-1 font-display text-3xl tracking-[-0.03em] sm:mt-2 sm:text-5xl">A little drawing.</h1>
      <p className="mt-3 hidden text-sm leading-6 text-muted-foreground sm:block sm:text-base">A few lines are enough. It will arrive in {name}&apos;s drawings and on their widget.</p>
    </div>
    {state === "unpaired"
      ? <div className="mt-8"><PairingNotice title="Drawings open with your shared space." /></div>
      : <DrawingEditor partnerName={partner} canSend={state === "paired"} />}
  </div>;
}
