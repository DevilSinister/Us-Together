import {describe,it,expect} from "vitest";
import {galleryCountLabel,galleryDayLabel,galleryFilter,galleryGroupComplete,galleryTotalsLabel,groupGallery,type GalleryItem} from "./gallery";
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
 it("states what is kept in a person's words, singular and plural",()=>{
 expect(galleryTotalsLabel({photos:0,videos:0})).toBe("Nothing kept here yet");
 expect(galleryTotalsLabel({photos:1,videos:0})).toBe("1 photo");
 expect(galleryTotalsLabel({photos:12,videos:0})).toBe("12 photos");
 expect(galleryTotalsLabel({photos:0,videos:1})).toBe("1 video");
 expect(galleryTotalsLabel({photos:1126,videos:2})).toBe("1,128 photos and videos");
 });
 it("names a group's size for what the media filter leaves in it",()=>{
 expect(galleryCountLabel(1,"all")).toBe("1 file");
 expect(galleryCountLabel(12,"all")).toBe("12 files");
 expect(galleryCountLabel(5,"image")).toBe("5 photos");
 expect(galleryCountLabel(1,"video")).toBe("1 video");
 });
 it("shows the year only for another year, on the entry's own calendar day",()=>{
 expect(galleryDayLabel("2026-11-02",2026)).toBe("Nov 2");
 expect(galleryDayLabel("2025-03-02",2026)).toBe("Mar 2, 2025");
 expect(galleryDayLabel("2026-01-01",2026)).toBe("Jan 1");
 });
 it("withholds a count from a group that later pages may still add to",()=>{
 const loaded=[item("memory","a","2026-03-01"),item("memory","b","2026-02-01")];
 expect(galleryGroupComplete("2026-03-01",loaded,true)).toBe(true);
 expect(galleryGroupComplete("2026-02-01",loaded,true)).toBe(false);
 expect(galleryGroupComplete("2026-02-01",loaded,false)).toBe(true);
 expect(galleryGroupComplete("2026-02-01",[],true)).toBe(true);
 });
 it("rejects malformed dates and cursor filter injection",()=>{expect(galleryFilter.safeParse({date:"2026-02-30"}).success).toBe(false);expect(galleryFilter.safeParse({cursor:{date:"2026-01-01",key:"memory:x),id.gt.0"}}).success).toBe(false);});
});
