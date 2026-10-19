import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
test.use({ trace: "off", video: "off" });

const viewerOf = (page: Page) => page.getByRole("dialog", { name: /^Photo viewer,/ });

async function openMenu(page: Page, viewer: Locator) {
  await viewer.getByRole("button", { name: "More options", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(viewer.getByRole("menu", { name: "Photo options" })).toBeVisible();
}

test("connected account uploads, views and removes private photos and videos", async ({ page }, testInfo) => {
  test.skip(process.env.PHASE6_HOSTED !== "true", "Explicit disposable-account hosted gate");
  test.setTimeout(180000);
  const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter(line => /^[A-Z][A-Z0-9_]*=/.test(line)).map(line => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")]; }));
  const fixture = JSON.parse(readFileSync("supabase/.temp/phase6-fixture.json", "utf8"));
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const signedIn = await db.auth.signInWithPassword(fixture.users[0]);
  expect(signedIn.error).toBeNull();
  // Files carry no caption until after they send, so this run's rows are the
  // fixture user's rows on the fixture memory created after it started.
  const started = new Date(Date.now() - 1000).toISOString();
  const mine = () => db.from("memory_media").select("id").eq("memory_id", fixture.memory).eq("created_by", signedIn.data.user!.id).gte("created_at", started);
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sign-in"); await page.getByLabel("Email", { exact: true }).fill(fixture.users[0].email); await page.getByLabel("Password", { exact: true }).fill(fixture.users[0].password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto("/memories/" + fixture.memory);
    const media = page.getByRole("region", { name: "Photos and videos" });

    // The swatch sends as soon as it is chosen; its caption is written afterwards, in the viewer.
    await media.locator('input[type="file"]').setInputFiles("tests/fixtures/phase6-fixture.png");
    await expect(media.getByRole("button", { name: /Open photo/ })).toBeVisible({ timeout: 90000 });
    await expect(page.locator("[data-upload-state]")).toHaveCount(0);
    await media.getByRole("button", { name: /Open photo/ }).click();
    const viewer = viewerOf(page);
    await expect(viewer).toBeVisible();
    await expect.poll(() => viewer.getByRole("img", { name: "Photo", exact: true }).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await openMenu(page, viewer);
    const href = await viewer.getByRole("menuitem", { name: "Download" }).getAttribute("href");
    const res = await page.request.get(href!, { maxRedirects: 0 });
    expect(res.status()).toBe(307); expect(res.headers()["cache-control"]).toContain("no-store"); expect(res.headers().location).toContain("token=");
    await viewer.getByRole("menuitem", { name: "Add a caption", exact: true }).click();
    await viewer.getByLabel("Caption", { exact: true }).fill("Fictional test swatch");
    await viewer.getByRole("button", { name: "Save caption", exact: true }).click();
    await expect(viewer.getByRole("region", { name: "Photo comments" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer.getByText("Fictional test swatch", { exact: true })).toBeVisible();
    await page.screenshot({ path: ".impeccable/qa/phase6-viewer-" + testInfo.project.name + ".png", fullPage: false });
    await page.keyboard.press("Escape"); await expect(viewer).toHaveCount(0);

    await media.locator('input[type="file"]').setInputFiles("tests/fixtures/phase6-video.mp4");
    await expect(page.getByText("1 photo · 1 video", { exact: true })).toBeVisible({ timeout: 90000 });
    await expect(page.locator("[data-upload-state]")).toHaveCount(0);
    await media.getByRole("button", { name: /Open video/ }).click();
    const video = viewer.locator("video[controls]");
    await expect(video).toHaveAttribute("preload", "metadata");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 30000 }).toBeGreaterThanOrEqual(1);
    await video.evaluate((v: HTMLVideoElement) => v.play());
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    // Arrow keys on a focused video seek it; they do not step to the next file.
    await video.focus(); await page.keyboard.press("ArrowLeft");
    await expect(video).toBeVisible();
    await expect(viewer.getByText(/^2 of 2/)).toBeVisible();
    await page.keyboard.press("Escape"); await expect(viewer).toHaveCount(0);
    await page.screenshot({ path: ".impeccable/qa/phase6-media-detail-" + testInfo.project.name + ".png", fullPage: true });

    await page.goto("/memories");
    await expect(page).toHaveURL(/\/memories$/); await expect(page.getByRole("heading", { name: "Memories, close to home." })).toBeVisible();
    const swatch = page.getByRole("img", { name: "Fictional test swatch", exact: true }).first();
    await expect(swatch).toBeVisible();
    await expect.poll(() => swatch.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: ".impeccable/qa/phase6-gallery-" + testInfo.project.name + ".png", fullPage: true });

    // Deleting from the viewer lands on the neighbour, and the last one closes it.
    await page.goto("/memories/" + fixture.memory);
    await media.getByRole("button", { name: /Open (photo|video)/ }).first().click();
    for (let i = 0; i < 2; i++) {
      await openMenu(page, viewer);
      await viewer.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const confirm = page.getByRole("dialog", { name: /^Delete this (photo|video)\?$/ });
      await confirm.getByRole("button", { name: /^Delete (photo|video)$/ }).click();
      await expect(confirm).toHaveCount(0);
      await expect(media.getByRole("button", { name: /Open (photo|video)/ })).toHaveCount(1 - i);
    }
    await expect(viewer).toHaveCount(0);
    await page.reload(); await expect(media.getByRole("button", { name: /Open (photo|video)/ })).toHaveCount(0);
    expect((await page.request.get(href!, { maxRedirects: 0 })).status()).toBe(404);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  } finally {
    // Whatever the UI left behind, this run's fictional files and their bytes go.
    const rows = await mine();
    for (const row of rows.data ?? []) expect.soft((await db.functions.invoke("memory-media", { body: { operation: "remove", memoryId: fixture.memory, id: row.id } })).data?.ok, "Fictional binary/metadata cleanup").toBe(true);
    await db.auth.signOut({ scope: "local" });
  }
});
