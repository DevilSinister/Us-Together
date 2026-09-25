# Master Prompt Traceability

## Purpose

This matrix maps every numbered section of the source master prompt to its canonical specification, delivery release/phase, and verification. “Later” means intentionally deferred, not forgotten. Phase numbers refer to [Implementation Plan](IMPLEMENTATION_PLAN.md).

| # | Requirement | Canonical specification | Delivery | Verification |
| ---: | --- | --- | --- | --- |
| 1 | Product vision | [Product](../PRODUCT.md), [Design Brief](DESIGN_BRIEF.md) | All | Product/design review |
| 2 | Incremental development rule | [Implementation Plan](IMPLEMENTATION_PLAN.md), [Agents](../AGENTS.md) | Every phase | Completion gate |
| 3 | Technology stack | [Architecture](../ARCHITECTURE.md), [Setup](SETUP.md) | Phase 1 | Install, types, build |
| 4 | Multi-tenant architecture | [Architecture](../ARCHITECTURE.md), [Database](DATABASE.md) | Phases 1–2 | RLS matrix |
| 5 | Users/profiles | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 1 | Auth/profile tests |
| 6 | Couples/members | [Database](DATABASE.md), [Features](FEATURES.md) | Phase 2, lifecycle implemented | Capacity/leave/delete pgTAP; concurrency gate open |
| 7 | Invite link and six-digit code | [Features](FEATURES.md), [Security](SECURITY.md) | Phase 2, hardened | Attempt-limit/revoke/used-code pgTAP; local execution pending runtime |
| 8 | Onboarding | [UX Flows](UX_FLOWS.md), [Design Brief](DESIGN_BRIEF.md) | Phase 2 | Paired/solo fixture and desktop/mobile browser tests; real-account journey open |
| 9 | Navigation | [Design Brief](DESIGN_BRIEF.md), [Design System](../DESIGN.md) | Phase 1 plus mobile and consistency follow-ups | Five destinations, More keyboard/destination checks and 320px–767px browser coverage; grouped sidebar reaching every route including Gallery and Notifications, per-destination icons and a skip-to-content link; [mobile verification](MOBILE_LISTS_VERIFICATION.md), [consistency verification](UI_CONSISTENCY_VERIFICATION.md) |
| 10 | Home dashboard | [Features](FEATURES.md), [Design Brief](DESIGN_BRIEF.md) | Phase 3, implemented | Empty/populated/mixed-privacy and two-timezone unit cases; paired desktop/mobile browser journey |
| 11 | Plans/date planner | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 5 implemented | Full CRUD/calendar/checklist/reminder browser flow; hosted 40-assertion suite; [integration boundaries](PHASE5_VERIFICATION.md) |
| 12 | Plan details/checklist | [Features](FEATURES.md), [API Contracts](API_CONTRACTS.md) | Phase 5 implemented | Versioned checklist CRUD/reorder, details, map/budget persistence; keyboard/reduced-motion browser coverage |
| 13 | Calendar views | [Features](FEATURES.md), [Design Brief](DESIGN_BRIEF.md) | Phase 5 implemented | Month/week/upcoming, multi-day timezone and DST tests; desktop/mobile calendar journey |
| 14 | Google Calendar | [Google Calendar](GOOGLE_CALENDAR.md) | R2 | OAuth/privacy suite |
| 15 | Bucket lists/items | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 4 implemented | Hosted 33-assertion RLS suite; desktop/mobile CRUD/filter journey; [Options/edit refinement](BUCKET_UI_REFINEMENT.md); [list-first flow](MOBILE_LISTS_VERIFICATION.md) with scoped creation and back navigation |
| 16 | Bucket subtasks | [Features](FEATURES.md), [API Contracts](API_CONTRACTS.md) | Phase 4 implemented | Keyboard reorder/progress; 320px/tablet editing targets; hosted stale-version rejection; overlapping-session timing open |
| 17 | Bucket to plan | [UX Flows](UX_FLOWS.md), [API Contracts](API_CONTRACTS.md) | Phases 4–5 | Source-locking conversion, retry uniqueness and desktop/mobile handoff verified |
| 18 | Bucket to memory | [UX Flows](UX_FLOWS.md), [Features](FEATURES.md) | Phase 4 story conversion; Phase 6 media | Completed-bucket conversion/retry verified; Phase 6 authenticated media upload/view/removal verified |
| 19 | Wishlist | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 7 implemented | Owner reads and mutates, partner reads only; former member and cross-couple denial; owner and space immutable. Manual image deferred. [Verification](PHASE7_VERIFICATION.md) |
| 20 | Secret purchases | [Security](SECURITY.md), [Database](DATABASE.md) | Phase 7 implemented | Owner denied by id, item id, join, status count and instant aggregate; cannot plant a probe row; item delete cascades without a restrict error. [Verification](PHASE7_VERIFICATION.md) |
| 21 | Product links/manual entry | [Features](FEATURES.md) | Phase 7 implemented | https-only product URL enforced in Zod and a column check; no page is fetched or scraped; unit tests reject http and javascript schemes |
| 22 | Know Me | [Features](FEATURES.md) | R2 | Visibility/UX tests |
| 23 | Optional sizes | [Database](DATABASE.md), [Security](SECURITY.md) | R2 | Partner/private RLS |
| 24 | Notes/letters | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 7 shared and private implemented; advanced types R2 | Shared reaches both members, private only its author; plain-text rendering; per-user read state; attachments deferred. [Verification](PHASE7_VERIFICATION.md) |
| 25 | Private notes | [Security](SECURITY.md) | Phase 7 implemented | Partner denied by id and by content probe; no notification for a private note; withdrawing sharing withdraws the partner notification. [Verification](PHASE7_VERIFICATION.md) |
| 26 | Surprise notes | [Features](FEATURES.md), [Security](SECURITY.md) | R2 | Pre-reveal non-disclosure |
| 27 | Scheduled notes/timezones | [Features](FEATURES.md), [Operations](OPERATIONS.md) | R2 | Timing/idempotency |
| 28 | Open-when letters | [Features](FEATURES.md), [UX Flows](UX_FLOWS.md) | R2 | Eligibility/read tests |
| 29 | Memories | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 6 implemented | Detail/edit/delete, free place selection without manual coordinates, normalized tags, rating/favorite, cursor gallery; 42 hosted RLS assertions and browser journeys |
| 30 | Memory media | [Database](DATABASE.md), [Security](SECURITY.md) | Phase 6 implemented | Authenticated TUS, signature/container checks, derivatives, signed viewer, recovery/cleanup; 34 hosted binary checks and desktop/mobile signed-in tests |
| 31 | Our Story timeline | [Features](FEATURES.md) | R2 | Visibility/projection tests |
| 32 | Milestones | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 3 basic create/list/feature implemented; richer R2 | Negative RLS specification, generated types, create/list browser journey; interface copy consolidated on “Moments” with the `/milestones` route and table names unchanged ([consistency verification](UI_CONSISTENCY_VERIFICATION.md)); edit/delete UI remains later |
| 33 | Vault purpose | [Vault](VAULT.md) | R2 | Threat-model gate |
| 34 | PIN/passkey/auto-lock | [Vault](VAULT.md) | R2 | Unlock/timeout tests |
| 35 | Private vault storage | [Vault](VAULT.md), [Security](SECURITY.md) | R2 | URL/storage negatives |
| 36 | Vault encryption boundary | [Vault](VAULT.md), [Decisions](DECISIONS.md) | R2/Later | Claim/security review |
| 37 | File upload security | [Security](SECURITY.md), [API Contracts](API_CONTRACTS.md) | Phase 5 plan attachments; Phase 6 memory media/R2 | Plan signature/size and path authorization verified; memory binary round trip verified with 34 hosted checks; plan binary round trip remains integration |
| 38 | In-app notifications | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 3 foundation implemented | Generic-envelope trigger, recipient/membership RLS, preference suppression pgTAP specification, browser read/preferences journey |
| 39 | Push notifications | [Features](FEATURES.md) | R2 | Opt-in/secret exclusion |
| 40 | Couple activity feed | [Features](FEATURES.md), [Security](SECURITY.md) | R2 candidate | Inference tests before enablement |
| 41 | Rule-based date generator | [Features](FEATURES.md) | Later | Input/output/conversion tests |
| 42 | Couple questions/reveal | [Features](FEATURES.md) | Later | Atomic reveal/RLS tests |
| 43 | Future AI | [Product](../PRODUCT.md), [Architecture](../ARCHITECTURE.md) | Later | Consent/eval/provider ADR |
| 44 | Design system direction | [Design Brief](DESIGN_BRIEF.md), [Decisions](DECISIONS.md) | Phase 1 onward | Impeccable verification |
| 45 | Dark mode | [Design Brief](DESIGN_BRIEF.md) | Phase 1 | Contrast/system tests |
| 46 | Animation/reduced motion | [Design Brief](DESIGN_BRIEF.md) | All UI phases | Reduced-motion review |
| 47 | Responsive design | [Design Brief](DESIGN_BRIEF.md), [Testing](TESTING.md) | All UI phases | Mobile/desktop E2E |
| 48 | Accessibility | [Design Brief](DESIGN_BRIEF.md), [Testing](TESTING.md) | Every phase | WCAG 2.2 AA checks; bucket dialog Tab loop, Escape/focus return, labeled controls and reduced-motion browser checks |
| 49 | Security controls | [Security](SECURITY.md) | Every phase | Threat/negative suites |
| 50 | Environment variables | [Setup](SETUP.md), [Deployment](DEPLOYMENT.md) | Phase 1/R2 | Env validation/secret scan |
| 51 | Error handling | [UX Flows](UX_FLOWS.md), [Design Brief](DESIGN_BRIEF.md) | Every feature | Failure-state tests |
| 52 | Empty states | [Design Brief](DESIGN_BRIEF.md), [Features](FEATURES.md) | Every feature | First-run/empty tests |
| 53 | Global search | [Features](FEATURES.md), [Security](SECURITY.md) | R2 | Source-equivalent RLS |
| 54 | Export/delete/leave | [UX Flows](UX_FLOWS.md), [Operations](OPERATIONS.md), [Decisions](DECISIONS.md) | Leave/empty-delete implemented; account/export on hold, [R2-01](release-2/BACKLOG.md) | Lifecycle pgTAP and confirmation UI; full account workflow open |
| 55 | Audit logging | [Security](SECURITY.md), [Operations](OPERATIONS.md) | MVP/R2 | Redaction/retention review |
| 56 | Migrations/indexes/FKs | [Database](DATABASE.md), [Setup](SETUP.md) | Every data phase | Reset/list/advisors |
| 57 | RLS requirements | [Database](DATABASE.md), [Security](SECURITY.md) | Every data phase | Full RLS matrix |
| 58 | Testing domains | [Testing](TESTING.md) | Every phase | Required commands |
| 59 | Seed data | [Setup](SETUP.md) | Phase 1 onward | Deterministic reset |
| 60 | Project structure | [Architecture](../ARCHITECTURE.md), [Implementation Plan](IMPLEMENTATION_PLAN.md) | Phase 1 | Architecture review |
| 61 | Server actions/API | [API Contracts](API_CONTRACTS.md) | Each domain phase | Contract/integration tests |
| 62 | Reusable components | [Design Brief](DESIGN_BRIEF.md) | UI phases | Visual/component review |
| 63 | Performance | [Testing](TESTING.md), [Operations](OPERATIONS.md) | Every phase | Plans/bundles/Web Vitals |
| 64 | Media thumbnails/lazy viewers | [Features](FEATURES.md), [Security](SECURITY.md) | Phase 6 implemented; R2 vault separate | Decoded image previews, lazy images, deferred native video loading, desktop/mobile viewer tests |
| 65 | Selective Realtime | [Architecture](../ARCHITECTURE.md), [Features](FEATURES.md) | R2 | Channel/privacy tests |
| 66 | Onboarding personalization | [UX Flows](UX_FLOWS.md) | Phase 2 | Skip/first-run tests |
| 67 | Home personalization | [Features](FEATURES.md) | Phase 3, implemented | Stable relevance selector and no private/secret inference tests |
| 68 | Connected product flows | [Product](../PRODUCT.md), [UX Flows](UX_FLOWS.md) | MVP onward | End-to-end journey |
| 69 | Settings | [Features](FEATURES.md), [UX Flows](UX_FLOWS.md) | MVP/R2 | Auth/destructive tests |
| 70 | First-run experience | [UX Flows](UX_FLOWS.md), [Design Brief](DESIGN_BRIEF.md) | Phase 2–3 | Activation browser test |
| 71 | Warm copywriting | [Design Brief](DESIGN_BRIEF.md), [Product](../PRODUCT.md) | Every UI phase | Content review |
| 72 | Responsive dashboard example | [Design Brief](DESIGN_BRIEF.md) | Phase 3, implemented | Desktop/mobile Playwright, reduced motion, overflow and keyboard focus; Impeccable detector clean |
| 73 | Consumer quality bar | [Agents](../AGENTS.md), [Testing](TESTING.md) | Every phase | Phase/release gates |
| 74 | Phased development | [Implementation Plan](IMPLEMENTATION_PLAN.md) | All | Completion evidence |
| 75 | Required documentation | [README](../README.md) and all linked docs | Phase 0 onward | Link/existence check |
| 76 | Code quality | [Agents](../AGENTS.md) | Every phase | Lint/types/review |
| 77 | Final validation commands | [Testing](TESTING.md), [Agents](../AGENTS.md) | Release | Release checklist |
| 78 | Seven security scenarios | [Security](SECURITY.md), [Testing](TESTING.md) | Relevant phases | Mandatory negatives |
| 79 | Avoid overengineering | [Product](../PRODUCT.md), [Decisions](DECISIONS.md) | All | Architecture review |
| 80 | V2–V4 roadmap | [Features](FEATURES.md), [Implementation Plan](IMPLEMENTATION_PLAN.md) | R2/Later | Roadmap review |
| 81 | Final priorities/handoff | [Product](../PRODUCT.md), [Agents](../AGENTS.md) | Every phase/release | Completion report |

