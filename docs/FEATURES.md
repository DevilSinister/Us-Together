# Feature Specification

## Release legend

- **MVP:** Dream-to-Memory first usable release
- **R2:** protected and richer relationship features
- **Later:** rule-based suggestions, advanced planning, AI, and native possibilities

Unless noted otherwise, couple-owned features require an authenticated active member of the referenced couple. All acceptance criteria include RLS and server-side authorization.

## MVP foundations

### Authentication and profile

**Goal:** give each person an independently secured identity.

Behavior:

- Email/password signup with verification, login, logout, password reset, and session expiry handling
- Profile display name, avatar, timezone, optional date of birth, and onboarding state
- No social login or magic-link-first flow in MVP
- Account deletion revokes sessions, removes or anonymizes data according to ownership rules, and requires explicit confirmation

Acceptance:

- Unverified or invalid sessions cannot access couple data.
- Password and verification errors are clear without revealing whether unrelated accounts exist.
- User timezone drives presentation; persisted instants remain UTC.

### Couple and pairing

**Goal:** create a private space and connect exactly one partner.

Behavior:

- Create a couple with name and optional relationship start date
- Create a single-use expiring invite link or cryptographically random six-digit pairing code
- Pairing code has a digest at rest, expiry, attempt budget, rate limit, and consumed timestamp
- Acceptance transaction prevents duplicate membership and a third active member
- Either partner may leave after clear consequences; couple deletion follows documented authorization and confirmation rules

Acceptance:

- Expired, exhausted, consumed, malformed, or cross-account-reused invitations fail safely.
- Concurrent accept attempts cannot create a third membership.
- Database IDs are not used as pairing credentials.

### Onboarding

**Goal:** reach a meaningful shared state with minimal setup.

New-couple flow: account -> profile -> couple -> relationship date -> invite/code -> lightweight preferences -> app.

Joining flow: account -> redeem invite/code -> profile if needed -> app.

The partner invitation may be completed later. Optional personalization is skippable. A newly paired couple sees guided first actions rather than an empty admin dashboard.

### Application shell and PWA

- Desktop sidebar and five mobile bottom destinations: Home, Calendar, Lists, Memories, and More. More opens Plans, Moments, Profile, and Partner with keyboard focus containment and return. Bottom content spacing includes device safe areas.
- Light, dark, and system appearance
- Installable manifest and safe offline shell/fallback; no claim of offline data editing unless implemented
- Settings for account, couple, notifications, privacy, and appearance
- Accessible global loading, error, not-found, and session-expired behavior

## MVP relationship loop

### Home dashboard

Shows the most relevant available content: greeting, relationship counter, upcoming plan/countdown, bucket progress, recent memory, recent note, wishlist preview, and quick actions. Missing or private content is omitted without leaking its existence.

Acceptance:

- Relationship duration is calculated from the couple date in the viewer's timezone.
- No widget queries author-private, purchaser-only, surprise, or vault content without authorization.
- The first-run state leads to bucket, plan, wishlist, and note creation.

### Bucket lists

Entities: multiple-capable lists, items, and ordered subtasks.

The Bucket Lists landing page shows lists and a direct Add list action. Opening a list shows only its ideas, an Add idea action preselected to that list, and an All lists back link. Options filters and manages the opened list; resetting filters never switches to another list. Idea details return to their owning list.

Item behavior:

- Title, description, category, priority, estimated cost/currency, target date, location, and lifecycle status
- Add/remove/reorder subtasks with completion progress
- Filter by status/category/priority and paginate large lists
- Convert to a plan while preserving source linkage
- Complete with actor/time and offer memory creation

Statuses: `idea`, `planned`, `in_progress`, `completed`.

Priorities: `low`, `medium`, `high`, `dream`.

Acceptance:

- Reordering is transactionally consistent and keyboard-accessible.
- Conversion is idempotent from repeated submission and does not silently duplicate linked plans.
- Completion and memory creation remain separate, recoverable actions.

### Plans and internal calendar

Plan fields include title, description, type, start/end instant, originating timezone, location, external map URL, budget/currency, status, and source bucket item.

Types: `date`, `trip`, `activity`, `birthday`, `anniversary`, `event`, `reminder`, `other`.

Statuses: `planned`, `completed`, `cancelled`.

Capabilities:

- Month, week, and upcoming views with mobile-specific layouts
- Ordered checklist, attachments/notes, reminders, and location/budget details
- Link completed plan to memories
- Differentiate event types using label/icon plus color

Acceptance:

- Invalid end-before-start and unsupported timezone values are rejected.
- Calendar boundaries are tested around daylight-saving changes and user timezone differences.
- Private external calendar data is absent in MVP.

### Memories

