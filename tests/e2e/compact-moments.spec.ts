import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("compact moment previews keep photo and gallery navigation clear", async ({ page }, info) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  const fixture = readFileSync("tests/fixtures/phase6-fixture.png");
  for (const count of [7, 1]) {
    await page.goto("/milestones/new");
    await page.getByLabel("Moment name", { exact: true }).fill(`A small day with a long title to remember ${count}`);
    await page.getByLabel("Date", { exact: true }).fill("2026-10-04");
    await page.locator('input[type="file"]').setInputFiles(Array.from({ length: count }, (_, i) => ({ name: `sample-${i}.png`, mimeType: "image/png", buffer: fixture })));
    await page.getByRole("button", { name: "Save the moment", exact: true }).click();
    await expect(page.getByText(count === 1 ? "1 photo" : "7 photos", { exact: true })).toBeVisible({ timeout: 45000 });
  }
  await page.goto("/milestones");
  const many = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "A small day with a long title to remember 7" }) });
  const single = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "A small day with a long title to remember 1" }) });
  await expect(many.getByRole("button", { name: /Open photo/ })).toHaveCount(6);
  await expect(single.getByRole("button", { name: /Open photo/ })).toHaveCount(1);
  await expect(single.getByRole("link", { name: /View all|Show more/ })).toHaveCount(0);
  await expect(many.getByRole("heading")).toHaveCSS("font-size", "18px");
  await many.getByRole("button", { name: "Open photo 1", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /^Photo viewer,/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: `.impeccable/qa/compact-moments-${info.project.name}.png`, fullPage: true });
  await many.getByRole("link", { name: /View all 7 files/ }).click();
  await expect(page).toHaveURL(/\/gallery\?kind=moment&entry=/);
  await expect(page.getByRole("button", { name: /Open photo/ })).toHaveCount(7);
  for (const route of ["home", "calendar", "notes", "wishlist", "bucket"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("h1")).toHaveCSS("font-size", info.project.name.includes("mobile") ? "30px" : "36px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await page.screenshot({ path: `.impeccable/qa/compact-${route}-${info.project.name}.png`, fullPage: true });
  }
  if (info.project.name.includes("mobile")) {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/milestones");
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await page.screenshot({ path: ".impeccable/qa/compact-moments-dark-320.png", fullPage: true });
  }
});