## Coverage gate

A source requirement is covered only when its canonical specification contains behavior and its delivery row names a verification method. Implementation changes must update this matrix if a requirement moves release, changes ownership/visibility, or gains/loses a test gate.

| Extension | User request | Implementation | Verification |
| --- | --- | --- | --- |
| Shared Calendar | Memories/moments alongside plans; Home access | /calendar, three-source bounded loader, month/week/filter/day agenda, Home/nav links | Desktop/mobile shared-entry journeys |
| Visible multiple photos | New memory/moment picker and preview uploads | PhotoPicker, EntryUploader, MediaCollection; IndexedDB preview; separate private moment bucket | Preview photo/caption/comment persistence; 26 hosted moment integration checks |
| Comments/captions | Shared comments and photo descriptions | Caption Edge mutation; entry_comments RLS; author-only removal | 36 new rollback-only RLS checks and actual partner/foreign-account checks |
| Plan-only reminders | Remove reminders from memories/moments | Entry UI/actions/polling removed, cron unscheduled, worker inert, client grants revoked; Plans unchanged | Gallery RLS retirement assertions and existing plan browser journey |
| Free locations | No paid Places API | Photon/OpenStreetMap, explicit nearby lookup, no stored coordinates | Live search and geolocation browser checks on desktop/mobile |

