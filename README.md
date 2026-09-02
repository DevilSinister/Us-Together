# Us Together

**Us Together** is a private digital space where two partners can remember what they have shared, plan what comes next, and know each other better. It is designed as a multi-tenant SaaS rather than a single-couple application.

> Remember what you've shared. Plan what comes next. Know each other better.

## Status

The project now has its **Phase 1–4 MVP implementation** plus active Plans/Memories vertical slices: a Next.js application shell, typed Supabase SSR clients, authentication/profile recovery, hardened couple pairing, a privacy-safe relationship dashboard, basic milestones, content-minimal in-app notifications/preferences, bucket lists with ordered steps, filters and completion, retry-safe Bucket-to-Plan/Memory conversion, and the direct Plan-to-Memory journey. The migrations are applied to the managed Us-Together Supabase project; application deployment is still pending.

The deterministic paired developer fixture (Alex + Maya) now includes a featured milestone and generic unread notification. Playwright covers the named-partner, Plan-to-Memory, milestone, notification, preferences, mobile, keyboard, and reduced-motion journey.

## Product pillars

- **Remember:** memories, media, milestones, and the relationship timeline.
- **Plan:** dates, trips, activities, reminders, and bucket-list goals.
- **Know & surprise:** preferences, wishlists, notes, gifts, and carefully protected surprises.

## Current stack

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS and a heavily customized shadcn/ui foundation
- Supabase Auth, PostgreSQL, Storage, Realtime, and scheduled/server capabilities where appropriate
- Zod and Lucide
- Vercel for application hosting and managed Supabase for production data services

Exact package versions are pinned in `package-lock.json`. Current official documentation and changelogs must still be checked before each platform phase.

## Documentation

| Document | Purpose |
| --- | --- |
| [Product](PRODUCT.md) | Durable product truth and boundaries |
| [Architecture](ARCHITECTURE.md) | System topology, trust boundaries, and data flows |
| [Agent instructions](AGENTS.md) | Mandatory implementation and skill rules |
| [Design](DESIGN.md) | Shipped interface tokens and durable visual rules |
| [Design brief](docs/DESIGN_BRIEF.md) | Product-level experience and visual intent |
| [Features](docs/FEATURES.md) | Release-scoped behavior and acceptance criteria |
| [UX flows](docs/UX_FLOWS.md) | End-to-end user journeys and failure paths |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Phases, dependencies, and completion gates |
| [Database](docs/DATABASE.md) | Entities, relationships, constraints, indexes, and RLS matrix |
| [API contracts](docs/API_CONTRACTS.md) | Planned server action and route contracts |
| [Security](docs/SECURITY.md) | Threat model and security controls |
| [Vault](docs/VAULT.md) | Protected media design and security limitations |
| [Google Calendar](docs/GOOGLE_CALENDAR.md) | Privacy-aware OAuth and synchronization design |
| [Testing](docs/TESTING.md) | Test strategy and mandatory negative scenarios |
| [Setup](docs/SETUP.md) | Planned local development and environment setup |
| [Deployment](docs/DEPLOYMENT.md) | Vercel/Supabase environments and release process |
| [Operations](docs/OPERATIONS.md) | Monitoring, backups, incidents, and maintenance |
| [Decisions](docs/DECISIONS.md) | Architectural decision log |
| [Traceability](docs/TRACEABILITY.md) | Master-prompt requirement mapping |

## Local workflow

```bash
npm ci
npm run dev
```

For local interface testing without Supabase, set `DEV_LOGIN_ENABLED=true` in `.env.local`, open `/sign-in`, and choose **Enter paired preview** for Alex + Maya or **Test onboarding from scratch** for a clean solo account. This server-only bypass is forcibly disabled whenever `NODE_ENV=production`.

The expected quality commands are:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:rls
npm run test:e2e
npm run build
```

The application quality commands are runnable now without containers. Hosted migrations and rollback-only RLS verification are supported; Docker/Podman is optional. Real pairing is deferred to final integration, and clean migration replay remains an open release gate. See [Setup](docs/SETUP.md) and [Phase 4 evidence](docs/PHASE4_VERIFICATION.md).

## Security posture

Security is part of product behavior. Couple isolation, author-private notes, purchaser-only wishlist state, and protected vault media must be enforced in PostgreSQL/Storage policies and server-side authorization. Frontend filtering never counts as authorization. See [Security](docs/SECURITY.md).

## Open product decisions

Billing, pricing, legal entity, launch date, final brand assets, and any future AI provider remain deliberately undecided.
