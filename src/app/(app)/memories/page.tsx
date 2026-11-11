import type { Metadata } from "next";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import type { CoverImage } from "@/components/app/cover-photo";
import { PairingNotice } from "@/components/app/states";
import { MemoryGallery } from "@/components/memories/gallery";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { loadMemories } from "@/lib/memories/data";

export const metadata: Metadata = { title: "Memories" };

/**
 * Memories as a Cover screen: the newest photographed memory on the cover, and
 * the list as month-grouped rows on the sheet beneath. The list query already
 * carries each memory's first ready photo, so the cover costs nothing extra.
 */
export default async function MemoriesPage() {
  const [data, identity] = await Promise.all([loadMemories({}), getCurrentIdentity()]);
  // The developer preview keeps its photos in the browser; the cover reads them there.
  const previewSession = identity?.kind === "developer" ? (await readDeveloperState()).bucketSessionId : undefined;
  const pictured = data.memories.find((memory) => memory.media[0]?.media_type === "image");
  const photo: CoverImage | null = pictured ? { id: pictured.media[0].id, kind: "memory", entryId: pictured.id } : null;
  const newest = data.memories[0];

  return (
    <>
      <Cover labelledBy="memories-title" photo={photo} previewSession={previewSession} previewEntry={newest ? { kind: "memory", id: newest.id } : null}>
        <h1 id="memories-title" className="font-display text-[2.75rem] leading-none tracking-[-0.02em]">Memories</h1>
        <p className="mt-2 text-[0.9375rem] text-muted-foreground">The stories and small moments that made it yours.</p>
      </Cover>

      <CoverSheet>
        {data.paired ? (
          <MemoryGallery initial={data} />
        ) : (
          <PairingNotice
            className="mt-0"
            title="Memories live inside your shared space."
            body="Create your shared space to begin keeping memories together."
          />
        )}
      </CoverSheet>

      {data.paired ? <FloatingAction href="/memories/new" label="Add a memory" /> : null}
    </>
  );
}