| Gallery follow-up | Requested behavior | Implementation | Verification |
| --- | --- | --- | --- |
| Six-photo previews | Six images per entry on Memories/Moments listings and details | Lazy EntryPreview and MediaCollection; Show more routes to scoped Gallery; touch swipe and keyboard viewer | Desktop/mobile seven-photo listing, swipe, scoped gallery and file-comment journey |
| Home gallery | Browse all files by memory or date | /gallery, Home link, shared_gallery invoker view, 48-file cursor, filters | Desktop/mobile grouping, media/date filters; foreign/former/anon RLS |
| File conversations | Caption and partner comments on each photo/video | Shared MediaViewer and media_comments; IndexedDB equivalent in preview | Per-file isolation, cross-gallery persistence, partner author rules, cascade and quota checks |

## Owner-directed release transition — 2026-09-05

| Requirement | Current disposition | Evidence / next reference |
| --- | --- | --- |
| Phase 7 and account/link/sync flows | Implemented, owner-manually-tested | [Verification ledger](release-2/VERIFICATION.md); automated coverage remains R2-08 |
| Account lifecycle completion | On hold; explicit resume required | [R2-01](release-2/BACKLOG.md) |
| Current gallery | Preserve; no active repair | Owner believes prior issue probably fixed; no new device result claimed |
| Implementation and verification carryovers | Deferred to Release 2 | [Backlog](release-2/BACKLOG.md) |
| Every location-bearing feature | OpenStreetMap-based services; reuse Photon | [Location policy](release-2/LOCATION_POLICY.md) |

