# Graph Report - D:\Projects\Uss  (2026-09-02)

## Corpus Check
- 80 files · ~58,187 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 623 nodes · 1229 edges · 59 communities (40 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Sessions and Shared Actions
- Bucket Workspace and Validation
- Development Toolchain
- Forms and UI Controls
- Authentication and Recovery
- Milestones and Notifications
- TypeScript Configuration
- Runtime Dependencies
- Supabase Clients and Types
- Relational Domain Contracts
- Component Generator Setup
- Delivery and Product Governance
- Versioned Bucket Database
- Pairing Lifecycle Security
- Plan and Memory Conversion
- Relationship Dashboard
- Hosted Verification Workflow
- Shared Journal Design
- Bucket API and Indexes
- Future Privacy Boundaries
- Bucket Provenance and Versions
- Theme and PWA Shell
- Release Verification Matrix
- Product Privacy Principles
- Brand App Icon
- Dream to Memory Continuity
- Pairing Experience
- Next Security Headers
- Incident Response Lifecycle
- Vault Access Requirements
- next-env.d.ts
- postcss.config.mjs
- sw.js
- Server Mutation Boundary
- Tenancy and Ownership
- Local Preview Production Isolation
- Expand-Migrate-Contract Deployment
- Design Execution Gate
- Shared Journal Experience Thesis
- Mobile Is Designed Not Compressed
- Wishlist Secret Purchase Non-Disclosure
- Explicit Calendar Conflict Policy
- Idempotent Scheduled Work
- PostgreSQL RLS and Storage Isolation
- Global Failure Paths
- public.bucket_item_subtasks

## God Nodes (most connected - your core abstractions)
1. `createServerSupabaseClient()` - 56 edges
2. `readDeveloperState()` - 50 edges
3. `writeDeveloperState()` - 28 edges
4. `getCurrentIdentity()` - 23 edges
5. `Button()` - 23 edges
6. `compilerOptions` - 16 edges
7. `Implementation Plan` - 15 edges
8. `Input()` - 13 edges
9. `Phase 4 verification` - 13 edges
10. `createPlanAction()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Release checklist` --semantically_similar_to--> `Phase Completion Gate`  [INFERRED] [semantically similar]
  docs/TESTING.md → AGENTS.md
- `Privacy is behavior` --semantically_similar_to--> `Database-first authorization`  [INFERRED] [semantically similar]
  PRODUCT.md → docs/DECISIONS.md
- `CI` --implements--> `Phase Completion Gate`  [INFERRED]
  .github/workflows/ci.yml → AGENTS.md
- `Foundation auth and home` --conceptually_related_to--> `Shared-Journal Thread`  [INFERRED]
  .impeccable/surfaces/foundation-auth-home.md → DESIGN.md
- `Plans and memories continuity` --implements--> `Shared-Journal Thread`  [EXTRACTED]
  .impeccable/surfaces/src-app-app-plans-page-tsx.md → DESIGN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Normalized Dream-to-Memory continuity** — docs_database_bucket_lists, docs_database_plans, docs_database_memories, docs_database_preserved_provenance [EXTRACTED 1.00]
- **Hosted Phase 4 evidence with explicit limits** — docs_phase4_verification_rollback_only_pg_tap, docs_phase4_verification_negative_suite, docs_phase4_verification_advisor_findings, docs_phase4_verification_open_integration_gates [EXTRACTED 1.00]
- **Tenant Isolation Contract** — arch_tenancy_and_ownership, docs_database_rls_access_matrix, docs_security_database_rls_boundary [INFERRED 0.95]

## Communities (59 total, 19 thin omitted)

### Community 0 - "Sessions and Shared Actions"
Cohesion: 0.06
Nodes (73): signOutAction(), activePairedCoupleId(), createMilestoneAction(), markNotificationReadAction(), notificationIdSchema, updateNotificationPreferencesAction(), completePlanAction(), createMemoryAction() (+65 more)

### Community 1 - "Bucket Workspace and Validation"
Cohesion: 0.10
Nodes (38): filterBucketItems(), mutateBucket(), BucketItemPage(), metadata, metadata, NewBucketItemPage(), BucketPage(), metadata (+30 more)

### Community 2 - "Development Toolchain"
Cohesion: 0.05
Nodes (42): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @playwright/test, supabase, @supabase/cli-windows-x64 (+34 more)

### Community 3 - "Forms and UI Controls"
Cohesion: 0.10
Nodes (18): dynamic, ProtectedLayout(), metadata, AppNavigation(), items, AppShell(), AuthAction, AuthFormProps (+10 more)

### Community 4 - "Authentication and Recovery"
Cohesion: 0.09
Nodes (26): configurationError(), forgotPasswordAction(), signInAction(), signUpAction(), updatePasswordAction(), developerLoginAction(), metadata, dynamic (+18 more)

### Community 5 - "Milestones and Notifications"
Cohesion: 0.09
Nodes (22): auth, auth.users, private.delete_milestone_notifications, private.handle_new_notification_preferences, private.notify_milestone_created, private.set_updated_at, private.validate_milestone_tenant, private.validate_notification_update (+14 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (27): class-variance-authority, clsx, lucide-react, next, next-themes, dependencies, class-variance-authority, clsx (+19 more)

### Community 8 - "Supabase Clients and Types"
Cohesion: 0.11
Nodes (19): getSupabaseConfig(), requireSupabaseConfig(), SupabaseConfig, supabaseConfigSchema, CompositeTypes, Constants, Database, DatabaseWithoutInternals (+11 more)

### Community 9 - "Relational Domain Contracts"
Cohesion: 0.12
Nodes (19): Plans and memories continuity, Notification contracts, Database Specification, Deletion and retention, Identity and tenancy, Notes visibility, Notifications, Plans (+11 more)

### Community 10 - "Component Generator Setup"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 11 - "Delivery and Product Governance"
Cohesion: 0.16
Nodes (16): CI, Agent Instructions, Phase Completion Gate, Product Source of Truth, Skill Routing, Implementation Plan, Phase 0 Documentation baseline, Phase 1 Foundation (+8 more)

### Community 12 - "Versioned Bucket Database"
Cohesion: 0.12
Nodes (9): private.bucket_item_revision, private.bucket_subtask_revision, private.limit_bucket_lists, public.bucket_list_items, public.bucket_lists, bucket_item_revision, bucket_subtask_revision, limit_bucket_lists (+1 more)

### Community 13 - "Pairing Lifecycle Security"
Cohesion: 0.14
Nodes (5): public.couple_invitations, private.create_couple_with_invite(), private.create_pairing_invite(), private.join_couple_by_code(), public.couple_memberships

### Community 14 - "Plan and Memory Conversion"
Cohesion: 0.33
Nodes (10): activeCoupleId(), createPlanAction(), PlanForm(), saveBucketPlan(), isValidTimeZone(), memorySchema, moneyToMinorUnits(), planSchema (+2 more)

### Community 15 - "Relationship Dashboard"
Cohesion: 0.20
Nodes (13): HomePage(), MemoryRow, metadata, MilestoneRow, NotificationRow, PlanRow, DashboardCandidate, dateOrdinal() (+5 more)

### Community 16 - "Hosted Verification Workflow"
Cohesion: 0.18
Nodes (15): Hosted verification and deferred pairing, Phase 4 Bucket lists, Phase 4 advisor findings, Phase 4 browser evidence, Indexed bucket query, Migration identity correspondence, Phase 4 verification, Rollback-only pgTAP verification (+7 more)

### Community 17 - "Shared Journal Design"
Cohesion: 0.15
Nodes (13): Foundation auth and home, Relationship thread, Bucket lists continuity, One more dream lived, Bounded Paper Rule, Design System, One Narrative Path Rule, One Wine Voice Rule (+5 more)

### Community 18 - "Bucket API and Indexes"
Cohesion: 0.22
Nodes (10): Bucket conversion, Domain-safe DTO, filterBucketItems, Idempotency and concurrency, Memory contracts, Pairing contracts, Plan contracts, Server Actions (+2 more)

### Community 19 - "Future Privacy Boundaries"
Cohesion: 0.22
Nodes (9): Secret Content Non-Inference, Clear Privacy State, Release 2 Scope, Per-User OAuth Ownership Boundary, Private External Event Default, Content-Safe Observability, Security Objectives, Future E2EE Boundary (+1 more)

### Community 20 - "Bucket Provenance and Versions"
Cohesion: 0.32
Nodes (8): mutateBucket, Bucket lists, Memories, Preserved provenance, Versioned bucket edits, Versioned bucket edits and transactional continuity, Phase 6 Memories and media, Phase 4 negative suite

### Community 21 - "Theme and PWA Shell"
Cohesion: 0.32
Nodes (4): metadata, viewport, PwaRegister(), ThemeProvider()

### Community 22 - "Release Verification Matrix"
Cohesion: 0.29
Nodes (7): RLS access matrix, Production Acceptance Gate, Phase 8 MVP completion, Accessibility and design QA, Mandatory negative cases, Release checklist, Testing Strategy

### Community 23 - "Product Privacy Principles"
Cohesion: 0.29
Nodes (7): Database-first authorization, Accessibility and Inclusion, Dream-to-Memory MVP, Later roadmap, Privacy is behavior, Release 2, Us Together

### Community 24 - "Brand App Icon"
Cohesion: 0.50
Nodes (4): Cream Heart Outline, Rose Horizontal Accent, Us Together App Icon, Wine Rounded-Square Tile

### Community 25 - "Dream to Memory Continuity"
Cohesion: 0.67
Nodes (3): Dream-to-Memory Data Flow, Bucket-to-Plan-to-Memory Continuity, Bucket-to-Plan-to-Memory UX Flow

### Community 26 - "Pairing Experience"
Cohesion: 0.67
Nodes (3): Secure Couple Pairing, Pairing Security Controls, Pairing and Onboarding Flow

## Knowledge Gaps
- **184 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createServerSupabaseClient()` connect `Sessions and Shared Actions` to `Bucket Workspace and Validation`, `Authentication and Recovery`, `Plan and Memory Conversion`, `Relationship Dashboard`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `readDeveloperState()` connect `Sessions and Shared Actions` to `Bucket Workspace and Validation`, `Plan and Memory Conversion`, `Relationship Dashboard`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `Button()` connect `Forms and UI Controls` to `Sessions and Shared Actions`, `Bucket Workspace and Validation`, `Authentication and Recovery`, `Plan and Memory Conversion`, `Relationship Dashboard`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sessions and Shared Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.06491228070175438 - nodes in this community are weakly interconnected._
- **Should `Bucket Workspace and Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.1048265460030166 - nodes in this community are weakly interconnected._
- **Should `Development Toolchain` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
## Extraction accounting and health

Host semantic-agent token usage is unavailable. Zero token counters are schema placeholders, not a claim of zero LLM cost. Incremental raw AST extraction reported 193 out-of-batch endpoints before merging with the existing graph and one same-endpoint collapse under the existing undirected representation. The final merged graph integrity report is recorded below; raw structural audits remain distinct from post-build checks.

```text
[graphify] MultiDiGraph edge-collapse diagnostic
input: <in-memory>
input_stage: provided JSON (normal graph.json is post-build)
effective_directed: <direct-call>
nodes: 623
unverified_code_nodes: 0
raw_edges: 1229
valid_candidate_edges: 1229
missing_endpoint_edges: 0
dangling_endpoint_edges: 0
self_loop_edges: 0
exact_duplicate_edges: 0
directed_unique_endpoint_pairs: 1229
directed_same_endpoint_collapsed_edges: 0
undirected_unique_endpoint_pairs: 1229
undirected_same_endpoint_collapsed_edges: 0
same_endpoint_group_count: 0
relation_variant_groups: 0
source_file_variant_groups: 0
source_location_variant_groups: 0
context_variant_groups: 0
post_build_graph_type: Graph
post_build_edges: 1229
producer_suppression_sites: 10
producer_suppression_examples:
  - L1099 seen_ids arity=unknown
  - L1253 seen_ids arity=unknown
  - L1255 seen_doc_refs arity=unknown
  - L1600 seen_ids arity=unknown
  - L2069 seen_keys arity=unknown
  - L3104 seen_ids arity=unknown
  - L3212 seen_ids arity=unknown
  - L3291 seen_ids arity=unknown
note: normal graph.json is post-build; raw producer loss must be measured earlier.
```
