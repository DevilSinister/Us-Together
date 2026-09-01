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

## Open decisions

- Billing/pricing and legal/retention requirements
- Final brand identity, logo, imagery, and product domain
- Exact leave/couple-deletion shared-data policy before lifecycle implementation
- Initial numeric quotas, rate limits, signed URL lifetime, and backup objectives after platform measurement
- Rich-text representation for notes
- Background-job mechanism after current platform evaluation
- Future AI provider, consent, retention, and evaluation policy

## ADR template

```markdown
## ADR-NNN — Title

**Status:** Proposed

**Context:** Why a durable decision is needed.

**Decision:** The chosen behavior/architecture.

**Consequences:** Benefits, costs, constraints, migration/rollback impact.

**Supersedes/links:** Related ADRs and specifications.
```