## User-directed drawing note extension — 2026-09-16

The new owner request extends row 24 (notes) and row 39 (push). Source routes `/drawings`, `/drawings/new`, `/drawings/[id]`, the drawing APIs, private Storage migration and `android-widget/` implement the approved fixed-card editor and latest-received Android widget. Unit/type/lint/build evidence, applied hosted migrations, live paired browser acceptance and outstanding negative RLS/native device gates are recorded in [Drawing Notes Verification](DRAWING_NOTES_VERIFICATION.md). Existing editable text notes remain Phase 7 behavior.

## 2026-09-17 drawing workspace revision

Owner request: Drawings is now a separate navigation destination from Notes. `/drawings/new` shows the canvas before eight icon-only drawing tools, eleven preset colors, a 1–12 stroke size slider, compact undo/redo/clear controls, and review-confirmed send. Icon names remain available to assistive technology and tooltips. The drawing history and detail use pastel paper framing. The private note API, migration and Android package are unchanged. Desktop and mobile authenticated Chromium checks are recorded in [Drawing Notes Verification](DRAWING_NOTES_VERIFICATION.md).

## 2026-09-17 Android offline owner direction

The owner requires every current feature in one offline-capable APK with later Supabase sync. [The Android migration plan](ANDROID_OFFLINE_MIGRATION.md) maps the product areas and release gate. Current implementation covers only native sign-in, widget refresh, a native Home-to-cached-drawing path and offline viewing of the last authorized image. The web editor adds a distinct airbrush and differentiated pencil, marker and highlighter strokes. Full native feature parity, offline writes and sync are open.

