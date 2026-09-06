import Link from "next/link";
import {SavedLocation} from "@/components/entries/location-field";
import {notFound} from "next/navigation";
import {z} from "zod";
import {planContext} from "@/lib/plans/data";
import {MediaCollection} from "@/components/entries/media-collection";
import {CommentThread} from "@/components/entries/comment-thread";
export default async function MomentPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const c=await planContext();if(!c.paired)notFound();
 let item:{title:string;description:string|null;date:string;location:string|null}|null=null;
 if(c.kind==="preview"){const m=c.state.milestones.find(x=>x.id===id);if(m)item={title:m.title,description:m.description,date:m.milestoneDate,location:m.location??null};}
 else {const {data,error}=await c.db.from("milestones").select("title,description,milestone_date,location").eq("id",id).maybeSingle();if(error)throw Error("Could not open this moment.");if(data)item={...data,date:data.milestone_date};}
 if(!item)notFound();const access={kind:"moment" as const,id,previewSession:c.kind==="preview"?c.state.bucketSessionId:undefined};
 return <div className="reveal-on-load"><Link href="/milestones" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Back to moments</Link><header className="mt-7 border-b pb-8"><time dateTime={item.date} className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("en",{dateStyle:"long",timeZone:"UTC"}).format(new Date(item.date+"T00:00:00Z"))}</time><h1 className="mt-3 break-words font-display text-5xl sm:text-6xl">{item.title}</h1>{item.location?<p className="mt-4 break-words text-muted-foreground"><SavedLocation value={item.location}/></p>:null}</header>{item.description?<p className="mt-8 max-w-prose whitespace-pre-wrap break-words text-lg leading-8">{item.description}</p>:null}<div className="mt-10"><MediaCollection access={access} entryTitle={item.title} entryDate={item.date} separated={!!item.description}/><CommentThread access={access}/></div></div>;
}