- Title, description, date, location, rating, favorite, tags, and provenance
- Free Photon/OpenStreetMap place suggestions and user-triggered nearby lookup; no manual coordinate fields
- Multiple photos/videos with captions and comments; local photo testing in developer preview
- Memories and moments appear alongside plans on the shared calendar and support reminder notifications
- Separate media records for photos/videos and derivative metadata
- Private Storage buckets, validated uploads, paginated gallery, lazy media, lightbox/viewer
- Bucket/plan conversion pre-fills editable values and retains relationship links

Acceptance:

- Binary files are not stored in PostgreSQL.
- Unauthorized users cannot list metadata, obtain signed URLs, or infer paths.
- Invalid MIME, extension, size, or ownership fails before durable publication.

### Wishlists and secret purchases

Each wishlist item belongs to a user and couple and is visible to the owner and current partner. It supports title, description, product URL, manual image, price/currency, category, priority, and notes. MVP does not scrape product pages.

Purchase state lives in a separate purchaser-owned structure. Only the purchaser may create, read, update, or delete it. The owner must not receive a count, notification, realtime event, activity item, search result, or API field that reveals it.

Acceptance:

- Wishlist owner cannot query purchaser-only rows even through guessed IDs or joins.
- A purchaser cannot mark their own item as a secret partner purchase.
- Removing or separating a couple handles secret rows according to the deletion policy without disclosure.

### Notes

MVP types are `shared` and `private`.

- Shared notes are visible to both active members.
- Private notes are visible only to the author, even if they name the partner as recipient.
- Notes support title, plain/rich-safe content, optional attachments, and read state where applicable.
- Rendering sanitizes content; MVP must not introduce unsafe arbitrary HTML.

Acceptance:

- The partner cannot query the author's private note.
- Activity, notifications, search, and counts respect the same visibility.

### Milestones and notifications

Basic milestones support relationship, birthday, anniversary, travel, achievement, and custom types, with optional dashboard featuring. In-app notifications belong to a user and may refer to shared content. Secret/private/vault operations never create visible notifications for an unauthorized user.

## Release 2

### Vault

Protected photos, videos, audio, letters, and memories with temporary PIN/passkey-gated access, auto-lock, private storage, and server-authorized signed URLs. It is not E2EE. See [Vault](VAULT.md).

### Advanced notes

- `surprise`: recipient cannot discover the note before reveal
- `scheduled`: delivered at an explicit UTC instant derived from author timezone input
- `open_when`: author-defined label/condition with explicit recipient opening behavior

Scheduled jobs are idempotent and do not reveal content early.

### Know Me and Our Story

Structured and free-form favorites, preferences, likes/dislikes, happiness/avoid lists, and optional sizes. A timeline combines explicitly eligible milestones, completed items, plans, and memories without importing private content.

### Google Calendar

Voluntary per-user OAuth connection, calendar selection, explicit share controls, event import/create/update where supported, refresh/disconnect, and private-by-default external events. See [Google Calendar](GOOGLE_CALENDAR.md).

### Push, realtime, search, and export

- Push is opt-in per user and category and excludes secret content.
- Realtime is limited to useful shared changes.
- Search applies identical RLS/visibility rules to source records.
- Expanded export is authenticated, rate-limited, auditable, and delivered securely.

## Later releases

- Rule-based date generator using budget, time, location, indoor/outdoor, mood, and energy
- Couple questions with private answers and atomic reveal condition
- Places/maps, achievements, advanced trip collaboration and reminders
- Provider-neutral AI suggestions only after explicit privacy, consent, retention, evaluation, and safety decisions
- Potential iOS/Android clients; not assumed by current architecture contracts

## Cross-feature requirements

- Thoughtful first-run, empty, loading, error, offline, and permission states
- Pagination or bounded fetching for growing collections
- Audit events for pairing, disconnect, vault access, password/account changes without logging content
- Confirmations and consequences for irreversible actions
- Data export, record deletion, account deletion, and couple departure
- No fake controls, placeholder integrations presented as working, or hardcoded identities

### Shared calendar and entry details

Calendar is accessible from Home, desktop navigation, and mobile navigation. Month/week views include plans, memories and moments, source filters, keyboard day navigation and linked day agendas. The Plans page links to this shared calendar and retains plan management.

Memory and moment creation forms expose a multiple-file picker and individual captions before save. After the story is saved, files upload sequentially; the saved story survives file failures. Detail pages show the first six uploaded photos as small previews, an Open full gallery button for all photos/videos, uploads, caption editing and shared comments. Moment detail uses /milestones/[id]. Each entry accepts at most 30 files / 300 MiB, with the existing per-file limits. Captions and file comments appear in the shared viewer. Existing story comments remain on the memory/moment. Home links to /gallery, with memory/moment and date grouping plus source, media-type and date filters. Memories and moments do not offer reminders; plans retain them.

Reminders currently arrive in the in-app Notifications inbox. Push, email and SMS are not implemented. Preview includes a ten-second reminder test and real local photo storage, scoped to its browser session.