## 2026-09-17 native Android direction

The owner replaced the webapp target with a native Android APK covering every existing feature. Android Home now opens a native nine-tool drawing editor and the cached received drawing. Drafts persist locally; a per-account queue retries immutable drawing sends through the existing Supabase RLS and private Storage contract. This is source-implemented and compiles, but has no device or two-account send acceptance yet. All other native features and general offline synchronization remain open under [Android offline migration](ANDROID_OFFLINE_MIGRATION.md).
## 2026-09-17 partner activity notifications

| Requirement | Source | Verification |
| --- | --- | --- |
| Shared additions and edits | `20260917144048_partner_activity_notifications.sql`, inbox/preferences, push map | Typecheck, lint, unit suite, build; hosted migration applied and metadata/advisors checked; negative RLS pending |
| Photos and attachments only when ready | Media and attachment transition triggers | Source review; live transition test pending |
| Private content remains silent | No trigger on purchase secrets or private notes; fixed strings | Source review; negative RLS test pending |
| Native inbox with offline read | `NotificationActivity.java`, `DrawingApi.java` | Android assembly/lint pass; device test pending |

## 2026-09-17 web privacy locks

| Requirement | Source | Verification |
| --- | --- | --- |
| Code or supported device unlock for Gallery | `src/app/(app)/gallery/layout.tsx`, `src/components/privacy/`, `src/lib/privacy/device-unlock.ts` | lint, typecheck, 93 tests, build pass; live browser/device check open |
| Selectable locks in Settings | `/privacy`, account navigation, validated server actions | Source gates pass; authenticated desktop/mobile check open |
| Direct data and Storage enforcement | `20260917150133_app_section_locks.sql` | Hosted migration and policy/function readback pass; isolated negative RLS suite open |

## 2026-09-17 PIN screen refinement

| Requirement | Source | Verification |
| --- | --- | --- |
| Heart-button PIN entry for locked sections | `src/components/privacy/pin-pad.tsx`, `unlock-panel.tsx` | Lint/typecheck/build pass; desktop/mobile temporary-preview visual, keypad, keyboard and reduced-motion checks pass; signed-in acceptance open |
| Create and confirm 4/6-digit PIN | `privacy-settings.tsx`, Zod boundary and SQL configure | 95 unit tests pass; hosted migration applied; isolated RLS attempted, no local Postgres connection |
| Current PIN, new PIN, confirmation to change | `changePrivacyPin`, `app_lock_change_code` | Hosted RPC grants/ledger checked; negative SQL test authored but not run locally |

Local `npm run test:rls` exited before assertions because Postgres at 127.0.0.1:54322 refused the connection; the isolated negative suite remains open.

