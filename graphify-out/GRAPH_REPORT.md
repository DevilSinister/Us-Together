# Graph Report - Uss  (2026-09-01)

## Corpus Check
- 78 files · ~29,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 364 nodes · 583 edges · 39 communities (23 shown, 16 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d1ec263`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Security Objectives
- Phase Completion Gate
- Tenancy and Ownership
- RLS and Visibility Test Matrix
- onboarding-forms.tsx
- Required Skill Routing
- PostgreSQL RLS and Storage Isolation
- Secure Couple Pairing
- Server Mutation Boundary
- Stable Action Result Model
- Idempotency and Concurrency Contract
- Local Preview Production Isolation
- Phase 0 Documentation Baseline
- Vault Access Requirements
- Expand-Migrate-Contract Deployment
- Shared Journal Experience Thesis
- Mobile Is Designed Not Compressed
- Explicit Calendar Conflict Policy
- Layered Test Strategy
- Accessibility and Inclusion Commitment
- compilerOptions
- dependencies
- auth.ts
- devDependencies
- createServerSupabaseClient
- components.json
- scripts
- config.ts
- app/layout.tsx
- Foundation auth and home surface
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- sw.js
- Design System: Us Together
- dev-session.ts

## God Nodes (most connected - your core abstractions)
1. `createServerSupabaseClient()` - 30 edges
2. `getCurrentIdentity()` - 22 edges
3. `readDeveloperState()` - 19 edges
4. `compilerOptions` - 16 edges
5. `Button()` - 13 edges
6. `writeDeveloperState()` - 12 edges
7. `cn()` - 11 edges
8. `scripts` - 9 edges
9. `Design System: Us Together` - 9 edges
10. `hasDeveloperSession()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Secret Content Non-Inference` --conceptually_related_to--> `Security Objectives`  [INFERRED]
  ARCHITECTURE.md → docs/SECURITY.md
- `Design Execution Gate` --conceptually_related_to--> `Required Skill Routing`  [INFERRED]
  docs/DESIGN_BRIEF.md → AGENTS.md
- `Implementation Skill Matrix` --conceptually_related_to--> `Required Skill Routing`  [INFERRED]
  docs/IMPLEMENTATION_PLAN.md → AGENTS.md
- `Required Phase Evidence` --conceptually_related_to--> `Phase Completion Gate`  [INFERRED]
  docs/IMPLEMENTATION_PLAN.md → AGENTS.md
- `Release Checklist` --conceptually_related_to--> `Phase Completion Gate`  [INFERRED]
  docs/TESTING.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tenant Isolation Contract** — arch_tenancy_and_ownership, docs_database_rls_access_matrix, docs_security_database_rls_boundary, docs_testing_rls_visibility_matrix [INFERRED 0.95]
- **Dream-to-Memory Continuity** — product_relationship_loop, arch_dream_to_memory_flow, docs_features_bucket_plan_memory, docs_ux_flows_bucket_to_memory, docs_testing_browser_dream_to_memory [INFERRED 0.95]
- **Verified Phase Governance** — agents_phase_completion_gate, docs_implementation_plan_phased_delivery, docs_testing_release_checklist, docs_traceability_coverage_gate [INFERRED 0.85]

## Communities (39 total, 16 thin omitted)

### Community 0 - "Security Objectives"
Cohesion: 0.18
Nodes (11): Secret Content Non-Inference, ADR-007 Protected Vault Not E2EE, Clear Privacy State, Release 2 Scope, Per-User OAuth Ownership Boundary, Private External Event Default, Content-Safe Observability, Security Objectives (+3 more)

### Community 1 - "Phase Completion Gate"
Cohesion: 0.33
Nodes (7): Phase Completion Gate, Production Acceptance Gate, Phased Deployable Delivery, Required Phase Evidence, Release Checklist, Traceability Coverage Gate, Eighty-One Requirement Traceability Matrix

### Community 2 - "Tenancy and Ownership"
Cohesion: 0.19
Nodes (13): Product Source of Truth, Dream-to-Memory Data Flow, Tenancy and Ownership, Normalized Tenant Data Model, ADR-001 Multi-Tenant Couple Ownership, ADR-002 Dream-to-Memory MVP, Bucket-to-Plan-to-Memory Continuity, Local Supabase Workflow (+5 more)

### Community 3 - "RLS and Visibility Test Matrix"
Cohesion: 0.29
Nodes (7): Wishlist Purchase Secret Separation, ADR-006 Purchaser State Separation, Wishlist Secret Purchase Non-Disclosure, Incident Response Lifecycle, Mandatory Negative Security Scenarios, Cross-Tenant Deterministic Demo Seed, RLS and Visibility Test Matrix

### Community 4 - "onboarding-forms.tsx"
Cohesion: 0.14
Nodes (17): dynamic, ProtectedLayout(), AppShell(), AuthAction, AuthFormProps, SubmitButton(), BrandMark(), avatarStyles (+9 more)

### Community 5 - "Required Skill Routing"
Cohesion: 0.50
Nodes (4): Required Skill Routing, ADR-008 Pre-Build Brief Post-Build Design System, Design Execution Gate, Implementation Skill Matrix

### Community 6 - "PostgreSQL RLS and Storage Isolation"
Cohesion: 0.50
Nodes (4): RLS Access Matrix, ADR-005 Database-First Authorization, PostgreSQL RLS and Storage Isolation, Privacy Is Behavior

### Community 7 - "Secure Couple Pairing"
Cohesion: 0.67
Nodes (4): Transactional Two-Member Capacity, Secure Couple Pairing, Pairing Security Controls, Pairing and Onboarding Flow

### Community 20 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 21 - "dependencies"
Cohesion: 0.07
Nodes (27): class-variance-authority, clsx, lucide-react, next, next-themes, dependencies, class-variance-authority, clsx (+19 more)

### Community 22 - "auth.ts"
Cohesion: 0.10
Nodes (23): configurationError(), forgotPasswordAction(), signInAction(), signOutAction(), signUpAction(), updatePasswordAction(), metadata, dynamic (+15 more)

### Community 23 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, supabase, @supabase/cli-windows-x64, tailwindcss (+17 more)

### Community 24 - "createServerSupabaseClient"
Cohesion: 0.16
Nodes (30): allowedAvatarTypes, completeDeveloperPairingAction(), createCoupleAction(), finishSoloOnboardingAction(), joinCoupleAction(), readInvitePreview(), saveOnboardingProfileAction(), saveRelationshipAction() (+22 more)

### Community 25 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 26 - "scripts"
Cohesion: 0.13
Nodes (14): engines, node, name, private, scripts, build, dev, lint (+6 more)

### Community 27 - "config.ts"
Cohesion: 0.22
Nodes (10): createBrowserSupabaseClient(), getSupabaseConfig(), requireSupabaseConfig(), SupabaseConfig, supabaseConfigSchema, authPaths, protectedPaths, updateSession() (+2 more)

### Community 28 - "app/layout.tsx"
Cohesion: 0.32
Nodes (4): metadata, viewport, PwaRegister(), ThemeProvider()

### Community 29 - "Foundation auth and home surface"
Cohesion: 0.50
Nodes (3): Direction contract, Fidelity inventory, Foundation auth and home surface

### Community 37 - "Design System: Us Together"
Cohesion: 0.08
Nodes (24): Buttons, Cards / Containers, Colors, Components, Design System: Us Together, Do:, Do's and Don'ts, Don't: (+16 more)

### Community 38 - "dev-session.ts"
Cohesion: 0.33
Nodes (8): developerLoginAction(), metadata, SignInPage(), defaultState, DevState, encodeState(), isDeveloperLoginEnabled(), startDeveloperSession()

## Knowledge Gaps
- **149 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createServerSupabaseClient()` connect `createServerSupabaseClient` to `config.ts`, `auth.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `onboarding-forms.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13663663663663664 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._