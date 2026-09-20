import { expect, test, type Page } from "@playwright/test";

/**
 * Notes and drawings journeys. Two lanes:
 *
 *  - The preview lane uses the developer paired preview, which has no couple store, so
 *    it exercises everything the editor does *except* sending (the button is disabled
 *    and says why).
 *  - The two-account lane needs two real paired accounts and is marked fixme until a
 *    seeded test project exists in CI.
 *
 * Recorded as owed in docs/DRAWING_NOTES_VERIFICATION.md: browsers cannot run on the
 * build machine, so these have not been executed there.
 */

async function enterPairedPreview(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /enter paired preview/i }).click();
  await page.waitForURL(/\/home/);
}

async function canvasHasInk(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("canvas[role=img]");
    if (!canvas) return false;
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) return true;
    return false;
  });
}

test.describe("preview lane", () => {
  test("asset links and the manifest are served without a session", async ({ request }) => {
    const links = await request.get("/.well-known/assetlinks.json");
    expect(links.status()).toBe(200);
    expect(links.headers()["content-type"]).toContain("application/json");
    const [statement] = await links.json();
    expect(statement.target.package_name).toBe("app.ustogether");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const body = await manifest.json();
    expect(body.shortcuts.some((s: { url: string }) => s.url.startsWith("/drawings/new"))).toBe(true);
  });

  test("the editor mounts, draws with the keyboard, and keeps the same canvas through review", async ({ page }) => {
    await enterPairedPreview(page);
    await page.goto("/drawings/new");
    const canvas = page.getByRole("img", { name: /drawing canvas/i });
    await expect(canvas).toBeVisible();
    expect(await canvasHasInk(page)).toBe(false);

    // Two-press keyboard rectangle: anchor, move, finish.
    await page.getByRole("button", { name: "Filled rectangle" }).click();
    await canvas.focus();
    await page.keyboard.press("Space");
    await expect(page.getByText(/corner set/i)).toBeVisible();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    expect(await canvasHasInk(page)).toBe(true);

    await page.getByRole("button", { name: "Undo" }).click();
    expect(await canvasHasInk(page)).toBe(false);
    await page.getByRole("button", { name: "Redo" }).click();
    expect(await canvasHasInk(page)).toBe(true);

    // Review hides the workspace but never unmounts the canvas.
    const handle = await canvas.elementHandle();
    await page.getByRole("button", { name: /review drawing/i }).click();
    await expect(page.getByRole("heading", { name: /ready for/i })).toBeVisible();
    expect(await handle!.evaluate((element) => element.isConnected)).toBe(true);
    await expect(page.getByRole("button", { name: /send to/i })).toBeDisabled();
    await expect(page.getByText(/sending opens with a connected account/i)).toBeVisible();
    await page.getByRole("button", { name: /keep drawing/i }).click();
    await expect(canvas).toBeVisible();
    expect(await canvasHasInk(page)).toBe(true);
  });

  test("the editor fits a phone without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterPairedPreview(page);
    await page.goto("/drawings/new");
    await expect(page.getByRole("img", { name: /drawing canvas/i })).toBeVisible();
    const touch = await page.evaluate(() => getComputedStyle(document.querySelector("canvas")!).touchAction);
    expect(touch).toBe("none");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("two-account lane", () => {
  test.fixme("a sent drawing shows New for the partner until opened, then Draw back replies", async () => {
    // Sign in as A → /drawings/new → draw → Review → Send to <B> → lands on /drawings/<id>?sent=1.
    // Sign in as B → /home shows the drawing card → /drawings shows New → open → back → pill gone.
    // B → Draw back → send → A's /notifications shows "A drawing was sent".
  });
  test.fixme("a shared note shows New for the partner and clears after opening", async () => {
    // Sign in as A → /notes/new → counters update → Keep this note.
    // Sign in as B → /notes shows New → open → back → pill gone (note_reads has one row).
  });
});
