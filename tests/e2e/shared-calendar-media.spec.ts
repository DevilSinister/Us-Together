import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const viewerOf = (page: Page) => page.getByRole("dialog", { name: /^Photo viewer,/ });
const captioned = (page: Page, caption: string) => page.locator("figure").filter({ has: page.getByAltText(caption, { exact: true }) }).getByRole("button", { name: /^Open photo/ });

/** Captions are written on the photo itself, from the viewer's three-dot menu. */
async function writeCaption(page: Page, viewer: Locator, caption: string) {
  await viewer.getByRole("button", { name: "More options", exact: true }).focus();
  await page.keyboard.press("Enter");
  await viewer.getByRole("menuitem", { name: /^(Add a caption|Edit caption)$/ }).click();
  await viewer.getByLabel("Caption", { exact: true }).fill(caption);
  await viewer.getByRole("button", { name: "Save caption", exact: true }).click();
  // Saving lands on the photo's comments, which repeat the caption above them.
  await expect(viewer.getByRole("region", { name: "Photo comments" })).toBeVisible();
  await expect(viewer.getByText(caption, { exact: true })).toBeVisible();
}

async function openComments(viewer: Locator) {
  await viewer.getByRole("button", { name: "Comments", exact: true }).click();
  const thread = viewer.getByRole("region", { name: "Photo comments" });
  await expect(thread.getByRole("status")).toHaveCount(0);
  return thread;
}

/** Sheets close with their own Close button; Escape is kept for the viewer itself. */
async function closeSheet(viewer: Locator) {
  await viewer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(viewer.getByRole("region", { name: "Photo comments" })).toHaveCount(0);
  await expect(viewer.getByRole("button", { name: "Comments", exact: true })).toBeVisible();
}

async function postComment(viewer: Locator, body: string) {
  const thread = viewer.getByRole("region", { name: "Photo comments" });
  await thread.getByLabel("Comment on this file", { exact: true }).fill(body);
  await thread.getByRole("button", { name: "Send comment", exact: true }).click();
  await expect(thread.getByText(body, { exact: true })).toBeVisible();
}

