# Architectural Decisions

Status values: `Proposed`, `Accepted`, `Superseded`, `Rejected`. New records include context, decision, consequences, and links to affected specifications.

## ADR-001 — Multi-tenant couple ownership

**Status:** Accepted

**Decision:** Model individual users, couples, and couple memberships separately. Every shared domain record carries `couple_id`; user-private/secret records also carry immutable explicit ownership.

**Consequences:** RLS can enforce tenant isolation uniformly. The initial two-member restriction is a database transaction/invariant rather than a hardcoded schema shape, allowing future policy change.

## ADR-002 — Dream-to-Memory MVP

**Status:** Accepted

**Decision:** MVP includes auth/pairing, shell/dashboard, bucket lists, plans/internal calendar, memories/media, wishlists/secret purchases, shared/private notes, basic milestones/notifications, settings, export, and lifecycle operations. Vault, advanced notes, Know Me/Our Story, Google Calendar, push, richer realtime/search are R2.

**Consequences:** The first release proves the connected product mechanism without making security-heavy integrations a launch dependency.

## ADR-003 — Managed Vercel and Supabase

**Status:** Accepted

**Decision:** Target Next.js on Vercel and managed Supabase for Auth, PostgreSQL, Storage, and selective Realtime, with local Supabase development.

**Consequences:** Architecture follows platform constraints and current official guidance. Self-hosting portability is not an MVP requirement; domain/service boundaries should still avoid gratuitous provider coupling.

## ADR-004 — Email/password MVP authentication

**Status:** Accepted

**Decision:** Use verified email/password and password recovery. Social login and magic-link-first authentication are deferred. Google Calendar consent remains a separate R2 OAuth connection.

**Consequences:** Smaller initial auth surface and clearer Calendar consent separation. Email delivery/redirect security remains launch critical.

## ADR-005 — Database-first authorization

**Status:** Accepted

**Decision:** Enforce tenant/private/secret row access with PostgreSQL RLS and Storage policies, supplemented by server authorization for workflows. Client filtering is never authorization.

**Consequences:** Every migration requires policy tests and advisors. Elevated clients/functions are exceptional and reviewed.

## ADR-006 — Purchaser state separated from wishlist item

**Status:** Accepted

**Decision:** Store purchase state in purchaser-owned rows, never columns returned with the owner-readable wishlist item.

**Consequences:** Owner-facing queries, aggregates, events, search, exports, and DTOs can exclude the table entirely, reducing inference risk.

## ADR-007 — Protected vault, not E2EE

**Status:** Accepted

**Decision:** R2 Vault uses private storage, RLS, server authorization, temporary PIN/passkey-gated sessions, and short-lived URLs. Do not claim E2EE/zero knowledge.

**Consequences:** Service infrastructure can process plaintext and product copy must say so. True E2EE requires a separate key-management/recovery ADR.

## ADR-008 — Pre-build design brief, post-build design system

**Status:** Accepted

**Decision:** Use `docs/DESIGN_BRIEF.md` before implementation. Generate root `DESIGN.md` only from the first implemented and visually verified interface using Impeccable.

**Consequences:** Durable tokens/components describe shipped truth rather than speculative rules.

## ADR-009 — Global English, localization-ready data

**Status:** Accepted

**Decision:** Launch in English with IANA user timezones, UTC instants, locale-aware display, and ISO currencies. Full i18n infrastructure is deferred unless implementation shows low-cost necessity.

**Consequences:** Copy may initially live in code/component boundaries but must not block future extraction. Date/currency data cannot assume Pakistan or one timezone.

## ADR-010 — Server actions first

**Status:** Accepted

**Decision:** Use Server Actions for first-party form mutations and Route Handlers for OAuth, webhooks, exports, upload/signing, and explicit HTTP needs.

**Consequences:** Zod validation and authorization live in server/domain boundaries. Contracts must avoid framework-specific leakage into domain logic.

## ADR-011 — Provenance-first plans and memories slice

**Status:** Accepted

**Context:** Plans and memories are the product's essential continuity mechanism, while the formal delivery plan places them after dashboard and bucket-list UI phases.

**Decision:** Implement a secure vertical slice without declaring skipped phase gates complete. Establish the normalized bucket provenance tables and full plan/memory security boundaries first; expose direct plan creation, completion, direct memory creation, and idempotent completed-plan-to-memory flow. Keep checklist/reminder/media upload controls unavailable until their complete services and tests exist.

