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

## Revision - 2026-11-11 (Cover screen)

The list opens with a band cover: "Notes" in the 40px serif and "Letters to each other, and pages of your own". Rows are top-aligned: the writer's avatar for a shared note or a lock mark for a private one, a 17px title that may wrap, a two-line 14px excerpt, and "From {partner} / From you / Only you" with a short date (full time as the tooltip). An unopened partner note carries a rose "New" pill; the Private pill and the pinned visibility badge are gone. Write a note floats on phones and sits on the band from tablet width. The note itself (letter and journal page) is unchanged. Rows were verified with fictional notes on a temporary page because the developer preview has no notes; the hosted list was not rendered.

## Revision - 2026-11-12 (note page as a Cover screen)

The detail is a band with the corner back button, an accent "Shared note / Private note - date" label and the title in the 32px serif. The letter sits directly on the sheet: avatar, "From ... to ...", when it was written, the body on the note thread at 16px, and the writer's name signed in 24px serif italic. A private note leads with a lock and "Only you" and is unsigned. The reader of a partner's letter gets "Write back" (to the new-note form) and "Reply with a drawing"; the writer keeps Edit note and Delete note in the foot. The card paper, the journal tint and the Shared/Only you chip are gone. The mockup's "More options" button and "You read this just now" line were not built: the first has nothing to hold for a reader and the writer's actions stay in the foot, and the second is not something the app records. Verified with fictional notes on a temporary page; no hosted note was opened.
