import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("files chosen before saving send at once; a bad photo stops alone; 30 photos fit; Pause holds the batch", async ({ page }) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  const png = readFileSync("tests/fixtures/phase6-fixture.png");
  for (const kind of ["memory", "moment"] as const) {
    await page.goto(kind === "memory" ? "/memories/new" : "/milestones/new");
    await page.getByLabel(kind === "memory" ? "Memory title" : "Moment name", { exact: true }).fill("Fictional multi-photo " + kind);
    await page.getByLabel("Date", { exact: true }).fill("2026-10-02");
    await page.locator('input[type="file"]').setInputFiles([
      { name: "first.png", mimeType: "image/png", buffer: png },
      { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("invalid image bytes") },
      { name: "last.png", mimeType: "image/png", buffer: png },
    ]);
    // Chosen files wait as tiles, with no captions or file names to fill in.
    await expect(page.getByRole("list", { name: "Chosen photos and videos" }).getByRole("listitem")).toHaveCount(4);
    await expect(page.getByText("3 files will be added as soon as you save.")).toBeVisible();
    await page.getByRole("button", { name: kind === "memory" ? "Save the memory" : "Save the moment", exact: true }).click();

    await expect(page.getByText("2 photos", { exact: true })).toBeVisible({ timeout: 45000 });
    const failed = page.getByRole("button", { name: /^Try adding photo 1 of 1 again\./ });
    await expect(failed).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "1 file couldn't be added" })).toBeVisible();
    await page.getByRole("button", { name: "Remove photo 1 of 1", exact: true }).click();
    await expect(failed).toHaveCount(0);

    // Adding more starts them at once; Pause holds the rest until Continue.
    await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 28 }, (_, i) => ({
      name: "extra-" + i + ".png", mimeType: "image/png", buffer: png,
    })));
    await page.getByRole("button", { name: "Pause", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: /^Paused · \d+ photos? still to add/ })).toBeVisible();
    // The file already in flight may land; nothing after it starts.
    await page.waitForTimeout(1500);
    const held = await page.locator("[data-upload-state]").count();
    expect(held).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    await expect(page.locator("[data-upload-state]")).toHaveCount(held);
    await page.getByRole("button", { name: "Continue", exact: true }).focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText("30 photos", { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(page.locator("[data-upload-state]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
});