**Consequences:** The core Dream-to-Memory loop is usable earlier, source links are durable, and no fake controls are shipped. Phase 3–4 work and the remaining Phase 5–6 gates stay explicit blockers rather than being silently reclassified.

## ADR-012 — Couple leave and empty-space deletion

**Status:** Accepted

**Context:** Pairing lifecycle controls need deterministic post-leave ownership behavior without weakening tenant isolation or silently deleting shared history.

**Decision:** Leaving immediately ends the departing user's active membership and therefore all RLS-backed access. Shared plans, memories, milestones, and other couple-owned records remain accessible to the continuing active member. A couple may be hard-deleted only while it has exactly one active member and no shared bucket lists, plans, memories, or milestones. Invite revocation does not delete the couple.

**Consequences:** The remaining partner retains the shared record; the departing partner must be invited into another couple to regain shared access. Full account deletion/export and policy for deleting a populated sole-member couple remain Phase 8 workflows requiring stronger confirmation and operational handling.

## ADR-013 — Content-minimal dashboard notifications

**Status:** Accepted

**Context:** Dashboard previews and notifications are useful but create an inference channel if they copy private titles, bodies, counts, or secret state outside the source record's authorization boundary.

**Decision:** Compose Home server-side from an allow-list of shared, RLS-protected tables and filter non-shared projection candidates before relevance or counting. Store notifications as recipient-owned generic event envelopes with a category, safe target pointer, read state, and idempotency key; never copy source content. Opening a notification must read the target again through its current authorization policy. Couple notifications also require current active membership.

**Consequences:** Former members and users with hidden content cannot infer its existence through Home or the inbox. Notification copy is intentionally less descriptive, and every future category must add authorization and negative-inference tests before fan-out is enabled.

## Open decisions

- Billing/pricing and legal/retention requirements
- Final brand identity, logo, imagery, and product domain
- Initial numeric quotas, rate limits, signed URL lifetime, and backup objectives after platform measurement
- Rich-text representation for notes
- Background-job mechanism after current platform evaluation
- Future AI provider, consent, retention, and evaluation policy

## ADR-014 — Hosted verification; pairing deferred to final integration

**Status:** Accepted, 2026-09-02, explicit user direction.

**Context:** This workstation will not use Docker or Podman. The user asked to consult other project runbooks in the Obsidian vault, proceed with Phase 4, and pair real accounts at the end. Those runbooks support reviewed hosted migrations with honest verification evidence.

**Decision:** Use the confirmed managed Us-Together project for authorized migrations, schema/type checks, rollback-only fictional RLS fixtures, and advisors. Store its reference only in ignored `.env.local` as `SUPABASE_PROJECT_ID`. Verify project identity before every write; a connector's project listing is not authoritative when an exact supplied reference resolves successfully. Never apply this project's migrations to another listed project.

**Consequences:** Docker/Podman is not a delivery prerequisite. A clean-from-zero reset remains a release reproducibility check on a disposable hosted test branch/project (or optional local runtime), not a reason to install containers here. Real two-account pairing and concurrent-final-slot checks are deferred to the final integration session, not marked passed. Existing earlier phase reports describe historical evidence; this decision supersedes their local-runtime prerequisites.

## ADR-015 — Versioned bucket edits and transactional continuity

**Status:** Accepted, 2026-09-02.

**Decision:** Keep lists, ideas, and steps normalized. An idea carries a monotonic version changed by item and step mutations. Step RPCs lock the parent before checking the version and validate the complete reorder permutation. Source-locking conversion RPCs return the existing plan/direct memory on retry. Completion derives actor and time from the database session. Deleting an idea removes steps but preserves plans/memories with nullable source links; a list must be empty before deletion.

**Consequences:** Stale edits fail visibly instead of overwriting another partner's work. Bound lists to 100 per couple, steps to 50 per idea, and idea pages to 12 with UUID cursor ordering. This is stable identifier order, not a claim of newest-first chronology. Category filtering travels in a server-action body, never a URL. Sequential stale-version/retry tests prove rejection and idempotency; simultaneous-session timing remains a separate verification obligation.

## ADR template

```markdown
## ADR-NNN — Title

**Status:** Proposed

**Context:** Why a durable decision is needed.

**Decision:** The chosen behavior/architecture.

**Consequences:** Benefits, costs, constraints, migration/rollback impact.

**Supersedes/links:** Related ADRs and specifications.
```
