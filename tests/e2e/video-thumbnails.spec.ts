import {test,expect} from "@playwright/test";

test("video thumbnails show silent frames in the queue, entries and gallery",async({page},testInfo)=>{
 test.setTimeout(120000);
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/sign-in");
 await page.getByRole("button",{name:"Enter paired preview"}).click();
 await expect(page).toHaveURL(/\/home$/);
 for(const kind of ["memory","moment"] as const){
  await page.goto(kind==="memory"?"/memories/new":"/milestones/new");
  await page.getByLabel(kind==="memory"?"Memory title":"Moment name",{exact:true}).fill("Fictional video thumbnail "+kind);
  await page.getByLabel("Date",{exact:true}).fill("2026-10-03");
  await page.locator('input[type="file"]').setInputFiles("tests/fixtures/phase6-video.mp4");
  await page.getByRole("button",{name:"Remove phase6-video.mp4",exact:true}).scrollIntoViewIfNeeded();
  await expect(page.locator('[data-video-thumbnail="ready"]')).toHaveCount(1,{timeout:20000});
  await page.getByRole("button",{name:kind==="memory"?"Save the memory":"Save the moment",exact:true}).click();
  await expect(page.getByText("1 video",{exact:true})).toBeVisible();
  const tile=page.locator('figure').filter({has:page.getByRole("button",{name:"Open video 1",exact:true})});
  await expect(tile.locator('[data-video-thumbnail="ready"]')).toBeVisible();
  const frame=tile.locator("video");
  const measured=await frame.evaluate((element:HTMLVideoElement)=>{
   const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;
   const context=canvas.getContext("2d")!;context.drawImage(element,0,0,64,64);
   const pixels=context.getImageData(0,0,64,64).data;
   return {paused:element.paused,muted:element.muted,time:element.currentTime,width:element.videoWidth,colors:new Set(Array.from({length:4096},(_,i)=>pixels[i*4]+","+pixels[i*4+1]+","+pixels[i*4+2])).size};
  });
  expect(measured.paused).toBe(true);expect(measured.muted).toBe(true);expect(measured.time).toBeCloseTo(1);expect(measured.width).toBeGreaterThan(0);expect(measured.colors).toBeGreaterThan(20);
  await tile.getByRole("button",{name:"Open video 1",exact:true}).focus();await page.keyboard.press("Enter");
  await expect(page.locator('dialog[open] video[controls]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link",{name:/Show more/}).click();
  await expect(page).toHaveURL(/\/gallery\?kind=/);
  await page.getByRole("button",{name:"Open video 1",exact:true}).scrollIntoViewIfNeeded();
  await expect(page.locator('[data-video-thumbnail="ready"]')).toBeVisible();
  await page.screenshot({path:".impeccable/qa/video-thumbnails-"+kind+"-"+testInfo.project.name+".png",fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);
 }
 // The thumbnail must remain ready after its loading deadline, without playback.
 await page.waitForTimeout(16000);
 await expect(page.locator('[data-video-thumbnail="ready"]')).toBeVisible();
 await expect(page.locator("video").first()).toHaveJSProperty("paused",true);
 // An unreadable existing original shows a fallback while the open action stays usable.
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open("us-together-preview-media",1);request.onsuccess=()=>resolve(request.result);request.onerror=reject;});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction("assets","readwrite");const store=tx.objectStore("assets");const request=store.getAll();request.onsuccess=()=>{for(const row of request.result)store.put({...row,file:new Blob(["not a video"],{type:"video/mp4"})});};tx.oncomplete=()=>resolve();tx.onerror=()=>reject();});db.close();
 });
 await page.reload();
 await expect(page.getByText("Preview unavailable").first()).toBeVisible();
 await expect(page.getByRole("button",{name:"Open video 1",exact:true})).toBeEnabled();
});
