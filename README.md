# Us Together

**Us Together** is a private digital space where two partners can remember what they have shared, plan what comes next, and know each other better. It is designed as a multi-tenant SaaS rather than a single-couple application.

> Remember what you've shared. Plan what comes next. Know each other better.

## Status

The project now has its **Phase 1 MVP foundation**: a Next.js application shell, Supabase SSR authentication boundaries, profile and password-recovery flows, theme support, an installable PWA shell, and the first RLS-protected profile migration. Couple pairing and the Dream-to-Memory feature loop begin in Phase 2. No production infrastructure has been provisioned.

The current development build also includes the first Phase 2 vertical slice: guided onboarding, optional profile-photo upload, relationship start date, secure pairing-code contracts, database-enforced two-partner membership, and a local developer preview that exercises the flow without Docker.

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
npm install
supabase start
npm run dev
```

For local interface testing without Supabase, set `DEV_LOGIN_ENABLED=true` in `.env.local`, open `/sign-in`, and choose **Enter developer preview**. This server-only bypass is forcibly disabled whenever `NODE_ENV=production`.

The expected quality commands are:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The application quality commands are runnable now. Local database reset and RLS tests additionally require a Docker-compatible runtime. See [Setup](docs/SETUP.md).

## Security posture

Security is part of product behavior. Couple isolation, author-private notes, purchaser-only wishlist state, and protected vault media must be enforced in PostgreSQL/Storage policies and server-side authorization. Frontend filtering never counts as authorization. See [Security](docs/SECURITY.md).

## Open product decisions

Billing, pricing, legal entity, launch date, final brand assets, and any future AI provider remain deliberately undecided.
