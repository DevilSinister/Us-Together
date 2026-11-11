import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Cover, CoverSheet, FloatingAction } from "@/components/app/cover";
import type { CoverImage } from "@/components/app/cover-photo";
import { PairingNotice } from "@/components/app/states";
import { MemoryGallery } from "@/components/memories/gallery";
import { getCurrentIdentity } from "@/lib/auth/current-user";
import { readDeveloperState } from "@/lib/auth/dev-session";
import { countMemories, loadMemories } from "@/lib/memories/data";

export const metadata: Metadata = { title: "Memories" };

/**
 * Memories as a Cover screen: the newest photographed memory on the cover, and
 * the list as month-grouped rows on the sheet beneath. The list query already
 * carries each memory's first ready photo, so the cover costs nothing extra.
 */
export default async function MemoriesPage() {
  const [data, kept, identity] = await Promise.all([loadMemories({}), countMemories(), getCurrentIdentity()]);
  // The developer preview keeps its photos in the browser; the cover reads them there.
  const previewSession = identity?.kind === "developer" ? (await readDeveloperState()).bucketSessionId : undefined;
  const pictured = data.memories.find((memory) => memory.media[0]?.media_type === "image");
  const photo: CoverImage | null = pictured ? { id: pictured.media[0].id, kind: "memory", entryId: pictured.id } : null;
  const newest = data.memories[0];
  const summary = !newest
    ? "Nothing kept yet."
    : [kept === null ? null : `${kept.toLocaleString("en")} kept`, `the latest was ${newest.title}`].filter(Boolean).join(" · ");

  return (
    <>
      <Cover
        labelledBy="memories-title"
        photo={photo}
        previewSession={previewSession}
        previewEntry={newest ? { kind: "memory", id: newest.id } : null}
        action={data.paired ? <Button asChild><Link href="/memories/new"><Plus className="size-4" aria-hidden="true" />Add a memory</Link></Button> : null}
      >
        <h1 id="memories-title" className="font-display text-[2.75rem] leading-none tracking-[-0.02em]">Memories</h1>
        {data.paired ? <p className="mt-2 line-clamp-2 text-[0.9375rem] text-muted-foreground first-letter:uppercase">{summary}</p> : null}
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
