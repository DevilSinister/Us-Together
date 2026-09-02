import Link from "next/link";
import {notFound} from "next/navigation";
import {loadGallery} from "@/app/actions/gallery";
import {galleryFilter} from "@/lib/entries/gallery";
import {GalleryWorkspace} from "@/components/entries/gallery-workspace";
import {Button} from "@/components/ui/button";
export default async function GalleryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,parsed=galleryFilter.safeParse({kind:query.kind,entry:query.entry});
 if(!parsed.success)notFound();
 const f=parsed.data,scope=f.entry&&f.kind!=="all"?{kind:f.kind,entry:f.entry}:undefined;
 const data=await loadGallery(f);
 return <div className="reveal-on-load"><header className="border-b pb-7"><div className="flex flex-wrap gap-5"><Link href={scope?(scope.kind==="memory"?"/memories/":"/milestones/")+scope.entry:"/home"} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">{scope?"Back to "+scope.kind:"Back to Home"}</Link>{scope?<Link href="/gallery" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">View all gallery</Link>:null}</div><h1 className="mt-3 font-display text-5xl tracking-[-0.03em] sm:text-6xl">{scope?scope.kind==="memory"?"Memory gallery.":"Moment gallery.":"Your shared gallery."}</h1><p className="mt-4 max-w-prose leading-7 text-muted-foreground">{scope?"Every photo and video from this "+scope.kind+".":"Photos, videos and the little things you kept."}</p></header>{data.paired||data.error?<GalleryWorkspace key={scope?.entry??"all"} initial={data} scope={scope}/>:<section className="mt-8"><h2 className="font-display text-3xl">Your gallery opens with your shared space.</h2><Button asChild className="mt-5"><Link href="/pairing">Connect partner</Link></Button></section>}</div>;
}
