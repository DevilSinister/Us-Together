import {z} from "zod";
import type {EntryAccess,EntryMedia} from "./types";
export type GalleryItem=EntryMedia & {access:EntryAccess;entryTitle:string;entryDate:string;sortKey:string};
export type GalleryPage={items:GalleryItem[];next:{date:string;key:string}|null;paired:boolean;previewEntries?:{access:EntryAccess;title:string;date:string}[];error?:string};
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
