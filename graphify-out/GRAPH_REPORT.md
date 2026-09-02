# Graph Report - D:\Projects\Uss  (2026-09-02)

## Corpus Check
- 224 files · ~96,359 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1368 nodes · 2609 edges · 112 communities (82 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.84)
- Token cost: 1,900 input · 2,507 output

## Community Hubs (Navigation)
- components.json
- next-env.d.ts
- next.config.ts
- package.json
- scripts
- dependencies
- lucide-react
- bucket-workspace.tsx
- devDependencies
- imagescript
- supabase
- vitest
- postcss.config.mjs
- sw.js
- button.tsx
- planContext()
- createServerSupabaseClient()
- memories/data.ts
- auth.ts
- Memory media operations
- app/layout.tsx
- model.ts
- media.ts
- database.types.ts
- 20260831224609_foundation_profiles.sql
- 20260831234512_onboarding_couples.sql
- public.profiles
- 20260901024653_plans_memories.sql
- public.plan_checklist_items
- public.plan_reminders
- 20260901112427_pairing_lifecycle_hardening.sql
- 20260901182631_phase3_dashboard_milestones.sql
- 20260902013104_phase4_bucket_lists.sql
- public.bucket_item_subtasks
- 20260902045035_phase5_plans_calendar.sql
- public.plan_checklist_items
- public.plan_attachments
- public.plan_reminders
- private.guard_plan_child_insert()
- private.deliver_due_plan_reminders()
- 0006_plans_calendar_rls.test.sql
- 20260902103206_phase6_memories_media.sql
- Database Specification
- public.list_memories_by_tag()
- Phase 6 verification — 2026-09-02
- public.consume_memory_media_budget()
- 20260902154654_phase6_shared_calendar_moments.sql
- private.media_request_budgets
- 20260902174600_phase6_gallery_photo_comments.sql
- shared-entries-hosted.mjs
- compilerOptions
- src-app-app-calendar-page-tsx.md
- src-app-app-gallery-page-tsx.md
- src-app-app-milestones-page-tsx.md
- Bucket UI refinement — 2026-09-02
- README.md
- Local Preview Production Isolation
- Expand-Migrate-Contract Deployment
- Testing Strategy
- Shared Journal Experience Thesis
- Security objectives
- Mobile Is Designed Not Compressed
- Design Execution Gate
- Security Specification
- Bucket-to-Plan-to-Memory Continuity
- Wishlist Secret Purchase Non-Disclosure
- Explicit Calendar Conflict Policy
- Global Failure Paths
- Server-Verifiable Vault Unlock Session
- Phase Completion Gate
- Design System
- Phase 4 verification
- Us Together App Icon
- Plans and memories continuity
- Phase 5 verification — 2026-09-02
- Plan reminders and attachments
- Architectural Decisions
- Server-managed reminder retry state
- Master Prompt Traceability
- Development Setup
- API and Server Contracts
- Architecture
- Operations
- Product
- Implementation Plan
- Shared Calendar and Entry Media Extension
- Current shared calendar and gallery extension

