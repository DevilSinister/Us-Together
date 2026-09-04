---
version: 1
slug: "src-app-app-bucket-page-tsx"
primary_target: "src/app/(app)/bucket/page.tsx"
related_targets: ["src/app/(app)/bucket/new/page.tsx","src/app/(app)/bucket/[id]/page.tsx","src/components/bucket/item-detail.tsx"]
---

# Bucket lists continuity

- **Mode:** Operate; an extension of the verified Shared-Journal Thread, not a new visual world.
- **THESIS:** An idea becomes achievable through small shared steps and carries its history into a plan or memory.
- **OWN-WORLD:** Warm paper, wine actions, serif story headings, quiet dividers and spacious readable rows from DESIGN.md.
- **STORY:** Choose a list, keep an idea, make progress, then preserve the experience.
- **FIRST VIEWPORT:** The landing page shows named lists and Add list; an opened list shows its title and Add idea; item detail prioritizes the idea and Plan this/Mark complete actions.
- **FORM:** Use a list-first landing page with linked rows and direct Add list. Each list opens its own paginated ideas route with Add idea preselected to that list and All lists navigation. Preserve the in-place idea editor. Options contains filters and list management with explicit Back navigation; filter resets stay within the opened list. Applied filters have removable chips; first-run has a direct create-list action. Mobile keeps bottom navigation and one concise step row; hold-and-drag reorders a step, while desktop retains arrows and a drag handle. No replacement visual world is introduced.
- **Constraints:** Real server actions, membership/RLS authority, bounded pages, keyboard up/down controls, 44px checkbox targets, no private text in filter URLs, visible stale-save errors, honest preview limits.
- **Memorable moment:** “One more dream lived.” leads to a memory without making memory creation a prerequisite for completion.
- **Evidence:** Desktop/mobile Playwright screenshots, 320px/tablet layouts, keyboard containment/return, draft cancellation, dark mode and offline-retry regression. The existing hosted 33-assertion negative suite is unchanged. See docs/PHASE4_VERIFICATION.md for database boundaries and docs/BUCKET_UI_REFINEMENT.md for the UI follow-up.
