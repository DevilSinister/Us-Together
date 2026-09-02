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
| 9 | Navigation | [Design Brief](DESIGN_BRIEF.md) | Phase 1 | Responsive browser tests |
| 10 | Home dashboard | [Features](FEATURES.md), [Design Brief](DESIGN_BRIEF.md) | Phase 3, implemented | Empty/populated/mixed-privacy and two-timezone unit cases; paired desktop/mobile browser journey |
| 11 | Plans/date planner | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 5 implemented | Full CRUD/calendar/checklist/reminder browser flow; hosted 40-assertion suite; [integration boundaries](PHASE5_VERIFICATION.md) |
| 12 | Plan details/checklist | [Features](FEATURES.md), [API Contracts](API_CONTRACTS.md) | Phase 5 implemented | Versioned checklist CRUD/reorder, details, map/budget persistence; keyboard/reduced-motion browser coverage |
| 13 | Calendar views | [Features](FEATURES.md), [Design Brief](DESIGN_BRIEF.md) | Phase 5 implemented | Month/week/upcoming, multi-day timezone and DST tests; desktop/mobile calendar journey |
| 14 | Google Calendar | [Google Calendar](GOOGLE_CALENDAR.md) | R2 | OAuth/privacy suite |
| 15 | Bucket lists/items | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 4 implemented | Hosted 33-assertion RLS suite; desktop/mobile CRUD/filter journey; [Options/edit refinement](BUCKET_UI_REFINEMENT.md) |
| 16 | Bucket subtasks | [Features](FEATURES.md), [API Contracts](API_CONTRACTS.md) | Phase 4 implemented | Keyboard reorder/progress; 320px/tablet editing targets; hosted stale-version rejection; overlapping-session timing open |
| 17 | Bucket to plan | [UX Flows](UX_FLOWS.md), [API Contracts](API_CONTRACTS.md) | Phases 4–5 | Source-locking conversion, retry uniqueness and desktop/mobile handoff verified |
| 18 | Bucket to memory | [UX Flows](UX_FLOWS.md), [Features](FEATURES.md) | Phase 4 story conversion; Phase 6 media | Completed-bucket conversion/retry verified; Phase 6 authenticated media upload/view/removal verified |
| 19 | Wishlist | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 7 | Owner/partner matrix |
| 20 | Secret purchases | [Security](SECURITY.md), [Database](DATABASE.md) | Phase 7 | Non-inference suite |
| 21 | Product links/manual entry | [Features](FEATURES.md) | Phase 7 | URL/input validation |
| 22 | Know Me | [Features](FEATURES.md) | R2 | Visibility/UX tests |
| 23 | Optional sizes | [Database](DATABASE.md), [Security](SECURITY.md) | R2 | Partner/private RLS |
| 24 | Notes/letters | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 7/R2 | Type visibility matrix |
| 25 | Private notes | [Security](SECURITY.md) | Phase 7 | Mandatory negative #2 |
| 26 | Surprise notes | [Features](FEATURES.md), [Security](SECURITY.md) | R2 | Pre-reveal non-disclosure |
| 27 | Scheduled notes/timezones | [Features](FEATURES.md), [Operations](OPERATIONS.md) | R2 | Timing/idempotency |
| 28 | Open-when letters | [Features](FEATURES.md), [UX Flows](UX_FLOWS.md) | R2 | Eligibility/read tests |
| 29 | Memories | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 6 implemented | Detail/edit/delete, free place selection without manual coordinates, normalized tags, rating/favorite, cursor gallery; 42 hosted RLS assertions and browser journeys |
| 30 | Memory media | [Database](DATABASE.md), [Security](SECURITY.md) | Phase 6 implemented | Authenticated TUS, signature/container checks, derivatives, signed viewer, recovery/cleanup; 34 hosted binary checks and desktop/mobile signed-in tests |
| 31 | Our Story timeline | [Features](FEATURES.md) | R2 | Visibility/projection tests |
| 32 | Milestones | [Features](FEATURES.md), [Database](DATABASE.md) | Phase 3 basic create/list/feature implemented; richer R2 | Negative RLS specification, generated types, create/list browser journey; edit/delete UI remains later |
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
| 54 | Export/delete/leave | [UX Flows](UX_FLOWS.md), [Operations](OPERATIONS.md), [Decisions](DECISIONS.md) | Leave/empty-delete implemented; account/export Phase 8 | Lifecycle pgTAP and confirmation UI; full account workflow open |
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
