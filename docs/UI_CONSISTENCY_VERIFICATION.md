# UI consistency and design-system extraction — 2026-09-04

> Status update — 2026-09-05: the owner confirms manual testing of Phase 7, account creation, linking and sync. Keep current gallery changes; previous gallery follow-up is not an active task. Account lifecycle is on hold. Historical results below remain evidence for their date; outstanding implementation/automated checks are tracked in the [Release 2 backlog](release-2/BACKLOG.md) and [verification ledger](release-2/VERIFICATION.md), not claimed passed.

## Behavior

### Tokens

The radius scale documented in the design system is now a theme vocabulary: `rounded-control` (0.5rem), `rounded-navigation` (0.875rem), `rounded-panel` (1rem) and `rounded-surface` (1.25rem). The three named shadows are tokens too: `shadow-paper`, `shadow-action` and `shadow-marker`. Paper Ambient and Thread Marker carry a separate dark-mode definition, so depth stays visible on night paper instead of tinting a wine shadow that dark surfaces swallow. Action Tactile follows the wine token and needs no override; primary buttons now actually carry it, which the system documented but the code omitted.

### Extracted components

- **`PageHeader`** replaces eight hand-built page headers. It fixes one rule thickness, one heading scale per context (`display` for page indexes, `compact` for workspaces and narrow columns), one tracking value, and one lede measure and size.
- **`PairingNotice`** replaces five differently shaped unpaired panels, including Calendar's bare underlined sentence and Gallery's missing panel.
- **`EmptyState`** replaces the content-led empty blocks on Moments, Notifications and the bucket failure path.
- **`ThreadMarker`** replaces six inline copies of the thread-marker shadow, and gains a `muted` state for a step that is still an invitation rather than something the couple saved.
- **`InlineLink`** replaces the repeated compact wine text action and keeps its 44px height.

### Navigation

Gallery and Notifications were reachable only from Home; both are now navigation destinations. The sidebar lists Home alone, then three labelled groups following the product loop — Plan together, Keep together, Your account — and the phone More dialog carries the same groups. Plans no longer shares Calendar's icon; every destination has its own. `Lists` became a data field rather than an inline conditional.

### Shell and accessibility

A skip-to-content link precedes the sidebar and targets the `main` landmark. The sidebar scrolls independently at full viewport height so ten destinations cannot clip a short screen. The phone header is pinned. Bucket and Profile gained the entrance the other six pages already had.

### Calendar day markers

Day markers previously used raw `bg-amber-600` and `bg-emerald-600`, which the design system prohibits as unrelated bright accents, and plan/memory resolved to the same token in dark mode. Markers are now shape-first inside the warm palette: a wine circle for a plan, a rose square for a memory, a blush-ink diamond for a moment. The cell's accessible name lists the kinds present instead of only a count, and the off-ramp `text-[10px]` literal is gone.

### Naming

Interface copy is consolidated on **Moments**. The `/milestones` route, the `milestones` table, the `milestone` notification category and every server contract keep their names; users do not see them. Renamed surfaces: navigation, page titles and headings, the create form (`Moment name`, `Kind of moment`, `Feature this moment on Home`, `Save the moment`), Calendar and Home actions, the notification preference category, and the timeline landmark. The Notifications inbox maps the stored category to a reader label rather than rewriting stored data.

### Hierarchy

Home's seven-button quick-action stack — six of them outline or ghost, three duplicating navigation — became four creation actions with one dominant primary, plus Open gallery as a secondary text action. Calendar's four competing header buttons became one primary plus three inline links.

## Evidence

- Graphify's existing graph was queried for the database and navigation structure before cross-file inspection.
- The graph corpus was **not** refreshed. `graphify update` re-extracts code only and rebuilt a 1166-node graph against the curated 1368-node one, dropping all 41 migration files (`tree_sitter_sql` is not installed) and every documentation node. The curated graph was restored from the backup the same command wrote to `graphify-out/2026-09-04/`. A faithful refresh needs `pip install "graphifyy[sql]"` plus a semantic pass over `docs/`, so the graph is one commit stale on this change by deliberate choice.
- Impeccable context, craft floor, the extract and audit references, and the persisted `foundation-auth-home` surface brief were loaded before editing.
- Impeccable design detector: one finding before the pass (`text-[10px]` off the type ramp in the shared calendar), zero after.
- `npm run lint`, `npm run typecheck`, `npm run test` (53 tests, 10 files) and `npm run build` all pass. The production route table is unchanged at 33 routes.
- The built stylesheet was inspected directly: all six new utilities emit, and the dark-mode `--elevation-marker` / `--elevation-paper` overrides are present.
- In-app browser verification against a local dev server, reading computed styles rather than trusting screenshots. Confirmed: warm-paper canvas `#fbf7f3`; primary `#6f1730` carrying `0 10px 28px -16px` wine; radii resolving to 8px, 14px and 16px; active navigation on quiet blush at 44px; `h1` at 60px Iowan with -1.8px tracking; lede at 18px/32px and a 660px measure; populated thread markers shadowed and muted ones not; the skip link becoming a 129x44 wine control on focus; the `main` landmark present; ten sidebar destinations across three groups with zero duplicate icons.
- Dark mode: `--elevation-marker` resolves to `0 6px 20px -10px rgba(0,0,0,0.78)` and `--elevation-paper` to `0 24px 70px -38px rgba(0,0,0,0.72)`, so both shadows survive the theme the old hardcoded values disappeared into.
- The renamed create form was exercised end to end in the browser: a moment saved and redirected to its detail route, confirming the label rename did not break the action.
- Calendar markers verified on a real entry: the moment marker renders 8px at `rotate: 45deg` with an 11.31px box, and the cell name reads "Thursday, September 10, 2026, 1 entry: Moment". The marker container is `aria-hidden`.
- Responsive: 1440x900, 1280x860, 390x844, 375x812 and 320x720. No horizontal overflow at any width; five phone targets 61-72px wide and 64px tall with single-line labels at 320px; the More dialog holds six 48px destinations without scrolling and locks the body.
- Playwright specs were updated for the intentional copy change (`Moment name`, `Save the moment`, the `Moments` preference label). Home keeps its exact `Open gallery` link, so the gallery assertions still hold.
- Secret scan across 39 changed and added files: zero findings. `git diff --check` passes. No logging was added.

