---
version: 1
slug: "src-app-app-notes-page-tsx"
primary_target: "src/app/(app)/notes/page.tsx"
related_targets: ["src/app/(app)/notes/new/page.tsx","src/app/(app)/notes/[id]/page.tsx","src/app/(app)/notes/[id]/edit/page.tsx","src/components/notes/note-form.tsx","src/components/notes/delete-note.tsx"]
---

# Words worth keeping

- **Mode:** Operate
- **Audience/job:** Write something shared or something private, know at a glance which is which and what is new, and read a partner's note as plain text exactly as typed.
- **Direction:** Inherit the Shared-Journal Thread: reading list with fine rules, serif titles, wine accents. The list stays content-led; the detail is now a letter or journal page (2026-09-25, owner asked for more character).
- **List:** Newest-updated first, twenty-five per page with an explicit "Older notes" link. Each row shows the visibility icon, the title, a `Private` pill or a `New` pill (shared partner notes not yet opened), the author by name ("You" / "{partner}"), a relative time with the absolute instant as its title, and a two-line excerpt. Read state is looked up only for the notes on the page and is recorded insert-only when a shared note is opened.
- **Form:** Shared/Private radio cards lead. Title and body are controlled fields with live counters against 160 and 20,000 characters that turn to the danger colour past 90 percent; the server still trims and validates. Leaving with unsaved words triggers the browser's own prompt and the footer says "Unsaved changes". When editing a shared note, the Private card explains that switching withdraws the partner's inbox line. Plain text only, stated under the body.
- **Detail:** Eyebrow "You wrote this" or "From {partner}"; visibility and relative time; the body in `whitespace-pre-wrap`. A received shared note offers "Reply with a drawing". The author sees Edit note and Delete note in the foot row; Delete opens the shared confirmation dialog.
- **Evidence:** In-app browser passes are recorded in `docs/DRAWING_NOTES_VERIFICATION.md`; the Playwright journey in `tests/e2e/notes-drawings.spec.ts` is owed until browsers can run on the build machine.

## Revision — 2026-09-25

List rows lead with the author's avatar and a small shared/private badge pinned to it; the title is one line and the excerpt is two lines of serif italic. The detail reads as what the note is: a shared note is a letter on card paper with the paper shadow, the author's face and "From … to …" at the head, the body on the note thread, and the author's name signed in serif italic at the foot. A private note is a flat muted journal page with an "Only you" seal. Evidence: lint, typecheck and build only. The developer preview has no notes, so this surface still needs a signed-in visual check.
