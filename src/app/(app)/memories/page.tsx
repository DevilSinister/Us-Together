import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { PairingNotice } from "@/components/app/states";
import { MemoryGallery } from "@/components/memories/gallery";
import { loadMemories } from "@/lib/memories/data";

export const metadata: Metadata = { title: "Memories" };

export default async function MemoriesPage() {
  const data = await loadMemories({});

  return (
    <div className="reveal-on-load">
      <PageHeader
        eyebrow="The life you’re keeping"
        title="Memories, close to home."
        lede="The stories, places, and little moments that made it yours."
        actions={data.paired ? <Button asChild><Link href="/memories/new">Add a memory</Link></Button> : null}
      />
      {data.paired ? (
        <MemoryGallery initial={data} />
      ) : (
        <PairingNotice
          title="Memories live inside your shared space."
          body="Create your shared space to begin keeping memories together."
        />
      )}
    </div>
  );
}
