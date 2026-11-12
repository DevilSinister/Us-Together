import {z} from "zod";
import type {EntryAccess,EntryMedia} from "./types";
export type GalleryItem=EntryMedia & {access:EntryAccess;entryTitle:string;entryDate:string;sortKey:string};
/** How many ready photos and videos the gallery (or one entry's gallery) holds in all, whatever is filtered or loaded. */
export type GalleryTotals={photos:number;videos:number};
export type GalleryPage={items:GalleryItem[];next:{date:string;key:string}|null;paired:boolean;totals?:GalleryTotals;previewEntries?:{access:EntryAccess;title:string;date:string}[];error?:string};
export const galleryFilter=z.object({
 kind:z.enum(["all","memory","moment"]).default("all"),
 entry:z.uuid().optional(),
 media:z.enum(["all","image","video"]).default("all"),
 date:z.union([z.iso.date(),z.literal("")]).default(""),
 cursor:z.object({date:z.iso.date(),key:z.string().regex(/^(memory|moment):[0-9a-f-]{36}$/)}).nullable().optional()
}).refine(f=>!f.entry||f.kind!=="all",{message:"Choose a memory or moment for this gallery.",path:["entry"]});
export function groupGallery(items:GalleryItem[],by:"memory"|"date"){
 const groups=new Map<string,{title:string;date:string;items:GalleryItem[]}>();
 for(const item of items){const key=by==="date"?item.entryDate:item.access.kind+":"+item.access.id;const group=groups.get(key)??{title:by==="date"?item.entryDate:item.entryTitle,date:item.entryDate,items:[]};group.items.push(item);groups.set(key,group);}
 return [...groups.values()];
}

const plural=(count:number,word:string)=>count.toLocaleString("en")+" "+word+(count===1?"":"s");

/** The gallery cover's one line: what has been kept, in the words a person would use. */
export function galleryTotalsLabel({photos,videos}:GalleryTotals){
 if(!photos&&!videos)return "Nothing kept here yet";
 if(!videos)return plural(photos,"photo");
 if(!photos)return plural(videos,"video");
 return (photos+videos).toLocaleString("en")+" photos and videos";
}

/** A group's size, named for what the media filter leaves in it. */
export function galleryCountLabel(count:number,media:string){
 return plural(count,media==="image"?"photo":media==="video"?"video":"file");
}

const dayFormat=new Intl.DateTimeFormat("en",{day:"numeric",month:"short",timeZone:"UTC"});
const dayYearFormat=new Intl.DateTimeFormat("en",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});

/** An entry's calendar day, with the year only when it is not this one. */
export function galleryDayLabel(date:string,thisYear:number){
 const day=new Date(date+"T00:00:00Z");
 return (day.getUTCFullYear()===thisYear?dayFormat:dayYearFormat).format(day);
}

/**
 * Whether every file of a group has been loaded. The gallery pages by date, so
 * while more pages wait, a group on the oldest loaded date may still be missing
 * files and must not state a count.
 */
export function galleryGroupComplete(groupDate:string,items:GalleryItem[],more:boolean){
 const oldest=items.at(-1)?.entryDate;
 return !more||!oldest||groupDate>oldest;
}
