"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {Film} from "lucide-react";
import {loadGallery} from "@/app/actions/gallery";
import {groupGallery,type GalleryPage,type GalleryItem} from "@/lib/entries/gallery";
import {previewMedia} from "@/lib/entries/preview-media";
import {MediaViewer,mediaSource} from "./media-viewer";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
export function GalleryWorkspace({initial,scope}:{initial:GalleryPage;scope?:{kind:"memory"|"moment";entry:string}}){
 const [items,setItems]=useState(initial.items),[next,setNext]=useState(initial.next),[error,setError]=useState(initial.error??""),[pending,setPending]=useState(false),[kind,setKind]=useState<string>(scope?.kind??"all"),[media,setMedia]=useState("all"),[date,setDate]=useState(""),[group,setGroup]=useState<"memory"|"date">("memory"),[selected,setSelected]=useState<string|null>(null);
 const urls=useRef<string[]>([]),generation=useRef(0),count=useRef(initial.items.length);
 useEffect(()=>{count.current=items.length;},[items.length]);
 const reload=useCallback(async()=>{const run=++generation.current;setPending(true);try{
 const loaded:GalleryItem[]=[];let cursor:GalleryPage["next"]=null;
 if(initial.previewEntries){for(const entry of initial.previewEntries){const files=await previewMedia(entry.access);loaded.push(...files.map(file=>({...file,access:entry.access,entryTitle:entry.title,entryDate:entry.date,sortKey:entry.access.kind+":"+file.id})));}loaded.sort((a,b)=>b.entryDate.localeCompare(a.entryDate)||a.sortKey.localeCompare(b.sortKey));}
 else {do{const p=await loadGallery({kind,entry:scope?.entry,media,date,cursor});if(p.error)throw Error(p.error);loaded.push(...p.items);cursor=p.next;}while(cursor&&loaded.length<count.current);}
 if(run!==generation.current){for(const m of loaded)for(const u of [m.url,m.previewUrl])if(u)URL.revokeObjectURL(u);return;}
 for(const u of urls.current)URL.revokeObjectURL(u);urls.current=loaded.flatMap(m=>[m.url,m.previewUrl].filter((u):u is string=>!!u));setItems(loaded);setNext(cursor);setError("");
 }catch(e){if(run===generation.current)setError(e instanceof Error?e.message:"Could not load gallery.");}finally{if(run===generation.current)setPending(false);}},[initial.previewEntries,kind,media,date,scope]);
 useEffect(()=>{const lifecycle=generation,t=setTimeout(()=>void reload(),0);return()=>{clearTimeout(t);lifecycle.current++;};},[reload]);
 useEffect(()=>()=>{for(const u of urls.current)URL.revokeObjectURL(u);},[]);
 const visible=items.filter(m=>(kind==="all"||m.access.kind===kind)&&(media==="all"||m.media_type===media)&&(!date||m.entryDate===date)),groups=groupGallery(visible,group),index=visible.findIndex(m=>m.sortKey===selected);
 async function more(){if(!next)return;setPending(true);try{const p=await loadGallery({kind,entry:scope?.entry,media,date,cursor:next});if(p.error)throw Error(p.error);setItems(old=>[...old,...p.items.filter(m=>!old.some(o=>o.sortKey===m.sortKey))]);setNext(p.next);setError("");}catch(e){setError(e instanceof Error?e.message:"Could not load more.");}finally{setPending(false);}}
 return <div><div className="mt-7 grid grid-cols-2 items-end gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-4 sm:p-5">
 <div className="min-w-0 space-y-2"><Label className="block" htmlFor="gallery-group">Group by</Label><select id="gallery-group" value={group} onChange={e=>setGroup(e.target.value as "memory"|"date")} className="min-h-11 w-full min-w-0 rounded-lg border bg-field px-3 text-sm"><option value="memory">Memory / moment</option><option value="date">Date</option></select></div>
 <div className="min-w-0 space-y-2"><Label className="block" htmlFor="gallery-kind">From</Label><select id="gallery-kind" disabled={pending||!!scope} value={kind} onChange={e=>{count.current=0;setKind(e.target.value);}} className="min-h-11 w-full min-w-0 rounded-lg border bg-field px-3 text-sm"><option value="all">All entries</option><option value="memory">Memories</option><option value="moment">Moments</option></select></div>
 <div className="min-w-0 space-y-2"><Label className="block" htmlFor="gallery-media">Show</Label><select id="gallery-media" disabled={pending} value={media} onChange={e=>{count.current=0;setMedia(e.target.value);}} className="min-h-11 w-full min-w-0 rounded-lg border bg-field px-3 text-sm"><option value="all">Photos + videos</option><option value="image">Photos</option><option value="video">Videos</option></select></div>
 <div className="min-w-0 space-y-2"><Label className="block" htmlFor="gallery-date">On date</Label><Input id="gallery-date" type="date" disabled={pending} value={date} onChange={e=>{count.current=0;setDate(e.target.value);}}/></div>{date?<Button variant="ghost" disabled={pending} onClick={()=>setDate("")}>Clear date</Button>:null}</div>
 {error?<div className="mt-5"><p role="alert" className="status-message status-error">{error}</p><Button variant="outline" onClick={()=>void reload()}>Try again</Button></div>:null}
 {pending?<p role="status" className="mt-5 text-sm text-muted-foreground">Loading your gallery…</p>:null}
 {!pending&&!error&&!visible.length?<section className="py-16"><h2 className="font-display text-3xl">Room for your favorite moments.</h2><p className="mt-3 text-muted-foreground">{kind!=="all"||media!=="all"||date?"No files match these filters. Try another date or show everything.":"Add photos or videos to a memory or moment and they will appear here."}</p><Button asChild variant="outline" className="mt-5"><Link href="/memories/new">Add a memory</Link></Button></section>:null}
 {groups.map(g=><section key={group==="date"?g.date:g.items[0].access.kind+g.items[0].access.id} className="mt-10"><div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="break-words font-display text-3xl">{group==="date"?new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"}).format(new Date(g.date+"T00:00:00Z")):g.title}</h2>{group==="memory"?<Link href={(g.items[0].access.kind==="memory"?"/memories/":"/milestones/")+g.items[0].access.id} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Open {g.items[0].access.kind}</Link>:null}</div>
 <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">{g.items.map(m=><figure key={m.sortKey} className="min-w-0"><button type="button" aria-label={"Open "+(m.media_type==="image"?"photo":"video")+" "+(visible.indexOf(m)+1)} onClick={()=>setSelected(m.sortKey)} className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{m.media_type==="image"?<Image src={mediaSource(m,"preview")} fill unoptimized sizes="(max-width:640px) 33vw, 17vw" loading="lazy" className="object-cover" alt={m.caption||m.entryTitle} referrerPolicy="no-referrer"/>:<span className="flex flex-col items-center gap-2 text-sm"><Film aria-hidden="true"/>Play video</span>}</button>{m.caption?<figcaption className="mt-2 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{m.caption}</figcaption>:null}</figure>)}</div></section>)}
 {next?<Button variant="outline" disabled={pending} onClick={()=>void more()} className="mt-8">Load more photos and videos</Button>:null}
 {index>=0?<MediaViewer items={visible} index={index} onIndex={i=>setSelected(visible[i].sortKey)} onClose={()=>setSelected(null)} onChange={reload}/>:null}
 </div>;
}
