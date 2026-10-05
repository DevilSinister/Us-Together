import { expect, test } from "@playwright/test";

test("Gallery filters stay compact and apply only when confirmed", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/gallery");

  const trigger = page.getByRole("button", { name: "Gallery filters" });
  await expect(trigger).toBeVisible();
  await expect(page.getByLabel("Group by", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `.impeccable/qa/gallery-filters-collapsed-${info.project.name}.png`, fullPage: true });

  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Gallery filters" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Show", { exact: true }).selectOption("video");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await trigger.click();
  await expect(dialog.getByLabel("Show", { exact: true })).toHaveValue("all");
  await dialog.getByLabel("Show", { exact: true }).selectOption("video");
  await dialog.getByLabel("Group by", { exact: true }).selectOption("date");
  await dialog.getByLabel("On date", { exact: true }).fill("2026-09-28");
  await page.screenshot({ path: `.impeccable/qa/gallery-filters-open-${info.project.name}.png` });
  await dialog.getByRole("button", { name: "Show gallery" }).click();
  await expect(page.getByRole("button", { name: "Gallery filters, 3 active" })).toBeVisible();
  await expect(page.getByText("Videos · 2026-09-28 · By date", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Gallery filters, 3 active" }).click();
  await dialog.getByRole("button", { name: "Reset" }).click();
  await dialog.getByRole("button", { name: "Show gallery" }).click();
  await expect(trigger).toBeVisible();
  await expect(page.getByText("Videos · 2026-09-28 · By date", { exact: true })).toHaveCount(0);
  if (info.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await page.screenshot({ path: `.impeccable/qa/gallery-filters-dark-${info.project.name}.png`, fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
