import { expect, test } from "@playwright/test";

async function enterPairedPreview(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test("paired fixture exposes a named partner and completes the plan-to-memory loop", async ({ page }) => {
  await enterPairedPreview(page);
  await expect(page.getByRole("heading", { name: /days of us—and counting/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The day we chose us" })).toBeVisible();
  await expect(page.getByRole("link", { name: "1 unread" })).toBeVisible();
  await page.goto("/pairing");
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  await expect(page.getByText("Shared access is granted only while both memberships are active.")).toBeVisible();

  await page.goto("/plans/new");
  await page.getByLabel("What are you planning?").fill("Rooftop dinner");
  await page.getByLabel("Location").fill("Old Town");
  await page.getByLabel("Starts").fill("2027-02-14T19:30");
  await page.getByRole("button", { name: "Save this plan" }).click();
  await expect(page.getByRole("heading", { name: "Rooftop dinner" })).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await page.getByRole("link", { name: "Save this memory" }).click();
  await expect(page.getByText("From a completed plan")).toBeVisible();
  await page.getByLabel("What do you want to remember?").fill("The city lights and the quiet walk home.");
  await page.getByRole("button", { name: "Save the memory" }).click();
  await expect(page.getByRole("heading", { name: "Rooftop dinner" })).toBeVisible();
  await expect(page.getByText("From the plan “Rooftop dinner”")).toBeVisible();

  await page.goto("/milestones/new");
  await page.getByLabel("Milestone name").fill("Our first brave leap");
  await page.getByLabel("Date").fill("2026-08-14");
  await page.getByLabel("Feature this milestone on Home").check();
  await page.getByRole("button", { name: "Save milestone" }).click();
  await expect(page.getByRole("heading", { name: "Our first brave leap" })).toBeVisible();

  await page.goto("/notifications");
  await page.getByRole("button", { name: "Mark read" }).click();
  await expect(page.getByText("0 unread")).toBeVisible();
  await page.getByLabel("Milestones").uncheck();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Notification preferences saved.")).toBeVisible();
});

test("paired connection stays usable on mobile with reduced motion", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-only assertion");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterPairedPreview(page);
  await page.goto("/pairing");
  await expect(page.getByRole("heading", { name: "You’re connected." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "The day we chose us" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
