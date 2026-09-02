import {readDeveloperState} from "@/lib/auth/dev-session";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MemoryGallery } from "@/components/memories/gallery";
import { loadMemories } from "@/lib/memories/data";
export const metadata:Metadata={title:"Memories"};
export default async function MemoriesPage(){
 const data=await loadMemories({});
 return <div className="reveal-on-load"><header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-primary">The life you’re keeping</p><h1 className="mt-2 font-display text-5xl tracking-[-0.03em] sm:text-6xl">Memories, close to home.</h1><p className="mt-4 max-w-prose text-lg leading-8 text-muted-foreground">The stories, places, and little moments that made it yours.</p></div>{data.paired?<Button asChild><Link href="/memories/new">Add a memory</Link></Button>:null}</header>
 {data.paired?<MemoryGallery initial={data} previewSession={data.preview?(await readDeveloperState()).bucketSessionId:undefined}/>:<section className="mt-10 rounded-2xl bg-secondary p-6"><h2 className="font-display text-3xl">Memories live inside your shared space.</h2><p className="mt-3 leading-7 text-muted-foreground">Create your shared space to begin keeping memories.</p><Button asChild className="mt-5"><Link href="/pairing">Connect partner</Link></Button></section>}
 </div>;
}