/** A moment's list card keeps six photos, steps through all seven, and opens the entry's gallery. */
async function openFromCard(page: Page, project: string) {
  await page.goto("/milestones");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Gallery moment", exact: true }) });
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByRole("button", { name: /Open photo/ })).toHaveCount(6);
  await card.getByRole("button", { name: "Open photo 1", exact: true }).click();
  const viewer = viewerOf(page);
  await expect(viewer.getByText(/^1 of 7/)).toBeVisible();
  if (project.includes("mobile")) {
    const bounds = await viewer.boundingBox();
    expect(bounds).not.toBeNull();
    const cdp = await page.context().newCDPSession(page), x = bounds!.x + bounds!.width * 0.8, y = bounds!.y + bounds!.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (const dx of [20, 100, 200]) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - dx, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  } else await page.keyboard.press("ArrowRight");
  await expect(viewer.getByText(/^2 of 7/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await page.screenshot({ path: ".impeccable/qa/gallery-list-moment-" + project + ".png", fullPage: true });
  await card.getByRole("link", { name: /View all \d+ files/ }).click();
}

test("preview galleries keep six photos, all files, captions and file-specific comments", async ({ page }, info) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Enter paired preview" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("link", { name: "Open gallery", exact: true })).toBeVisible();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const png = readFileSync("tests/fixtures/phase6-fixture.png");

  for (const kind of ["memory", "moment"] as const) {
    await page.goto(kind === "memory" ? "/memories/new" : "/milestones/new");
    await expect(page.getByLabel("Latitude", { exact: true })).toHaveCount(0);
    await page.getByLabel(kind === "memory" ? "Memory title" : "Moment name", { exact: true }).fill("Gallery " + kind);
    await page.getByLabel("Date", { exact: true }).fill(today);
    // Seven files wait as tiles, with nothing to fill in before they send.
    await page.locator('input[type="file"]').setInputFiles(Array.from({ length: 7 }, (_, i) => ({ name: "photo-" + i + ".png", mimeType: "image/png", buffer: png })));
    await expect(page.getByRole("list", { name: "Chosen photos and videos" }).getByRole("listitem")).toHaveCount(8);
    await expect(page.getByText("7 files will be added as soon as you save.")).toBeVisible();
    await expect(page.getByLabel(/^Caption/)).toHaveCount(0);
    await page.getByRole("button", { name: kind === "memory" ? "Save the memory" : "Save the moment", exact: true }).click();
    await expect(page.getByText("7 photos", { exact: true })).toBeVisible({ timeout: 45000 });
    await expect(page.locator("[data-upload-state]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);

    // The caption is added afterwards, on the first photo.
    await page.getByRole("button", { name: "Open photo 1", exact: true }).click();
    const savedViewer = viewerOf(page);
    await expect(savedViewer).toBeVisible();
    await writeCaption(page, savedViewer, "First " + kind + " photo");
    await closeSheet(savedViewer);
    await page.keyboard.press("Escape");
    await expect(savedViewer).toHaveCount(0);

    await page.getByRole("link", { name: "View " + kind, exact: true }).click();
    await expect(page).toHaveURL(new RegExp((kind === "memory" ? "/memories/" : "/milestones/") + "[0-9a-f-]+$"));
    await expect(page.getByRole("button", { name: /Open photo/ })).toHaveCount(6);
    await expect(page.getByText("First " + kind + " photo", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Remind me", exact: true })).toHaveCount(0);
    const entryUrl = page.url();

    if (kind === "memory") {
      // Memories list as compact rows without photos; the gallery opens from the memory itself.
      await page.goto("/memories");
      await expect(page.getByRole("link", { name: /^Gallery memory/ })).toBeVisible();
      await page.goto(entryUrl);
      await page.getByRole("link", { name: /^Open gallery/ }).click();
    } else await openFromCard(page, info.project.name);
    await expect(page).toHaveURL(/gallery\?kind=/);
    await expect(page.getByRole("button", { name: /Open photo/ })).toHaveCount(7);
    await page.getByRole("button", { name: "Gallery filters" }).click();
    await expect(page.getByRole("dialog", { name: "Gallery filters" })).toBeVisible();
    await expect(page.getByLabel("From", { exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // The gallery orders files its own way, so the captioned photo is found by its caption.
    await captioned(page, "First " + kind + " photo").click();
    const viewer = viewerOf(page);
    await expect(viewer).toBeVisible();
    const photo = viewer.getByRole("img", { name: "First " + kind + " photo", exact: true });
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    const at = Number((await viewer.getByText(/^\d of 7/).textContent())!.split(" ")[0]);
    await openComments(viewer);
    await postComment(viewer, "Just for the first " + kind + " photo");
    await closeSheet(viewer);
    await writeCaption(page, viewer, "Edited " + kind + " caption");
    await closeSheet(viewer);

    // A comment belongs to its file: the neighbour has none, and it is still there coming back.
    const [away, back] = at < 7 ? ["ArrowRight", "ArrowLeft"] : ["ArrowLeft", "ArrowRight"];
    await page.keyboard.press(away);
    await expect(viewer.getByText(new RegExp("^" + (at < 7 ? at + 1 : at - 1) + " of 7"))).toBeVisible();
    let thread = await openComments(viewer);
    await expect(thread.getByText("Leave a little detail for each other.", { exact: true })).toBeVisible();
    await expect(thread.getByText("Just for the first " + kind + " photo", { exact: true })).toHaveCount(0);
    await closeSheet(viewer);
    await page.keyboard.press(back);
    await expect(viewer.getByText(new RegExp("^" + at + " of 7"))).toBeVisible();
    thread = await openComments(viewer);
    await expect(thread.getByText("Just for the first " + kind + " photo", { exact: true })).toBeVisible();
    if (kind === "memory") await page.screenshot({ path: ".impeccable/qa/gallery-viewer-" + info.project.name + ".png" });
    await closeSheet(viewer);
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);

    await page.reload();
    await captioned(page, "Edited " + kind + " caption").click();
    await expect(viewer.getByText("Edited " + kind + " caption", { exact: true })).toBeVisible();
    thread = await openComments(viewer);
    await expect(thread.getByText("Just for the first " + kind + " photo", { exact: true })).toBeVisible();
    await closeSheet(viewer);
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await page.screenshot({ path: ".impeccable/qa/gallery-preview-" + kind + "-" + info.project.name + ".png", fullPage: true });
    await page.goto(entryUrl);
  }

  // A video added to a saved entry sends as soon as it is chosen.
  await page.getByRole("region", { name: "Photos and videos" }).locator('input[type="file"]').setInputFiles("tests/fixtures/phase6-video.mp4");
  await expect(page.getByText("7 photos · 1 video", { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.locator("[data-upload-state]")).toHaveCount(0);
  await page.getByRole("link", { name: /^Open gallery/ }).click();
  await expect(page).toHaveURL(/gallery\?kind=moment/);
  await page.getByRole("button", { name: /Open video/ }).click();
  await expect(viewerOf(page).locator("video[controls]")).toHaveAttribute("preload", "metadata");
  await page.keyboard.press("Escape");

  await page.goto("/calendar");
  await expect(page.getByRole("link", { name: /Memory Gallery memory/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Moment Gallery moment/ })).toBeVisible();

  await page.goto("/home");
  await page.getByRole("link", { name: "Open gallery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your shared gallery.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Open (photo|video)/ })).toHaveCount(15);
  await page.getByRole("button", { name: "Gallery filters" }).click();
  await page.getByLabel("From", { exact: true }).selectOption("memory");
  await page.getByRole("button", { name: "Show gallery" }).click();
  await expect(page.getByRole("button", { name: /Open photo/ })).toHaveCount(7);
  await captioned(page, "Edited memory caption").click();
  const homeViewer = viewerOf(page);
  let thread = await openComments(homeViewer);
  await expect(thread.getByText("Just for the first memory photo", { exact: true })).toBeVisible();
  await postComment(homeViewer, "Added from Home gallery");
  await closeSheet(homeViewer);
  await page.keyboard.press("Escape");
  await expect(homeViewer).toHaveCount(0);

  await page.getByRole("button", { name: /Gallery filters, 1 active/ }).click();
  await page.getByLabel("From", { exact: true }).selectOption("all");
  await page.getByLabel("Group by", { exact: true }).selectOption("date");
  await page.getByLabel("On date", { exact: true }).fill(today);
  await page.getByRole("button", { name: "Show gallery" }).click();
  await expect(page.getByRole("button", { name: /Open (photo|video)/ })).toHaveCount(15);
  await page.screenshot({ path: ".impeccable/qa/gallery-date-" + info.project.name + ".png", fullPage: true });
  await page.getByRole("button", { name: /Gallery filters, 2 active/ }).click();
  await page.getByLabel("Show", { exact: true }).selectOption("video");
  await page.getByRole("button", { name: "Show gallery" }).click();
  await expect(page.getByRole("button", { name: /Open video/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Open photo/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Open video/ }).click();
  await expect(viewerOf(page).locator("video[controls]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Gallery filters, 3 active/ }).click();
  await page.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: "Show gallery" }).click();
  await expect(page.getByRole("button", { name: /Open (photo|video)/ })).toHaveCount(15);
  await page.screenshot({ path: ".impeccable/qa/gallery-home-" + info.project.name + ".png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  // The comment left from Home is on the same file inside its memory.
  await page.getByRole("link", { name: "Open memory", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/memories/[0-9a-f-]+$"));
  await page.getByRole("button", { name: "Open photo 1", exact: true }).click();
  const finalViewer = viewerOf(page);
  await expect(finalViewer).toBeVisible();
  for (let i = 0; i < 7 && !(await finalViewer.getByText("Edited memory caption", { exact: true }).isVisible()); i++) await page.keyboard.press("ArrowRight");
  thread = await openComments(finalViewer);
  await expect(thread.getByText("Added from Home gallery", { exact: true })).toBeVisible();
});
