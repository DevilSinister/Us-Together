import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("memory and moment batches continue after a bad photo and accept 30 photos", async ({ page }) => {
  test.setTimeout(150000);
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
    await page.getByLabel("Caption for broken.png", { exact: true }).fill("Preserved caption");
    await page.getByRole("button", { name: kind === "memory" ? "Save the memory" : "Save the moment", exact: true }).click();
    await expect(page.getByText("2 photos", { exact: true })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("alert").filter({ hasText: "1 file could not finish" })).toBeVisible();
    await expect(page.getByLabel("Caption for broken.png", { exact: true })).toHaveValue("Preserved caption");
    await page.getByRole("button", { name: "Remove broken.png", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 28 }, (_, i) => ({
      name: "extra-" + i + ".png", mimeType: "image/png", buffer: png,
    })));
    await page.getByRole("button", { name: "Upload 28 files", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("30 photos", { exact: true })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("button", { name: "Upload 28 files", exact: true })).toHaveCount(0);
    await expect(page.getByRole("alert").filter({ hasText: "could not finish" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
});
