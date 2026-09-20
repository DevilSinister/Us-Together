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
