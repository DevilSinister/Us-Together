# Bucket UI refinement — 2026-09-02

Preserves the user's Options-first bucket layout, in-place editor and category selection. This is a scoped interface refinement, not a new phase or visual redesign.

## Changes

- One Options dialog with Back navigation for create/manage, draft filters applied only after successful loading, and feedback beside the failed action.
- A direct first-list action, readable result counts, removable active filters and quieter view controls.
- Native modal background isolation, explicit Tab cycling, Escape and opener-focus restoration; pending writes cannot be dismissed.
- Mobile-readable fields and custom-category drafts preserved when switching back to existing categories.
- Visible Save controls and 44px step controls; phones keep checkbox, field, save and delete on one row while a hold-and-drag gesture reorders steps. Desktop also provides arrows and a drag handle.
- Shared editing markup and cross-platform Playwright startup while preserving local server reuse outside CI.

## Verification

Lint, typecheck, 28 unit tests and the production build pass. The full browser suite passes 7 tests with 1 intentional desktop skip for a mobile-only test. Coverage includes list/item CRUD, offline create/filter recovery, keyboard step reorder, plan/memory conversion, dialog focus and cancellation, 320px and 768px layout checks, dark mode and reduced motion. Desktop/mobile screenshots were visually inspected; Impeccable's single completed-surface scan returned no findings.

Browser tests use the existing fictional server-side paired preview, not real-account authentication. The in-app browser cannot initialize its Windows sandbox, so standalone Playwright provided the verification. No migration, policy, RPC or ownership boundary changed; database replay/advisors and real-pairing gates retain their status in [Phase 4 verification](PHASE4_VERIFICATION.md). No new database acceptance claim is made by this UI change.
