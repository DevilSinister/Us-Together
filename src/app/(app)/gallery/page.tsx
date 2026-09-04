import { notFound } from "next/navigation";
import { loadGallery } from "@/app/actions/gallery";
import { galleryFilter } from "@/lib/entries/gallery";
import { GalleryWorkspace } from "@/components/entries/gallery-workspace";
import { InlineLink } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";

export const metadata = { title: "Gallery" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const parsed = galleryFilter.safeParse({ kind: query.kind, entry: query.entry });
  if (!parsed.success) notFound();

  const filter = parsed.data;
  const scope = filter.entry && filter.kind !== "all" ? { kind: filter.kind, entry: filter.entry } : undefined;
  const data = await loadGallery(filter);
  const scopeLabel = scope?.kind === "memory" ? "memory" : "moment";

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow={scope ? undefined : "Everything you kept"}
        title={scope ? `${scopeLabel === "memory" ? "Memory" : "Moment"} gallery.` : "Your shared gallery."}
        lede={scope ? `Every photo and video from this ${scopeLabel}.` : "Photos, videos and the little things you kept."}
        back={
          <>
            <InlineLink href={scope ? `${scope.kind === "memory" ? "/memories/" : "/milestones/"}${scope.entry}` : "/home"}>
              {scope ? `Back to ${scopeLabel}` : "Back to Home"}
            </InlineLink>
            {scope ? <InlineLink href="/gallery">View all gallery</InlineLink> : null}
          </>
        }
      />
      {data.paired || data.error ? (
        <GalleryWorkspace key={scope?.entry ?? "all"} initial={data} scope={scope} />
      ) : (
        <PairingNotice
          title="Your gallery opens with your shared space."
          body="Photos and videos stay inside one couple boundary, so the gallery waits for both accounts."
        />
      )}
    </div>
  );
}