## Scope and remaining gates

**The Playwright browser suite did not run.** Playwright 1.62.1 has no browsers installed on this machine (`%LOCALAPPDATA%\ms-playwright` does not exist), so all 22 cases abort on a missing Chromium executable before any assertion. `npx playwright install chromium` is required and was not run because it downloads a browser binary. Port 3000 is also held by an unrelated project's dev server, so `playwright.config.ts` cannot start its own; the suite needs a free port or that server stopped. The in-app browser evidence above is real but is not a substitute for the 19-case regression, and the updated specs in `paired-journey.spec.ts` and `shared-calendar-media.spec.ts` are unexecuted.

No schema, policies, grants, database functions, ownership rules or server contracts changed. Migration application, reset and advisor verification are not applicable. Earlier clean-replay, overlapping-session, real-account pairing and attachment-integration obligations remain open and are not waived by this pass. No new database acceptance is claimed.

Deferred deliberately:

- `private.notify_milestone_created()` still writes the literal title `A milestone was added`. Renaming it is a `create or replace function` migration, outside this pass's agreed no-schema scope. The Notifications inbox maps the visible category to "Moment"; the stored title is unchanged and the developer fixture still mirrors it rather than diverging from production. Phase 7's notification audit or Phase 8's copy review should carry the rename.
- `DEFAULT_BUCKET_CATEGORIES` still contains a bucket theme named "Milestones". Renaming the default would leave existing rows on the old string and surface both values side by side in the category filter, so it was left alone; it is a bucket theme, not the shared timeline.

## Media rendering follow-up — 2026-09-04

### Why gallery photos did not appear

Traced against the live project (`SUPABASE_PROJECT_ID` from `.env.local`) rather than guessed. The backend was healthy throughout:

- `memory_media` holds one ready image with a derivative, one image at `state='failed'` with `error_code='processing_failed'`, and one ready video. The `shared_gallery` view already filters to `state='ready'`, so the failed row never reached the gallery.
- Storage grants and policies are correct: `authenticated` holds `USAGE` on `private`, `EXECUTE` on `can_access_memory_object` and `is_active_couple_member`, and the bucket policy admits both `storage_path` and `derivative_path`.
- The derivative is a valid 107,941-byte `image/jpeg`.
- Edge logs for the reported session show the entire chain returning 200, ending with the iPhone Safari user agent fetching the signed URL successfully. The bytes reached the browser.

The failure was client-side. The image tile made a **form control** the aspect-ratio box and the positioning context for a `fill` image. A form control sizes unreliably in that role; when its box collapses to zero height a `loading="lazy"` image never intersects the viewport, so the browser never requests it and the tile stays blank. The logs corroborate this: across a 24-second session the gallery re-queried `shared_gallery` six times and issued **no** image request at all, while the private `view` budget recorded a single request in 54 minutes.

### Fixes

- **`MediaTile`** is now the one photo/video tile. A plain element owns the aspect ratio and positioning; the control sits over it as a full-tile overlay, which also makes the whole tile a touch target instead of just its centre.
- The first visible tiles load eagerly (three in an entry strip, six in the gallery grid), so the top of every surface appears even where lazy loading misbehaves.
- Every tile has a warm shimmer while loading, fades in on load, and renders an explicit "Photo unavailable" state on error instead of failing silently. The viewer's large image gained the same treatment.
- A partner-sync refresh returning an identical window no longer replaces every tile.

### Interface enhancements

- Entry detail pages lead with a large photo spanning two columns, then the rest in a cluster; videos now join the strip with a play affordance and a duration badge rather than a bare "Play video" label.
- Photo and video counts read as language ("4 photos", "1 photo · 2 videos"), and an overflow line says how many more are in the full gallery.
- Memory cards carry a wine date, a Favorite chip, and tags as blush chips instead of a `·`-joined line.
- Unfinished uploads state what happened and what to do, rather than printing a raw state name.
- The gallery filter panel and its selects joined the named radius scale.

### Two further defects found and fixed

- `src/components/memories/detail.tsx` styled its delete affordance `text-destructive`, but the palette defines `--danger` and no `--destructive`. The utility resolved to nothing, so the most destructive control on the page rendered in ordinary body colour. It now uses the same `text-danger` treatment as the equivalent controls in plans and bucket lists.
- `src/components/entries/preview-cover.tsx` was dead code, imported nowhere, and has been removed.

### Verification

- `npm run lint`, `npm run typecheck`, `npm run test` (53) and `npm run build` all pass; the design detector reports nothing.
- Verified in a browser against a dev server by driving the real photo picker with four generated JPEGs through the genuine upload path, then reading computed layout. Entry detail: lead tile 346x346 with three 167x167 tiles, every container a `div`, every overlay control the full tile size, images reporting real `naturalWidth`, first three eager and the fourth lazy. Gallery: four 150x150 tiles at a 16px radius, all eager, all loaded. Dispatching an error event on a tile replaced it with the "Photo unavailable" state as intended.
- Checked at 1280x900 and 390x844 in light and dark.
- The original defect is a WebKit-specific collapse that Chromium does not reproduce, so the fix is structural rather than reproduced-then-confirmed locally. Confirmation on the reporting iPhone is still outstanding.
