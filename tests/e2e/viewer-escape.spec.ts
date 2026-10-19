import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// Chrome stops letting a page prevent a dialog's `cancel` after a couple of
// uses. Escape must still close only the innermost layer every time, and a
// dialog the browser closes on its own must not leave the page thinking it is open.
test("Escape closes one layer at a time, however often it is pressed", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  const png = readFileSync("tests/fixtures/phase6-fixture.png");
  await page.goto("/milestones/new");
  await page.getByLabel("Moment name", { exact: true }).fill("Fictional Escape check");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-19");
  await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 3 }, (_, i) => ({ name: "escape-" + i + ".png", mimeType: "image/png", buffer: png })));
  await page.getByRole("button", { name: "Save the moment", exact: true }).click();
  await expect(page.getByText("3 photos", { exact: true })).toBeVisible({ timeout: 45000 });

  const viewer = page.getByRole("dialog", { name: /^Photo viewer,/ });
  const comments = viewer.getByRole("region", { name: "Photo comments" });
  await page.getByRole("button", { name: "Open photo 1", exact: true }).click();
  await expect(viewer).toBeVisible();
  for (let i = 0; i < 4; i++) {
    if (i === 2) await page.keyboard.press("ArrowRight");
    await viewer.getByRole("button", { name: "Comments", exact: true }).click();
    await expect(comments).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(comments).toHaveCount(0);
    await expect(viewer).toBeVisible();
  }
  // The three-dot menu closes first, then the viewer itself.
  await viewer.getByRole("button", { name: "More options", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(viewer.getByRole("menu", { name: "Photo options" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer.getByRole("menu", { name: "Photo options" })).toHaveCount(0);
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);

  // A close the browser makes on its own leaves the photo ready to open again.
  await page.getByRole("button", { name: "Open photo 2", exact: true }).click();
  await expect(viewer.getByText(/^2 of 3/)).toBeVisible();
  await viewer.evaluate((dialog: HTMLDialogElement) => dialog.close());
  await expect(viewer).toHaveCount(0);
  await page.getByRole("button", { name: "Open photo 2", exact: true }).click();
  await expect(viewer.getByText(/^2 of 3/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);

  // Ordinary dialogs follow the same rule.
  await page.goto("/gallery");
  const trigger = page.getByRole("button", { name: "Gallery filters" });
  const filters = page.getByRole("dialog", { name: "Gallery filters" });
  for (let i = 0; i < 4; i++) {
    await trigger.click();
    await expect(filters).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(filters).toHaveCount(0);
  }
  await trigger.click();
  await filters.evaluate((dialog: HTMLDialogElement) => dialog.close());
  await expect(filters).toHaveCount(0);
  await trigger.click();
  await expect(filters).toBeVisible();
});
