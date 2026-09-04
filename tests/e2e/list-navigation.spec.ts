import { expect, test } from "@playwright/test";

test("list landing, scoped creation and back navigation keep ideas in their list", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/bucket");
  for (const title of ["At home", "Away for the weekend"]) {
    await page.getByRole("button", { name: "Add list", exact: true }).click();
    await page.getByLabel("List name", { exact: true }).fill(title);
    await page.getByRole("button", { name: "Create list", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await page.screenshot({ path: `test-results/lists-landing-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("link", { name: "Away for the weekend Open ideas" }).click();
  await expect(page).toHaveURL(/\/bucket\/lists\/[^/]+$/);
  const listUrl = page.url();
  await page.getByRole("link", { name: "Add idea", exact: true }).first().click();
  const listId = listUrl.split("/").at(-1)!;
  await expect(page.getByLabel("List", { exact: true })).toHaveValue(listId);
  await page.getByLabel("What would you love to do?").fill("A picnic by the lake");
  await page.getByRole("button", { name: "Save this idea", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A picnic by the lake", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to list", exact: true }).click();
  await expect(page).toHaveURL(listUrl);
  await page.reload();
  await expect(page.getByRole("heading", { name: "A picnic by the lake", exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/list-ideas-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("link", { name: "All lists", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A picnic by the lake", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "At home Open ideas" }).click();
  await expect(page.getByRole("heading", { name: "A picnic by the lake", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("idea");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A picnic by the lake", exact: true })).toHaveCount(0);
  await page.goto("/bucket/lists/not-a-list");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.goto("/bucket/lists/11111111-1111-4111-8111-111111111111");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});

test("phone navigation fits narrow screens and More supports keyboard and every destination", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/bucket");
  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 700 });
    const nav = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Lists", exact: true })).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const target of await nav.locator("a, button").all()) {
      const box = await target.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(await target.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 320, height: 640 });
  const more = page.getByRole("button", { name: "More", exact: true });
  await more.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "More destinations" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(more).toBeFocused();
  await page.screenshot({ path: `test-results/nav-narrow-${testInfo.project.name}.png` });
  for (const [label, path] of [["Moments", "/milestones"], ["Profile", "/profile"], ["Partner", "/pairing"], ["Plans", "/plans"]]) {
    await more.click();
    await dialog.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(dialog).toHaveCount(0);
    await more.click();
    await expect(dialog.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  }
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await more.click();
  await page.screenshot({ path: `test-results/nav-more-dark-${testInfo.project.name}.png` });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.getByRole("navigation", { name: "Mobile navigation", exact: true })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link")).toHaveCount(8);
});
