import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { InlineLink } from "@/components/ui/inline-link";
import { DrawingEditor } from "@/components/drawings/drawing-editor";
import { loadDrawings } from "@/lib/drawings/data";

export const metadata = { title: "Draw a note" };
export default async function NewDrawingPage() {
  const view = await loadDrawings();
  return <div className="mx-auto max-w-5xl reveal-on-load">
    <PageHeader scale="compact" eyebrow="Something from your hand" title="Draw a little note."
      lede="Make a mark, add color, then send your finished page."
      back={<InlineLink href="/drawings"><ArrowLeft className="size-4" aria-hidden="true" />Back to drawings</InlineLink>} />
    {view.paired ? <DrawingEditor /> : <PairingNotice title="Drawings open with your shared space." />}
  </div>;
}
