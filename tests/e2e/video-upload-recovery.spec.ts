import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

test("real video batch reconnects; manual pause stays paused; rejected files do not block the batch", async ({ page, context }) => {
  test.skip(process.env.PHASE6_HOSTED !== "true", "Explicit disposable-account hosted gate");
  test.setTimeout(240000);
  const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line)).map(line => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")]; }));
  const fixture = JSON.parse(readFileSync("supabase/.temp/phase6-fixture.json", "utf8"));
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const signedIn = await db.auth.signInWithPassword(fixture.users[0]);
  expect(signedIn.error).toBeNull();
  const owner = signedIn.data.user!.id;
  // Files no longer carry a caption before they send, so this run's rows are
  // the fixture user's rows on the fixture memory created after it started.
  const started = new Date(Date.now() - 1000).toISOString();
  const mine = () => db.from("memory_media").select("id,state").eq("memory_id", fixture.memory).eq("created_by", owner).gte("created_at", started);
  const readyCount = async () => ((await mine()).data ?? []).filter(row => row.state === "ready").length;
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

    // A dropped connection is waiting, not failing, and carries on by itself.
    await page.locator('input[type="file"]').setInputFiles([video, video]);
    await expect(page.getByRole("status").filter({ hasText: "Waiting for a connection" })).toBeVisible({ timeout: 75000 });
    await expect(page.getByText("They'll carry on by themselves when you're back online.")).toBeVisible();
    await page.screenshot({ path: ".impeccable/qa/video-recovery-" + test.info().project.name + ".png", fullPage: true });
    await context.setOffline(false);
    await expect.poll(readyCount, { timeout: 90000 }).toBe(2);
    await expect(page.locator("[data-upload-state]")).toHaveCount(0);

    // A person's Pause must survive a connection-return event.
    const nextTransfer = page.waitForRequest(request => request.method() === "POST" && request.url().includes("/storage/v1/upload/resumable"));
    await page.locator('input[type="file"]').setInputFiles(video);
    await nextTransfer;
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Paused · 1 video still to add" })).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect.poll(readyCount, { timeout: 90000 }).toBe(3);
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);

    // A rejected file stops on its own tile; the next one still arrives.
    rejectNext = true;
    await page.locator('input[type="file"]').setInputFiles([video, video]);
    await expect(page.getByRole("button", { name: /^Try adding video 1 of 1 again\. You were signed out/ })).toBeVisible({ timeout: 90000 });
    await expect.poll(readyCount).toBe(4);
    await page.getByRole("button", { name: "Remove video 1 of 1", exact: true }).click();
    await expect(page.locator("[data-upload-state]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } catch (error) {
    console.log("Safe transfer diagnostics", { responses, paused: await page.getByRole("button", { name: "Continue", exact: true }).count(), connection: await page.evaluate(() => ({ online: navigator.onLine, visibility: document.visibilityState })) });
    throw error;
  } finally {
    await page.close();
    await context.setOffline(false);
    const rows = await mine();
    for (const row of rows.data ?? []) expect.soft((await db.functions.invoke("memory-media", { body: { operation: "remove", memoryId: fixture.memory, id: row.id } })).data?.ok, "Fictional binary/metadata cleanup").toBe(true);
    await db.auth.signOut({ scope: "local" });
  }
});
