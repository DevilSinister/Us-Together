import {describe,it,expect} from "vitest";
import {galleryFilter,groupGallery,type GalleryItem} from "./gallery";
const item=(kind:"memory"|"moment",id:string,date:string):GalleryItem=>({id,access:{kind,id},entryTitle:kind,entryDate:date,sortKey:kind+":"+id,caption:"",media_type:"image",mime_type:"image/png",state:"ready",size_bytes:2,duration_seconds:null});
describe("shared gallery",()=>{
 it("requires an explicit kind for entry scoping and validates the entry UUID",()=>{
 const entry="1f960474-a553-4e74-a2ca-712f748654bc";
 expect(galleryFilter.safeParse({entry}).success).toBe(false);
 expect(galleryFilter.safeParse({kind:"memory",entry}).success).toBe(true);
 expect(galleryFilter.safeParse({kind:"moment",entry}).success).toBe(true);
 expect(galleryFilter.safeParse({kind:"memory",entry:"foreign),id.gt.0"}).success).toBe(false);
 });
 it("groups separate memories and moments without merging titles or IDs",()=>{expect(groupGallery([item("memory","same","2026-01-01"),item("moment","same","2026-01-01")],"memory")).toHaveLength(2);});
 it("groups both kinds by original story date",()=>{const groups=groupGallery([item("memory","a","2026-01-01"),item("moment","b","2026-01-01"),item("memory","c","2025-12-01")],"date");expect(groups.map(g=>g.items.length)).toEqual([2,1]);});
 it("rejects malformed dates and cursor filter injection",()=>{expect(galleryFilter.safeParse({date:"2026-02-30"}).success).toBe(false);expect(galleryFilter.safeParse({cursor:{date:"2026-01-01",key:"memory:x),id.gt.0"}}).success).toBe(false);});
});