## God Nodes (most connected - your core abstractions)
1. `Master Prompt Traceability` - 90 edges
2. `createServerSupabaseClient()` - 56 edges
3. `readDeveloperState()` - 51 edges
4. `getCurrentIdentity()` - 46 edges
5. `Button()` - 40 edges
6. `Database Specification` - 37 edges
7. `planContext()` - 35 edges
8. `writeDeveloperState()` - 33 edges
9. `API and Server Contracts` - 30 edges
10. `Input()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `deleteMemory()` --references--> `deleteMemory`  [EXTRACTED]
  src/app/actions/memories.ts → docs/API_CONTRACTS.md
- `inspectMedia()` --references--> `JPEG and PNG limits and derivatives`  [EXTRACTED]
  src/lib/memories/media.ts → docs/PHASE6_OPERATIONS.md
- `inspectMedia()` --references--> `MP4 and WebM limits`  [EXTRACTED]
  src/lib/memories/media.ts → docs/PHASE6_OPERATIONS.md
- `public.plan_attachments` --references--> `Private attachment boundary`  [EXTRACTED]
  supabase/migrations/20260902045035_phase5_plans_calendar.sql → docs/PHASE5_VERIFICATION.md
- `private.deliver_due_plan_reminders()` --implements--> `Private reminder scheduler`  [EXTRACTED]
  supabase/migrations/20260902085232_phase5_plan_details_and_retries.sql → docs/PHASE5_OPERATIONS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authenticated memory media lifecycle** — docs_phase6_operations_jwt_protected_memory_media_edge_boundary, docs_phase6_operations_authenticated_resumable_tus_upload, docs_phase6_operations_fenced_finalization_lease, docs_phase6_operations_fresh_authorized_signed_reads, docs_phase6_operations_storage_first_memory_media_deletion [EXTRACTED 1.00]
- **Verified Phase6 implementation with explicit pending cleanup** — docs_phase6_verification_hosted37_assertion_rls_evidence, docs_phase6_verification_hosted34_check_binary_integration_evidence, docs_phase6_verification_two_authenticated_desktop_mobile_media_journeys, docs_phase6_verification_final_command_closeout, docs_phase6_verification_pending_generated_fixture_cleanup_approval [EXTRACTED 1.00]
- **Authorized private attachment lifecycle** — docs_api_contracts_uploadplanattachment, supabase_migrations_20260902045035_phase5_plans_calendar_public_plan_attachments, supabase_migrations_20260902045035_phase5_plans_calendar_plan_attachments_storage_bucket, docs_api_contracts_get_api_plan_attachments_id, supabase_migrations_20260902084503_phase5_integrity_storage_first_attachment_deletion [EXTRACTED 1.00]
- **Preference-aware bounded reminder delivery** — supabase_migrations_20260902045035_phase5_plans_calendar_us_together_plan_reminders, supabase_migrations_20260902085232_phase5_plan_details_and_retries_private_deliver_due_plan_reminders, supabase_migrations_20260902085232_phase5_plan_details_and_retries_skip_locked_due_reminder_claims, supabase_migrations_20260902085232_phase5_plan_details_and_retries_preference_aware_content_minimal_notification_fan_out, supabase_migrations_20260902085232_phase5_plan_details_and_retries_per_reminder_atomic_fan_out_and_bounded_retry, supabase_migrations_20260902085232_phase5_plan_details_and_retries_server_managed_reminder_retry_state [EXTRACTED 1.00]
- **Hosted Phase 4 evidence with explicit limits** — docs_phase4_verification_rollback_only_pg_tap, docs_phase4_verification_negative_suite, docs_phase4_verification_advisor_findings, docs_phase4_verification_open_integration_gates [EXTRACTED 1.00]

## Communities (112 total, 30 thin omitted)

### Community 21 - "components.json"
Cohesion: 0.12
Nodes (16): $schema, style, rsc, tsx, tailwind, css, baseColor, cssVariables (+8 more)

### Community 54 - "package.json"
Cohesion: 0.33
Nodes (5): name, version, private, engines, node

### Community 42 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, dev, build, start, lint, typecheck, test, test:watch (+2 more)

### Community 12 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, @radix-ui/react-label, @radix-ui/react-label, @radix-ui/react-slot, @radix-ui/react-slot, @supabase/ssr, @supabase/ssr, @supabase/supabase-js (+17 more)

### Community 4 - "bucket-workspace.tsx"
Cohesion: 0.07
Nodes (49): react, react, metadata, BucketItemPage(), metadata, NewBucketItemPage(), metadata, BucketPage() (+41 more)

### Community 16 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, @imagemagick/magick-wasm, @imagemagick/magick-wasm, @playwright/test, @playwright/test, @tailwindcss/postcss, @tailwindcss/postcss, @types/node (+15 more)

### Community 1 - "button.tsx"
Cohesion: 0.07
Nodes (59): GalleryPage(), target, context(), entryMedia(), entryComments(), commentAction(), loadGallery(), target (+51 more)

### Community 2 - "planContext()"
Cohesion: 0.06
Nodes (64): metadata, CalendarPage(), MomentPage(), metadata, EditPlanPage(), metadata, PlanPage(), metadata (+56 more)

### Community 0 - "createServerSupabaseClient()"
Cohesion: 0.05
Nodes (93): metadata, PlanRow, MemoryRow, MilestoneRow, NotificationRow, HomePage(), dynamic, ProtectedLayout() (+85 more)

### Community 6 - "memories/data.ts"
Cohesion: 0.08
Nodes (32): metadata, EditMemoryPage(), metadata, MemoryPage(), metadata, MemoriesPage(), MemoryForm(), MemoryDetailView() (+24 more)

### Community 7 - "auth.ts"
Cohesion: 0.09
Nodes (26): metadata, metadata, dynamic, ResetPasswordPage(), metadata, SignInPage(), metadata, configurationError() (+18 more)

### Community 35 - "Memory media operations"
Cohesion: 0.17
Nodes (12): GET(), Memory media operations, Pinned ImageMagick decoder, JPEG and PNG limits and derivatives, MP4 and WebM limits, Page-session upload recovery, Fenced finalization lease, Fresh authorized signed reads (+4 more)

### Community 50 - "app/layout.tsx"
Cohesion: 0.32
Nodes (4): metadata, viewport, PwaRegister(), ThemeProvider()

### Community 47 - "model.ts"
Cohesion: 0.42
Nodes (7): ProjectionVisibility, DashboardCandidate, localDateKey(), dateOrdinal(), relationshipDayCount(), privacySafeCandidates(), selectRelevantCandidate()

### Community 18 - "media.ts"
Cohesion: 0.16
Nodes (16): box(), mp4(), imageLimit, videoLimit, mediaTypes, MediaMime, ascii(), dimensions() (+8 more)

### Community 11 - "database.types.ts"
Cohesion: 0.11
Nodes (20): createBrowserSupabaseClient(), supabaseConfigSchema, SupabaseConfig, getSupabaseConfig(), requireSupabaseConfig(), Json, Database, DatabaseWithoutInternals (+12 more)

### Community 46 - "20260831224609_foundation_profiles.sql"
Cohesion: 0.22
Nodes (6): public.profiles, auth.users, profiles_set_updated_at, private.set_updated_at, create_profile_after_auth_user, private.handle_new_auth_user

### Community 29 - "20260831234512_onboarding_couples.sql"
Cohesion: 0.22
Nodes (13): public.couples, auth.users, public.couple_memberships, public.couple_invitations, private.is_active_couple_member(), private.users_share_active_couple(), couple_memberships_enforce_capacity, private.enforce_two_active_partners (+5 more)

### Community 15 - "20260901024653_plans_memories.sql"
Cohesion: 0.14
Nodes (17): private.is_active_couple_member(), public.couple_memberships, public.bucket_lists, public.couples, auth.users, public.bucket_list_items, public, auth (+9 more)

### Community 26 - "20260901112427_pairing_lifecycle_hardening.sql"
Cohesion: 0.14
Nodes (5): public.couple_invitations, private.create_couple_with_invite(), public.couple_memberships, private.create_pairing_invite(), private.join_couple_by_code()

### Community 9 - "20260901182631_phase3_dashboard_milestones.sql"
Cohesion: 0.09
Nodes (22): public.milestones, public.couples, auth.users, public, auth, public.notification_preferences, public.notifications, private.notify_milestone_created() (+14 more)

### Community 25 - "20260902013104_phase4_bucket_lists.sql"
Cohesion: 0.12
Nodes (9): public.bucket_list_items, public.bucket_lists, public.delete_empty_bucket_list(), limit_bucket_lists, private.limit_bucket_lists, bucket_item_revision, private.bucket_item_revision, bucket_subtask_revision (+1 more)

### Community 20 - "20260902045035_phase5_plans_calendar.sql"
Cohesion: 0.16
Nodes (16): private.bump_plan_for_child(), private.bump_plan_version(), private.deliver_due_plan_reminders(), private.guard_plan_checklist_parent(), private.sync_plan_reminders(), private.guard_phase, plan_reminders_guard, plan_attachments_guard (+8 more)

### Community 27 - "public.plan_attachments"
Cohesion: 0.17
Nodes (14): public.plans, public.plan_attachments, auth.users, public, auth, private.can_access_plan_object(), public.mutate_plan(), plan-attachments Storage bucket (+6 more)

### Community 30 - "private.guard_plan_child_insert()"
Cohesion: 0.19
Nodes (14): private.guard_plan_child_insert(), public.plan_checklist_items, public.plan_reminders, public.plan_attachments, checklist_insert_limit, private.guard_plan_child_insert, reminder_insert_limit, attachment_insert_limit (+6 more)

### Community 36 - "private.deliver_due_plan_reminders()"
Cohesion: 0.18
Nodes (10): public.plan_reminders, public.update_plan_details(), public.plans, pg_timezone_names, private.deliver_due_plan_reminders(), private.guard_phase, Per-reminder atomic fan-out and bounded retry, SKIP LOCKED due reminder claims (+2 more)

### Community 49 - "0006_plans_calendar_rls.test.sql"
Cohesion: 0.32
Nodes (6): pg_temp.reject_fixture_notification(), phase5_fixture_failure, pg_temp.reject_fixture_notification, pg_temp.reject_fixture_notification(), Hosted 40-assertion security suite, phase5_fixture_failure

### Community 10 - "20260902103206_phase6_memories_media.sql"
Cohesion: 0.12
Nodes (25): public.memories, private.bump_memory_version(), memories_version, private.bump_memory_version, public.update_memory_details(), public.memory_media, private.validate_memory_media_path(), private.guard_memory_media_delete() (+17 more)

### Community 5 - "Database Specification"
Cohesion: 0.04
Nodes (45): memory_tags_guard, private.guard_memory_tags, memory_links_guard, private.guard_memory_provenance(), memories_provenance, private.guard_memory_provenance, private.guard_memory_tags(), public.memory_tags (+37 more)

### Community 23 - "public.list_memories_by_tag()"
Cohesion: 0.16
Nodes (14): public.list_memories_by_tag(), public.memories, public.memory_tag_links, public.memory_tags, public.update_memory_details(), public.memories, Implemented memory stories and gallery, Hosted42-assertion RLS evidence (+6 more)

### Community 13 - "Phase 6 verification — 2026-09-02"
Cohesion: 0.08
Nodes (19): private.phase6_test_fixture, env, fixture, clients, created, Phase 6 verification — 2026-09-02, Implemented private memory media, Hosted34-check binary integration evidence (+11 more)

### Community 40 - "public.consume_memory_media_budget()"
Cohesion: 0.22
Nodes (8): private.media_request_budgets, auth.users, public.consume_memory_media_budget(), Account media request budgets, consume_memory_media_budget, Identity-derived account media budgets, Phase6 37-assertion security suite, Rollback-only verification postconditions

### Community 14 - "20260902154654_phase6_shared_calendar_moments.sql"
Cohesion: 0.13
Nodes (19): public.milestones, auth.users, private.validate_milestone_media_path, storage.objects, private.guard_milestone_media_delete, public.memories, public, auth (+11 more)

### Community 31 - "20260902174600_phase6_gallery_photo_comments.sql"
Cohesion: 0.17
Nodes (12): public.media_comments, public.memory_media, public.milestone_media, auth.users, public, auth, public.can_access_media_comment(), media_comments_limit (+4 more)

### Community 52 - "shared-entries-hosted.mjs"
Cohesion: 0.29
Nodes (4): env, fixture, clients, media

### Community 8 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, target, lib, dom, dom.iterable, esnext, allowJs, skipLibCheck (+20 more)

### Community 55 - "Bucket UI refinement — 2026-09-02"
Cohesion: 0.50
Nodes (3): Bucket UI refinement — 2026-09-02, Changes, Verification

### Community 53 - "Testing Strategy"
Cohesion: 0.33
Nodes (6): Production Acceptance Gate, Testing Strategy, Mandatory negative cases, Release checklist, Accessibility and design QA, RLS access matrix

### Community 51 - "Security objectives"
Cohesion: 0.29
Nodes (7): Clear Privacy State, Release 2 Scope, Private External Event Default, Per-User OAuth Ownership Boundary, Protected Access Not Zero Knowledge, Future E2EE Boundary, Security objectives

### Community 28 - "Security Specification"
Cohesion: 0.13
Nodes (15): Secure Couple Pairing, Pairing and Onboarding Flow, Security Specification, Threat model, Trust boundaries, Authentication and sessions, Authorization and RLS, Pairing security (+7 more)

### Community 48 - "Phase Completion Gate"
Cohesion: 0.29
Nodes (8): CI, Agent Instructions, Product Source of Truth, Phase Completion Gate, Skill Routing, Historical phase closure query, Historical next-step query, Us Together

### Community 34 - "Design System"
Cohesion: 0.17
Nodes (12): Foundation auth and home, Relationship thread, Bucket lists continuity, One more dream lived, Design System, Shared-Journal Thread, One Wine Voice Rule, Warm Dark Rule (+4 more)

### Community 39 - "Phase 4 verification"
Cohesion: 0.20
Nodes (11): Us Together project overview, Current stack, Paired developer fixture, Phase 4 verification, Rollback-only pgTAP verification, Migration identity correspondence, Phase 4 negative suite, Indexed bucket query (+3 more)

### Community 56 - "Us Together App Icon"
Cohesion: 0.50
Nodes (4): Us Together App Icon, Cream Heart Outline, Wine Rounded-Square Tile, Rose Horizontal Accent

### Community 41 - "Plans and memories continuity"
Cohesion: 0.20
Nodes (10): Plans and memories continuity, Mode, Audience/job, Direction, Calendar, Plan detail, Reminders and files, Memorable moment (+2 more)

### Community 45 - "Phase 5 verification — 2026-09-02"
Cohesion: 0.22
Nodes (9): Phase 5 verification — 2026-09-02, Implemented plans and calendar, Timezone and DST verification, Versioned plan integrity, Verified reminder scheduler, Advisor evidence, Private attachment boundary, Application and visual gates (+1 more)

### Community 44 - "Plan reminders and attachments"
Cohesion: 0.22
Nodes (9): Plan reminders and attachments, Private reminder scheduler, Reminder lifecycle and suppression, Bounded reminder retries, Safe operator retry, Recoverable attachment upload, Collection limits and cleanup, Authenticated attachment download (+1 more)

### Community 19 - "Architectural Decisions"
Cohesion: 0.10
Nodes (20): Final integration obligations, Architectural Decisions, ADR-001 — Multi-tenant couple ownership, ADR-002 — Dream-to-Memory MVP, ADR-003 — Managed Vercel and Supabase, ADR-004 — Email/password MVP authentication, ADR-005 — Database-first authorization, ADR-006 — Purchaser state separated from wishlist item (+12 more)

### Community 3 - "Master Prompt Traceability"
Cohesion: 0.02
Nodes (82): Master Prompt Traceability, Product vision, Incremental development rule, Technology stack, Multi-tenant architecture, Users/profiles, Couples/members, Invite link and six-digit code (+74 more)

### Community 24 - "Development Setup"
Cohesion: 0.12
Nodes (16): Development Setup, Current status, Prerequisites, Bootstrap, Environment variables, Hosted database workflow, Optional local Supabase alternative, Email authentication (+8 more)

### Community 17 - "API and Server Contracts"
Cohesion: 0.09
Nodes (22): API and Server Contracts, ActionResult, Server-derived identity and Zod, Identity and couple actions, Implemented pairing RPCs, mutateBucket, Bucket pagination and conversions, createPlanAction (+14 more)

### Community 22 - "Architecture"
Cohesion: 0.12
Nodes (16): Architecture, Next.js on Vercel, Supabase platform, Couple tenancy, Server-only domain services, Validated mutation boundary, Authenticated data access, Transactional pairing (+8 more)

### Community 37 - "Operations"
Cohesion: 0.17
Nodes (12): Operations, Observability, Scheduled work, Backups and recovery, Capacity and limits, Database maintenance, Dependency and security maintenance, Incident response (+4 more)

### Community 38 - "Product"
Cohesion: 0.17
Nodes (12): Product, Individual accounts and two active partners, Dream-to-Memory MVP, Release 2, Later roadmap, Privacy is behavior, Connected relationship journey, Warm personal design (+4 more)

### Community 32 - "Implementation Plan"
Cohesion: 0.14
Nodes (14): Implementation Plan, Delivery method, Phase 0 — Documentation baseline, Phase 1 — Foundation, Phase 2 — Couple system and onboarding, Phase 3 — Dashboard and milestones, Phase 4 — Bucket lists, Phase 5 — Plans and internal calendar (+6 more)

### Community 33 - "Shared Calendar and Entry Media Extension"
Cohesion: 0.14
Nodes (14): Shared Calendar and Entry Media Extension, Calendar Plans Memories Moments, Multiple Entry Photos and Captions, Real Local Preview Media, Personal In-App Entry Reminders, Free Photon OpenStreetMap Lookup, Shared Entry Verification, Phase6 Closeout Obligations (+6 more)

### Community 43 - "Current shared calendar and gallery extension"
Cohesion: 0.47
Nodes (9): Current shared calendar and gallery extension, ADR-021 — Galleries and comments belong to individual files, Six photo previews and full gallery, shared_gallery invoker view and Home gallery, media_comments, Local preview media and file comments, Retired memory and moment reminders, Retained plan reminders (+1 more)

## Knowledge Gaps
- **298 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+293 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `API and Server Contracts` connect `API and Server Contracts` to `Memory media operations`, `Master Prompt Traceability`, `private.deliver_due_plan_reminders()`, `public.consume_memory_media_budget()`, `media.ts`, `Architecture`, `public.list_memories_by_tag()`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `Master Prompt Traceability` connect `Master Prompt Traceability` to `Implementation Plan`, `Database Specification`, `Operations`, `Product`, `API and Server Contracts`, `Architectural Decisions`, `Architecture`, `Development Setup`, `Security Specification`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `createServerSupabaseClient()` connect `createServerSupabaseClient()` to `database.types.ts`, `planContext()`, `Memory media operations`, `auth.ts`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _298 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `bucket-workspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.073224043715847 - nodes in this community are weakly interconnected._