import { describe,it,expect } from "vitest";
import { Image } from "imagescript";
import { imageLimit, inspectMedia, resolveMime, validateUpload, videoLimit } from "./media";
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
  expect(()=>validateUpload("x.jpg","image/jpeg",imageLimit+1)).toThrow(/15 MB/);
  for(const [name,mime] of [["a.webp","image/webp"],["a.gif","image/gif"],["a.avif","image/avif"],["IMG.HEIC","image/heic"],["clip.MOV","video/quicktime"],["clip.m4v","video/mp4"]] as const)
   expect(()=>validateUpload(name,mime,2000)).not.toThrow();
 });
 it("resolves the upload type when the browser reports nothing useful",()=>{
  expect(resolveMime("IMG_4021.HEIC","")).toBe("image/heic");
  expect(resolveMime("clip.MOV","")).toBe("video/quicktime");
  expect(resolveMime("holiday.jpeg","image/jpg")).toBe("image/jpeg");
  expect(resolveMime("shot.png","image/png; charset=binary")).toBe("image/png");
  expect(resolveMime("notes.txt","text/plain")).toBe("text/plain");
 });
 it("accepts a JPEG carrying data after its end-of-image marker",async()=>{
  // Phones append motion-photo payloads and extra thumbnails after the marker.
  // Requiring it to be the final two bytes refused ordinary camera photos.
  const image=new Image(320,240);image.fill(0x883344ff);
  const jpeg=await image.encodeJPEG(80);
  const appended=new Uint8Array(jpeg.length+4096);
  appended.set(jpeg,0);appended.fill(0x42,jpeg.length);
  expect(inspectMedia(appended,"image/jpeg")).toEqual({width:320,height:240,duration:null});
  expect(()=>inspectMedia(jpeg.subarray(0,jpeg.length-40),"image/jpeg")).toThrow(/complete JPEG/);
 });
 it("reads WebP, GIF and ISO-container photo dimensions",()=>{
  const riff=(chunk:string,payload:Buffer)=>{const head=Buffer.alloc(12);head.write("RIFF",0);head.writeUInt32LE(payload.length+12,4);head.write("WEBP",8);const ch=Buffer.alloc(8);ch.write(chunk,0);ch.writeUInt32LE(payload.length,4);return Buffer.concat([head,ch,payload]);};
  const lossy=Buffer.alloc(20);lossy[3]=0x9d;lossy[4]=0x01;lossy[5]=0x2a;lossy.writeUInt16LE(320,6);lossy.writeUInt16LE(240,8);
  expect(inspectMedia(riff("VP8 ",lossy),"image/webp")).toEqual({width:320,height:240,duration:null});
  const extended=Buffer.alloc(20);extended.writeUIntLE(319,4,3);extended.writeUIntLE(239,7,3);
  expect(inspectMedia(riff("VP8X",extended),"image/webp")).toEqual({width:320,height:240,duration:null});
  const gif=Buffer.alloc(20);gif.write("GIF89a",0);gif.writeUInt16LE(320,6);gif.writeUInt16LE(240,8);
  expect(inspectMedia(gif,"image/gif")).toEqual({width:320,height:240,duration:null});
  const ispe=Buffer.alloc(12);ispe.writeUInt32BE(320,4);ispe.writeUInt32BE(240,8);
  const heic=Buffer.concat([box("ftyp",Buffer.from("heic0000heic")),box("meta",Buffer.concat([Buffer.alloc(4),box("iprp",box("ipco",box("ispe",ispe)))]))]);
  expect(inspectMedia(heic,"image/heic")).toEqual({width:320,height:240,duration:null});
  expect(()=>inspectMedia(Buffer.concat([box("ftyp",Buffer.from("heic0000heic"))]),"image/heic")).toThrow();
 });
 it("reads bounded MP4 dimensions/duration and rejects broken containers",()=>{
  expect(inspectMedia(mp4(),"video/mp4")).toEqual({width:320,height:240,duration:3});
  expect(inspectMedia(mp4(),"video/quicktime")).toEqual({width:320,height:240,duration:3});
  // A short tail that cannot hold another box is padding, not corruption.
  expect(inspectMedia(Buffer.concat([mp4(),Buffer.alloc(5)]),"video/quicktime")).toEqual({width:320,height:240,duration:3});
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
