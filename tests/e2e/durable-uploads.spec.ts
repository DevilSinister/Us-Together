import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const png = readFileSync("tests/fixtures/phase6-fixture.png");
const video = readFileSync("tests/fixtures/phase6-video.mp4");
const photos = [
  { name: "one.png", mimeType: "image/png", buffer: png },
  { name: "video.mp4", mimeType: "video/mp4", buffer: video },
  { name: "two.png", mimeType: "image/png", buffer: png },
];
async function openEntry(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/memories/new");
  await page.getByLabel("Memory title", { exact: true }).fill("Fictional connection recovery");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-21");
  await page.getByRole("button", { name: "Save the memory", exact: true }).click();
  await expect(page.locator('input[type="file"]')).toBeEnabled();
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open("us-together-uploads", 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try {
      const tx = db.transaction(["jobs", "files"]);
      const read = (name: string) => new Promise<unknown[]>((resolve, reject) => { const r = tx.objectStore(name).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const [jobs, files] = await Promise.all([read("jobs"), read("files")]);
      return { jobs: jobs.length, sizes: files.map(file => (file as Blob).size).sort((a, b) => a - b) };
    } finally { db.close(); }
  });
}

test("mixed batch survives reload, keeps Pause, excludes a second tab, and clears durable bytes on success", async ({ page, context }) => {
  test.setTimeout(120000);
  await openEntry(page);
  await page.evaluate(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }));
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.getByRole("status").filter({ hasText: "Waiting for a connection" })).toBeVisible();
  expect(await stored(page)).toEqual({ jobs: 3, sizes: photos.map(photo => photo.buffer.length).sort((a, b) => a - b) });
  await page.getByRole("button", { name: "Pause", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Paused · 3 files still to add" })).toBeVisible();
  await page.goto("/home"); await page.goto(url);
  await expect(page.getByRole("status").filter({ hasText: "Paused · 3 files still to add" })).toBeVisible();
  expect((await stored(page)).jobs).toBe(3);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator("[data-upload-state]")).toHaveCount(3);
  const other = await context.newPage(); await other.goto(url);
  await expect(other.getByRole("alert").filter({ hasText: "open in another tab" })).toBeVisible();
  await other.close();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: ".impeccable/qa/durable-paused-" + test.info().project.name + ".png", fullPage: true });
  await page.getByRole("button", { name: "Continue", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.locator("[data-upload-state]")).toHaveCount(0, { timeout: 45000 });
  await expect(page.getByText("2 photos · 1 video", { exact: true })).toBeVisible();
  expect(await stored(page)).toEqual({ jobs: 0, sizes: [] });
  await page.reload(); await expect(page.getByText("2 photos · 1 video", { exact: true })).toBeVisible();
  await page.screenshot({ path: ".impeccable/qa/durable-finished-" + test.info().project.name + ".png", fullPage: true });
});

test("a full device refuses the batch atomically and sign-out clears queued files", async ({ page }) => {
  test.setTimeout(90000); await openEntry(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value: unknown, key?: IDBValidKey) {
      if (this.name === "files") throw new DOMException("Fictional full device", "QuotaExceededError");
      return original.call(this, value, key!);
    };
  });
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.getByRole("alert").filter({ hasText: "Free some space" })).toBeVisible();
  expect(await stored(page)).toEqual({ jobs: 0, sizes: [] });
  await page.reload(); await expect(page.locator('input[type="file"]')).toBeEnabled();
  await page.evaluate(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }));
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.locator("[data-upload-state]")).toHaveCount(3);
  await page.getByRole("button", { name: "Sign out", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(await stored(page)).toEqual({ jobs: 0, sizes: [] });
});

test("expired or another person's queued bytes are purged before recovery", async ({ page }) => {
  test.setTimeout(90000); await openEntry(page);
  await page.evaluate(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }));
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.locator("[data-upload-state]")).toHaveCount(3);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open("us-together-uploads", 1); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("jobs", "readwrite"), request = tx.objectStore("jobs").openCursor(); let index = 0;
      request.onsuccess = () => { const cursor = request.result; if (!cursor) return; cursor.update({ ...cursor.value, ...(index++ ? { owner: "fictional-other-owner" } : { expires: 0 }) }); cursor.continue(); };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  await page.reload(); await expect(page.locator('input[type="file"]')).toBeEnabled();
  await expect(page.locator("[data-upload-state]")).toHaveCount(0);
  expect(await stored(page)).toEqual({ jobs: 0, sizes: [] });
});

test("Retry remaining finishes only the rejected file and missing local bytes do not block the rest", async ({ page }) => {
  test.setTimeout(90000); await openEntry(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put; let rejectFirst = true;
    IDBObjectStore.prototype.put = function(value: unknown, key?: IDBValidKey) {
      if (this.name === "assets" && rejectFirst) { rejectFirst = false; throw new DOMException("Fictional interrupted processing", "UnknownError"); }
      return original.call(this, value, key!);
    };
  });
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.getByRole("button", { name: "Retry remaining", exact: true })).toBeVisible();
  await expect(page.getByText("2 of 3 saved", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Retry remaining", exact: true }).click();
  await expect(page.locator("[data-upload-state]")).toHaveCount(0);
  await expect(page.getByText("2 photos · 1 video", { exact: true })).toBeVisible();
  expect((await stored(page)).jobs).toBe(0);
  await page.evaluate(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }));
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.locator("[data-upload-state]")).toHaveCount(3);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open("us-together-uploads", 1); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite"), request = tx.objectStore("files").openCursor();
      request.onsuccess = () => request.result?.delete(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "no longer available" })).toBeVisible();
  await expect(page.locator("[data-upload-state]")).toHaveCount(2);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("[data-upload-state]")).toHaveCount(0);
  expect(await stored(page)).toEqual({ jobs: 0, sizes: [] });
});
