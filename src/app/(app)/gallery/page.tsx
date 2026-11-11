import { notFound } from "next/navigation";
import { loadGallery } from "@/app/actions/gallery";
import { galleryFilter } from "@/lib/entries/gallery";
import { GalleryCover, GalleryWorkspace } from "@/components/entries/gallery-workspace";
import { CoverSheet } from "@/components/app/cover";
import { PairingNotice } from "@/components/app/states";

export const metadata = { title: "Gallery" };

/**
 * The gallery as a Cover screen. Its cover is a band rather than a photograph,
 * because the sheet beneath is nothing but photographs. With `kind` and `entry`
 * in the address it is one memory's or one moment's gallery instead, named for
 * that entry and leading back to it.
 */
export default async function GalleryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const parsed = galleryFilter.safeParse({ kind: query.kind, entry: query.entry });
  if (!parsed.success) notFound();

  const filter = parsed.data;
  const scope = filter.entry && filter.kind !== "all" ? { kind: filter.kind, entry: filter.entry } : undefined;
  const data = await loadGallery(filter);

  if (data.paired || data.error) return <GalleryWorkspace key={scope?.entry ?? "all"} initial={data} scope={scope} />;

  return (
    <>
      <GalleryCover scope={scope} line="" />
      <CoverSheet>
        <PairingNotice
          className="mt-0"
          title="Your gallery opens with your shared space."
          body="Photos and videos stay inside one couple boundary, so the gallery waits for both accounts."
        />
      </CoverSheet>
    </>
  );
}
