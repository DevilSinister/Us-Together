import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

test("real video batch reconnects; manual pause stays paused; rejected files do not block the batch", async ({ page, context }, info) => {
  test.skip(process.env.PHASE6_HOSTED !== "true", "Explicit disposable-account hosted gate");
  test.setTimeout(240000);
  const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line)).map(line => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")]; }));
  const fixture = JSON.parse(readFileSync("supabase/.temp/phase6-fixture.json", "utf8"));
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  expect((await db.auth.signInWithPassword(fixture.users[0])).error).toBeNull();
  const caption = "Fictional recovery " + info.project.name + " " + Date.now();
  const source = readFileSync("tests/fixtures/phase6-video.mp4"), padding = Buffer.alloc(13 * 1024 * 1024 - source.length);
  padding.writeUInt32BE(padding.length); padding.write("free", 4);
  const video = { name: "fictional-recovery.mp4", mimeType: "video/mp4", buffer: Buffer.concat([source, padding]) };
  let disconnect = true, rejectNext = false;
  const responses: string[] = [];
  page.on("response", response => { if (response.url().includes("/storage/v1/upload/resumable")) responses.push(response.request().method() + " " + response.status()); });
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sign-in"); await page.getByLabel("Email", { exact: true }).fill(fixture.users[0].email); await page.getByLabel("Password", { exact: true }).fill(fixture.users[0].password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(/\/home$/);
    await page.goto("/memories/" + fixture.memory);
    await page.route("**/storage/v1/upload/resumable**", async route => {
      if (route.request().method() === "PATCH" && disconnect) { disconnect = false; await context.setOffline(true); await route.abort("failed"); }
      else if (route.request().method() === "POST" && rejectNext) { rejectNext = false; await route.fulfill({ status: 403, headers: { "access-control-allow-origin": "*", "tus-resumable": "1.0.0" }, body: "Rejected fictional upload" }); }
      else await route.continue();
    });
    await page.locator('input[type="file"]').setInputFiles([video, video]);
    for (let index = 0; index < 2; index++) await page.getByRole("textbox", { name: "Caption for fictional-recovery.mp4", exact: true }).nth(index).fill(caption);
    await page.getByRole("button", { name: "Upload 2 files", exact: true }).click();
    await expect(page.getByRole("button", { name: "Resume upload", exact: true })).toBeVisible({ timeout: 75000 });
    await expect(page.getByRole("alert").filter({ hasText: "connection or upload service" })).toBeVisible();
    await page.screenshot({ path: ".impeccable/qa/video-recovery-" + info.project.name + ".png", fullPage: true });
    await context.setOffline(false);
    await expect.poll(async () => (await db.from("memory_media").select("id").eq("memory_id", fixture.memory).eq("caption", caption).eq("state", "ready")).data?.length, { timeout: 90000 }).toBe(2);
    await expect(page.getByRole("button", { name: "Upload 2 files", exact: true })).toHaveCount(0);
    // A user pause must survive a connection-return event.
    await page.locator('input[type="file"]').setInputFiles(video); await page.getByRole("textbox", { name: "Caption for fictional-recovery.mp4", exact: true }).fill(caption);
    const nextTransfer = page.waitForRequest(request => request.method() === "POST" && request.url().includes("/storage/v1/upload/resumable"));
    await page.getByRole("button", { name: "Upload 1 file", exact: true }).click();
    await nextTransfer;
    await page.getByRole("button", { name: "Pause upload", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByRole("button", { name: "Resume upload", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume upload", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect.poll(async () => (await db.from("memory_media").select("id").eq("memory_id", fixture.memory).eq("caption", caption).eq("state", "ready")).data?.length, { timeout: 90000 }).toBe(3);
    await expect(page.getByRole("button", { name: "Pause upload", exact: true })).toHaveCount(0);
    rejectNext = true;
    await page.locator('input[type="file"]').setInputFiles([video, video]);
    for (let index = 0; index < 2; index++) await page.getByRole("textbox", { name: "Caption for fictional-recovery.mp4", exact: true }).nth(index).fill(caption);
    await page.getByRole("button", { name: "Upload 2 files", exact: true }).click();
    await expect(page.getByRole("button", { name: "Upload 1 file", exact: true })).toBeVisible({ timeout: 90000 });
    await expect(page.getByRole("alert").filter({ hasText: "authorization was rejected" })).toBeVisible();
    await expect.poll(async () => (await db.from("memory_media").select("id").eq("memory_id", fixture.memory).eq("caption", caption).eq("state", "ready")).data?.length).toBe(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } catch (error) {
    console.log("Safe transfer diagnostics", { responses, paused: await page.getByRole("button", { name: "Resume upload", exact: true }).count(), connection: await page.evaluate(() => ({ online: navigator.onLine, visibility: document.visibilityState })) });
    throw error;
  } finally {
    await page.close();
    await context.setOffline(false);
    const rows = await db.from("memory_media").select("id").eq("memory_id", fixture.memory).eq("caption", caption);
    for (const row of rows.data ?? []) expect.soft((await db.functions.invoke("memory-media", { body: { operation: "remove", memoryId: fixture.memory, id: row.id } })).data?.ok, "Fictional binary/metadata cleanup").toBe(true);
    await db.auth.signOut({ scope: "local" });
  }
});
