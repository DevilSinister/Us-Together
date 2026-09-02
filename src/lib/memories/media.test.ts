import { describe,it,expect } from "vitest";
import { Image } from "imagescript";
import { inspectMedia, validateUpload, videoLimit } from "./media";
import { galleryFilter, tagInput, editMemorySchema } from "./schema";
const box=(name:string,bytes:Buffer)=>{const head=Buffer.alloc(8);head.writeUInt32BE(bytes.length+8);head.write(name,4);return Buffer.concat([head,bytes]);};
function mp4(duration=3,width=320,height=240){
 const mvhd=Buffer.alloc(100);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(duration*1000,16);
 const tkhd=Buffer.alloc(84);tkhd.writeUInt32BE(width*65536,76);tkhd.writeUInt32BE(height*65536,80);
 return Buffer.concat([box("ftyp",Buffer.from("isom0000isom")),box("moov",Buffer.concat([box("mvhd",mvhd),box("trak",box("tkhd",tkhd))])),box("mdat",Buffer.from([1,2,3]))]);
}
describe("private memory media",()=>{
 it("decodes valid PNG/JPEG dimensions before processing",async()=>{
  const image=new Image(320,240);image.fill(0x883344ff);
  for(const [mime,bytes] of [["image/png",await image.encode()],["image/jpeg",await image.encodeJPEG(80)]] as const){
   expect(inspectMedia(bytes,mime)).toEqual({width:320,height:240,duration:null});
  }
 });
 it("rejects MIME disguises, truncated images, and pixel bombs",async()=>{
  expect(()=>inspectMedia(new TextEncoder().encode("<script>alert(1)</script>"),"image/png")).toThrow();
  const image=new Image(2,2),png=await image.encode();new DataView(png.buffer,png.byteOffset).setUint32(16,99999);
  expect(()=>inspectMedia(png,"image/png")).toThrow(/megapixels/);
  expect(()=>inspectMedia(new Uint8Array([255,216,255]),"image/jpeg")).toThrow();
 });
 it("matches extensions and enforces upload limits",()=>{
  expect(()=>validateUpload("x.svg","image/jpeg",100)).toThrow();
  expect(()=>validateUpload("x.mp4","video/mp4",videoLimit+1)).toThrow();
  expect(()=>validateUpload("x.PNG","image/png",200)).not.toThrow();
  expect(()=>validateUpload("x.png","image/png",0)).toThrow();
 });
 it("reads bounded MP4 dimensions/duration and rejects broken containers",()=>{
  expect(inspectMedia(mp4(),"video/mp4")).toEqual({width:320,height:240,duration:3});
  expect(()=>inspectMedia(mp4(301),"video/mp4")).toThrow(/five minutes/);
  expect(()=>inspectMedia(mp4().subarray(0,30),"video/mp4")).toThrow();
  expect(()=>inspectMedia(mp4(3,5000,5000),"video/mp4")).toThrow(/4K/);
  expect(()=>inspectMedia(mp4(0),"video/mp4")).toThrow();
 });
 it("rejects WebM without valid duration/tracks",()=>{
  expect(()=>inspectMedia(new Uint8Array([26,69,223,163,128,0,0,0,0,0,0,0,0,0,0,0]),"video/webm")).toThrow();
 });
 it("discards obsolete manual coordinates",()=>{
  const base={id:crypto.randomUUID(),version:1,title:"Kept",memoryDate:"2026-08-20",rating:"",tags:""};
  expect(editMemorySchema.safeParse({...base,latitude:"24.86",longitude:""}).success).toBe(true);
  expect(editMemorySchema.parse({...base,latitude:"91",longitude:"67"})).not.toHaveProperty("latitude");
  expect(editMemorySchema.parse({...base,latitude:"0",longitude:"0"})).not.toHaveProperty("longitude");
 });
 it("normalizes tags and validates calendar dates and cursors",()=>{
  expect(tagInput.parse("Travel, travel, Little moments")).toEqual(["travel","little moments"]);
  expect(tagInput.safeParse(Array.from({length:9},(_,i)=>"tag"+i).join(",")).success).toBe(false);
  expect(galleryFilter.safeParse({cursor:{date:"2026-02-30",id:crypto.randomUUID()}}).success).toBe(false);
  expect(editMemorySchema.safeParse({id:crypto.randomUUID(),version:1,title:"Kept",memoryDate:"2026-02-30",rating:"",tags:""}).success).toBe(false);
 });
});
