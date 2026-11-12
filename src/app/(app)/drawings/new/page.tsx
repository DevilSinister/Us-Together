import { PairingNotice } from "@/components/app/states";
import { DrawingEditor, EditorBar } from "@/components/drawings/drawing-editor";
import { loadDrawingWorkspace } from "@/lib/drawings/data";

export const metadata = { title: "Make a drawing" };

/**
 * The editor brings its own top bar (close, who it is for, Send), so it marks
 * itself as a detail screen and the phone header steps aside, as it does for
 * a Cover detail page. On a phone it runs edge to edge; from tablet width it
 * is a centred column.
 */
export default async function NewDrawingPage() {
  const { state, partner } = await loadDrawingWorkspace();
  return <div data-cover-page="detail" className="-mx-5 -mt-8 pt-[env(safe-area-inset-top)] sm:-mx-8 md:mx-auto md:mt-0 md:max-w-[46rem] md:pt-0">
    {state === "unpaired"
      ? <>
          <EditorBar title="A drawing" close={{ href: "/drawings", label: "All drawings" }} />
          <div className="px-5 pt-4 sm:px-8 md:px-0"><PairingNotice title="Drawings open with your shared space." /></div>
        </>
      : <DrawingEditor partnerName={partner} canSend={state === "paired"} />}
  </div>;
}
