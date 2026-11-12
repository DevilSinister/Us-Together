---
version: 1
slug: "src-app-app-drawings-page-tsx"
primary_target: "src/app/(app)/drawings/page.tsx"
related_targets: ["src/app/(app)/drawings/new/page.tsx","src/app/(app)/drawings/[id]/page.tsx","src/components/drawings/drawing-editor.tsx","src/components/drawings/drawing-actions.tsx"]
---

# Little things sent by hand

- **Mode:** Operate
- **Audience/job:** Draw a small immutable note for the one other person in the space, send it once, and find every drawing either of you has sent.
- **Direction:** Inherit the Shared-Journal Thread: warm paper, deep-wine actions, serif titles. Drawings sit on soft pastel mats (blush, sage, cream) rotating by position; the canvas itself is always white paper with a `shadow-paper` edge.
- **History:** Newest-first grid, one column on phones, two on small screens, three on wide. Each card names the sender ("From you" / "From {partner}"), carries a `New` pill until the recipient opens it, and a relative time (`<time>` with the absolute instant as its title). Twenty-five per page with an explicit "Older drawings" link; no month separators, because two people rarely fill a page.
- **Editor:** A 640×480 canvas capped at 56dvh so the tools stay under the thumb on a phone. Nine icon tools with visible short labels from `sm` up, eleven preset swatches (no custom colour input), a size slider for stroke tools, undo/redo/clear as 44px icon buttons. Undo and redo share one bounded history. The draft autosaves to this device and flushes when the page is hidden; when storage is unavailable the label says so and offers "Save a copy". "Discard draft" is a two-step inline confirm. Keyboard drawing moves a visible cursor; shapes are anchored with one press and finished with a second, Escape cancels. Review hides the workspace rather than unmounting it; the preview is the exact PNG that will be sent. Send names the partner, disables while in flight, times out at 20 s, and refuses a file over 2 MB before upload. In the developer preview the editor mounts with sending disabled and says why.
- **Detail:** Eyebrow says "Sent to {partner}" or "From {partner}"; a `?sent=1` arrival shows a success status line. Relative and absolute time, "Draw back" (recipient) or "Draw another" (author) as the primary action, Download PNG and Share, and Newer/Older links through the couple's history. Finished drawings are never editable.
- **Home:** The most recent ready drawing appears as a thread card with a thumbnail, "Open drawing" and "Draw back".
- **Evidence:** In-app browser passes at desktop and 390 px are recorded in `docs/DRAWING_NOTES_VERIFICATION.md`; the Playwright journey in `tests/e2e/notes-drawings.spec.ts` is owed until browsers can run on the build machine.

## Revision - 2026-11-12 (Drawings list as a Cover screen)

The history opens with a band cover: "Drawings" and "Little things, drawn by hand". When the newest drawing is the partner's, a next-step block leads the sheet: thumbnail, "{partner} sent a drawing", when, and "Draw back". "Back and forth" follows as a grid of mats, two across on phones: the drawing on white at 4:3 and one line with who drew it and when, plus "New" on an unopened one. The mats are quiet blush in light and the card colour in dark; the three pastel mats, the arrow and the separate date line are gone. Make a drawing floats on phones and sits on the band from tablet width. The editor and the drawing detail page are unchanged. Verified with fictional drawings on a temporary page (their images do not exist, so the paper showed empty); no real drawing was rendered.

## Revision - 2026-11-12 (Drawing editor from the "Drawing editor" mockup)

`/drawings/new` drops the page header and the two panels. A top bar replaces the phone header: a close button ("Close without sending"; the draft is kept), "For {partner}", and Send. The paper sits edge to edge on its raised field, then three quiet rows: the tools (44px squares, the chosen one filled rose), the eleven swatches (44px circles, the chosen one ringed in ink), and undo, redo, "Clear the page" with the size slider. One muted line says the draft is kept on this device. The mockup draws seven tools; the app keeps nine, so on a phone the row scrolls with a fade at the right edge, and from `sm` all nine sit in one row. Send opens the existing review (the exact PNG, "Ready for {partner}?", "Send to {partner}", "Keep drawing") under a back bar instead of sending at once, because a sent drawing cannot be revised. Changed on purpose: "Discard draft" is gone, since "Clear the page" does the same and can be undone; Send on a blank page says "The page is still blank" instead of opening review; visible tool labels, the "Your tools" and "Colors" headings and the size dot were dropped, as in the mockup.