## Memories index refinement — 2026-09-17

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Date-categorized title-only Memories list; open full memory for media and comments | `/memories` uses grouped rows in `src/components/memories/gallery.tsx`; each row links to `/memories/[id]` where the existing detail view renders media and comments | Typecheck, lint, 95 unit tests and production build passed. Focused desktop/mobile Playwright journey was attempted but timed out at the pre-existing paired-preview sign-in control before reaching the list. Schema/RLS and Android gates do not apply to this presentation-only change. |

## Update on push — 2026-09-25

| Requirement | Implementation | Verification |
| --- | --- | --- |
| A push to GitHub makes the open app offer the new web version and apply it | `src/app/api/version/route.ts`, `src/lib/app-version.ts`, `src/components/providers/update-prompt.tsx` mounted in `src/app/layout.tsx`; `NEXT_PUBLIC_APP_VERSION` in `next.config.ts`; proxy matcher skips `/api/version` | 7 new unit cases in `src/lib/app-version.test.ts`; lint, typecheck, 187 unit tests and production build passed. Production server on port 3100: `/api/version` returned the inlined SHA with `no-store` and no `Set-Cookie`; a simulated newer deployment showed the prompt after one poll, *Later* hid it, a client-side `router.push` then replaced the document while the same push with no update kept it; the prompt fits a 375 px viewport with no horizontal overflow. Not verified against a real Vercel deploy. |
| A push that changes the Android app offers the update in the installed APK and installs it | `.github/workflows/android-release.yml`, `android-widget/publish-release-secrets.ps1`; `AppLauncherActivity`, `AppUpdates`, `ReleaseInfo`, `UpdateActivity`, `UpdateCheckJob`, `UpdateInstallReceiver`; `REQUEST_INSTALL_PACKAGES` | 6 JVM cases in `ReleaseInfoTest`; `:app:assembleDebug :app:lintDebug :app:testDebugUnitTest` passed with no new lint warnings. The release workflow has not run (repository secrets not yet set) and the download/install flow has not run on a device. |


## Foot actions, confirm-delete and bucket organization — 2026-09-25

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Memory rows are one line | `src/components/memories/gallery.tsx`: title and story `truncate`; `block` no longer defeats `line-clamp` | In-app browser, 375px: title and story each measure one line with ellipsis |
| Edit and Delete at the bottom of every detail page | `src/components/app/entry-actions.tsx` on memory, note, plan, wish and bucket-idea pages | In-app browser: memory, plan and idea feet rendered; note and wish need a connected account and were not rendered |
| Delete behind a confirmation modal everywhere | `src/components/ui/confirm-delete.tsx`; used for memories, notes, plans, wishes, ideas, lists, comments, gallery files, plan attachments, gift plans | Keyboard: Enter opens, focus on Keep it, Tab to Delete, Escape closes, focus returns to trigger; plan deletion ran end to end in preview with pending state |
| Bucket ideas separated by status; Organize by status, category or priority | `src/lib/bucket/grouping.ts` (7 unit tests), `src/components/bucket/idea-tile.tsx`, `bucket-workspace.tsx` | Unit tests; in-app browser status/category/priority grouping, persistence and no overflow at 375px; desktop two-column grid |
| Plan a bucket-list idea from the new-plan page | `src/app/(app)/plans/new/page.tsx`, `loadPlannableIdeas` in `src/lib/bucket/data.ts`, `PlanForm` `source` | In-app browser: idea prefilled title, kind (Trip), date, budget, currency, story; saved plan linked; map link hidden |
| Notes with more character | `src/app/(app)/notes/page.tsx` (author avatars, serif excerpts), `notes/[id]/page.tsx` (letter vs journal page, signature) | Lint, typecheck and build only; the developer preview has no notes, so no visual check ran |
| No form puts its fields in the URL before hydration | `method="post"` on all 17 script-handled forms; `src/lib/forms-guard.test.ts` fails on any `<form>` without `action` or `method` | Guard failed before the fix and passes after; in the in-app browser a native `form.submit()` on `/bucket/new` sent a POST and left the probe title out of the URL |
| A memory without photos gets a warm placeholder | `MemoryMonogram` in `src/components/memories/gallery.tsx`; `src/lib/memories/initial.ts` (2 unit tests) | In-app browser: a photo-less memory shows its serif initial on blush |
