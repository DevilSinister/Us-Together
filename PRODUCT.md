# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are two adults in a romantic relationship who want a private, shared space for planning experiences, preserving memories, exchanging meaningful notes, and learning each other's preferences. They may use the product together or independently, primarily on mobile browsers and also on desktop.

Each account belongs to an individual. Shared access exists only through an explicit couple membership. The initial product supports exactly two active partners in a couple.

## Product Purpose

Us Together helps partners move through one connected relationship loop:

```text
Dream -> Plan -> Experience -> Memory -> Our Story
```

It should replace scattered notes, albums, calendars, and gift hints with a coherent, private space that feels personal rather than administrative. Success means partners return because the product makes their shared life easier to remember and more enjoyable to plan.

## Positioning

Us Together connects planning, personal knowledge, surprises, and memories around a couple-owned data model. Its distinguishing mechanism is continuity: a bucket-list idea becomes a plan, the completed plan becomes a memory, and meaningful memories become the couple's story.

## Operating Context

- Partners can use the app separately without exposing author-private or surprise information.
- Mobile use is critical for quick additions, media uploads, reminders, and viewing plans while away from home.
- Dates and scheduled delivery are stored in UTC and displayed in each user's configured timezone.
- The launch language is English, with locale-aware dates and ISO currency codes. Multilingual UI is future work.
- The production target is Vercel plus managed Supabase. Development and database verification use the confirmed hosted project without requiring Docker/Podman; real-account pairing is deferred to final integration (ADR-014).

## Capabilities and Constraints

### Dream-to-Memory MVP

- Verified email/password authentication and recovery
- Profiles, couple creation, secure invitations, pairing codes, and onboarding
- Dashboard and relationship counter
- Bucket lists, subtasks, plans, internal calendar, and reminders
- Memories with private photo/video storage
- Personal wishlists with purchaser-only secret state
- Shared and author-private notes
- Basic milestones, notifications, profile/notification settings, leave and empty-couple deletion
- Full account lifecycle, export and broader deletion completion are on hold by owner direction; tracked in Release 2
- Responsive, accessible, installable PWA shell

### Release 2

- Protected vault, explicitly not marketed as E2EE or zero knowledge
- Surprise, scheduled, and open-when notes
- Know Me, Our Story, richer milestones, Google Calendar, push, realtime enhancements, and search

### Later

- Rule-based date suggestions, couple questions, richer trip planning, advanced reminders, AI-assisted planning, and potential native apps

The product is multi-tenant from the first migration. Every couple-owned record carries a `couple_id`; user-owned and secret records additionally carry explicit ownership. Relational data is normalized where appropriate. Authorization cannot rely on client-supplied user IDs, couple IDs, owners, or storage paths.

Billing, pricing, legal entity, launch date, final brand assets, and AI provider are open decisions.

## Brand Commitments

The working name is **Us Together**. The product promise is “our own private little world.” The voice is warm, direct, intimate, and natural without becoming childish, saccharine, or corporate.

The visual commitment is premium, cozy, romantic, and modern, using rose/pink language with restraint. Hearts are accents, not the interface's primary motif. The application must not look like a generic dashboard, a default component library, or a seasonal Valentine's template.

## Evidence on Hand

The product-owner prompt remains the primary discovery input. Shipped evidence now includes responsive auth/onboarding/pairing, a privacy-safe relationship dashboard, basic milestones and content-minimal notifications/preferences, full plan/calendar/checklist flows, in-app reminders and private plan attachments, full memory editing and private photo/video upload/view/delete flows, a managed Supabase schema, and automated desktop/mobile browser coverage. There is still no user research, production customer data, final logo/photography library, customer proof, pricing, or performance benchmark; future work must not fabricate them.

## Product Principles

1. **Privacy is behavior.** Hidden information must be unqueryable by unauthorized users, not merely absent from the UI.
2. **Connect the relationship journey.** Features should pass meaningful context forward instead of becoming isolated CRUD modules.
3. **Feel personal, not administrative.** Language, hierarchy, and first-run states should foreground the couple's life.
4. **Earn trust through clarity.** Security limitations, sharing state, scheduling, and destructive actions must be explicit.
5. **Ship in verified increments.** Each phase ends working, tested, documented, and deployable.

## Accessibility & Inclusion

Target WCAG 2.2 AA for application surfaces. Support keyboard and screen-reader use, visible focus, sufficient contrast, reduced motion, accessible validation, appropriate touch targets, and non-color status cues. Do not assume gender, marriage status, shared surname, physical ability, culture, or relationship duration.

## Phase 6 shared calendar and media extension

Home and navigation expose a shared Calendar with plans, memories and moments. Memories and moments accept multiple photos/videos during creation and on their detail pages, individual captions, comments on each photo/video and shared story comments. Memories and Moments listings and entry detail pages show six small photo previews. Previews open a swipeable viewer; Show more opens that entry's photos and videos in the shared Gallery route. Home opens a combined gallery grouped by memory/moment or date, with type and date filters. Developer preview supports real browser-local files and comments. Reminders apply to plans; memories and moments have no reminder controls or delivery. Manual coordinate fields are removed. Location suggestions and user-triggered nearby lookup use free Photon/OpenStreetMap with no paid API key; a place name remains editable when lookup is unavailable.

## Current owner direction — 2026-09-05

Phase 7 wishlists/private gift plans and shared/private notes are implemented. The owner confirms manual testing of Phase 7 changes, account creation, linking and sync. This is user-reported manual evidence, separate from automated release checks. Keep current gallery changes; do not reopen the previous issue without a new report or instruction. Account lifecycle completion is on hold. [Release 2](docs/release-2/README.md) owns future features and implementation/verification carryovers.

Use OpenStreetMap-based APIs wherever location is mentioned, reusing Photon for search/nearby lookup. Follow the project-wide [location policy](docs/release-2/LOCATION_POLICY.md), including attribution, explicit geolocation permission and editable-place fallback.
