# Agent Instructions

These instructions apply to all work in this repository.

## Knowledge vault

The Obsidian vault at `D:\obsidian\agents` is the cross-session memory for this repository and its siblings. This project's folder is `Us Together`.

Before starting work, read `00 - Shared/Vault Reading Protocol.md`, `00 - Shared/Cross-Project Lessons.md`, and `00 - Shared/Windows Environment Traps.md`, then `Us Together/README.md`, `Us Together/80 - Delivery/Project Status.md`, and `Us Together/70 - Bugs and Risks/`. The vault records why past work failed and which gates are blocked at the machine level; this repository records what the code currently is. When they disagree, the repository wins on code and the vault wins on history — reconcile both in the same change.

Before reporting material work complete, update the relevant `Us Together` focused note, its domain index, `Project Status`, and `Verification Evidence`, recording the final result of every gate that ran and naming every gate that did not. Follow `Us Together/90 - Agent Handbook/Vault Maintenance Protocol.md`. Lift a genuinely general lesson into `00 - Shared/Cross-Project Lessons.md`. Never store credentials, project references, private URLs, or personal relationship content in the vault.

## Product source of truth

Read `PRODUCT.md`, `ARCHITECTURE.md`, the relevant documents in `docs/`, and any nearer `AGENTS.md` before changing the project. If code and documentation disagree, stop and determine whether the implementation or the documented decision is stale. Update the appropriate source of truth in the same change.

Do not create `DESIGN.md` before a real interface has been implemented and visually verified. Before that point, `docs/DESIGN_BRIEF.md` describes intent. After the first verified surface, generate `DESIGN.md` from shipped visual truth using Impeccable's document workflow.

## Required skill routing

Use installed skills when their trigger applies. If a required skill is unavailable, state that limitation and follow current official primary documentation.

| Work | Required skills/capabilities |
| --- | --- |
| Product truth, new UI, onboarding, responsive behavior, visual audits | `impeccable` |
| Supabase Auth, PostgreSQL, RLS, Storage, Realtime, migrations, Edge Functions | `supabase` |
| Schema design, indexes, query plans, RLS performance, connections, locking | `supabase-postgres-best-practices` |
| Architecture or cross-file analysis once a graph exists | `graphify` query first; update the graph after major phases |
| Signed-in browser flows, desktop/mobile verification, visual inspection | `browser:control-in-app-browser` |
| Original raster art required by an approved design | `imagegen`; never use it as UI chrome or a substitute for HTML/CSS |
| Future OpenAI integration | `openai-docs`; official OpenAI sources only |

Do not use Sites for this Next.js/Vercel project unless the hosting decision changes or `.openai/hosting.json` is deliberately introduced. Document, PDF, presentation, and spreadsheet skills apply only if the requested artifact uses those formats.

### Supabase rules

- Before each Supabase phase, read the current Supabase changelog for relevant breaking changes and current official docs.
- Discover CLI commands with `supabase --help`; do not guess flags.
- Enable RLS on exposed tables and write ownership-aware policies. `TO authenticated` alone is not authorization.
- UPDATE policies require both `USING` and `WITH CHECK`, plus a compatible SELECT policy.
- Prefer security-invoker views. Treat every security-definer function as exceptional, private-schema code with revoked default execution and explicit authorization.
- Never use user-editable metadata for authorization and never expose service-role/secret keys to clients.
- Run database/security advisors and the negative RLS suite before accepting a migration.

## Implementation behavior

- Work phase by phase according to `docs/IMPLEMENTATION_PLAN.md`.
- Derive identity from the authenticated server session. Never trust client ownership fields.
- Validate every boundary with Zod and authorize every mutation.
- Keep sensitive mutations server-side. Keep secrets and private content out of URLs, logs, analytics, notifications, activity, search, and shared realtime channels.
- Use migrations for schema changes and commit the lockfile with pinned dependencies.
- Preserve normalized relational data; do not hide the application state in JSON blobs.
- Do not add fake buttons, fake integrations, placeholder authentication, hardcoded couple IDs, or TODO behavior presented as complete.
- External integrations that need credentials must still have complete architecture, environment examples, disabled-state UX, and setup documentation.
- Preserve unrelated user changes. Do not use destructive Git/filesystem operations without explicit authorization.

## Phase completion gate

A phase is incomplete until all applicable items pass:

1. Unit, integration, authorization/RLS, and browser tests
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`
6. Migration reset/application and migration-list verification
7. Supabase database/security advisors
8. Desktop and mobile verification, including keyboard and reduced-motion behavior
9. Secret scan and confirmation that no sensitive data is logged
10. Documentation and `docs/TRACEABILITY.md` update

If a command does not exist yet, create it in the foundation phase or clearly report the missing gate. Never silently skip a gate.

## Documentation maintenance

- Keep enum names, release labels, ownership rules, and action names consistent across documentation and code.
- Record durable architectural changes in `docs/DECISIONS.md`.
- Update `docs/API_CONTRACTS.md` for public server interfaces and `docs/DATABASE.md` for schema/policy changes.
- Update the Graphify corpus after major implementation phases. If `graphify-out/graph.json` exists, query it before repeating manual architecture exploration.
- Do not commit real credentials, project references, private URLs, tokens, or production data to documentation or examples.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Current owner direction — 2026-09-05

- Read `docs/release-2/README.md` and its backlog before choosing follow-up work.
- Account lifecycle completion is on hold; do not resume without explicit owner direction.
- Phase 7, account creation, linking and sync have owner-reported manual testing; keep automated evidence distinct.
- Preserve current gallery changes unless a fresh regression or explicit request reopens them.
- Use OpenStreetMap-based APIs wherever location functionality is mentioned; reuse Photon and follow `docs/release-2/LOCATION_POLICY.md`.
