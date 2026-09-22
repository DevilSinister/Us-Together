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

## ADR-016 — Internal calendar and transactional plan reminders

**Status:** Accepted implementation decision, 2026-09-02.

**Decision:** Extend the existing Plans surface with upcoming, month and week views and a selected-day agenda on mobile. Query a bounded UTC window, classify exact days in the viewer timezone, preserve multi-day intervals and paginate with start instant/UUID. Do not add Google Calendar in MVP. Reject DST gaps; repeated times require an explicit earlier/later choice. Local-time edits include a resolved preview before save.

Use a monotonic parent revision and security-invoker mutation RPCs with row locks. Active members can manage retained shared plans. Cancel/complete stops pending reminders; restoring a plan does not automatically reactivate cancelled notifications.

Deliver in-app reminders with Supabase pg_cron every minute and a revoked private security-invoker worker running as postgres. This requires no service-role application key or external scheduler credential. Each reminder's fan-out is atomic, content-minimal, preference-aware, and uniquely keyed by delivery/recipient. Isolate failures, retry with exponential backoff, and stop at five failed attempts. Monitor backlog and safe failure counts; a manual operator retry preserves the delivery key.

**Consequences:** Per-minute delivery is best effort, not a hard real-time guarantee. Real concurrent-session timing and real-account journeys remain ADR-014 final integration gates. Calendar/timezone units, hosted RLS/worker assertions and desktop/mobile fixture journeys provide phase evidence.

## ADR-017 — Private plan documents and explicit cleanup

**Status:** Accepted implementation decision, 2026-09-02.

**Decision:** Plan attachments use a separate private Storage bucket and normalized metadata, with PDF/PNG/JPEG limited to 2 MiB. Server Actions authorize and inspect signatures before upload. Downloads proxy through a freshly authorized route with forced attachment/no-store responses, rather than distributing signed object URLs to the page. The developer preview exposes no fake uploader.

Create pending metadata before the binary; failed or interrupted uploads remain removable. Delete binaries before metadata, and require attachment removal before plan deletion. Add database guards so direct Data API deletion cannot orphan stored files.

**Consequences:** Account/couple deletion must clean Storage first in Phase 8. File-signature validation does not imply malware scanning. The real-account binary round trip remains explicitly unclaimed until final integration; current tests verify signatures, limits and hosted path authorization.

## ADR-018 — Private memory media with authenticated resumable upload

**Status:** Accepted implementation decision, 2026-09-02.

**Decision:** Keep the memory story and normalized tags in PostgreSQL. Allocate immutable media metadata through a JWT-protected Edge function that also authenticates the user and authorizes the parent through RLS. Send bytes directly to private Storage using authenticated TUS; never expose an elevated key. Revoke direct client metadata writes and Storage overwrite/delete.

Finalization uses a five-minute fenced lease, checks actual bytes/container dimensions/duration, decodes images and creates oriented metadata-stripped JPEG previews. Pin the ImageMagick WASM decoder; when the deployment bundle omits its binary asset, fetch the exact public package asset and verify its SHA-256 before use. No private media is sent to the CDN. Videos retain native playback without a transcoding or automatic-caption promise.

Serve application reads through fresh authorization and sixty-second signed redirects. Remove Storage objects before metadata and require file removal before deleting a memory. Interrupted uploads/processes/removals remain visible and retryable. Per-user request budgets and transactional per-memory quotas bound work.

**Consequences:** Decoder availability affects image finalization; failure leaves unpublished recoverable state. Pause/resume lasts while the page stays open; private TUS URLs are not persisted. Originals can retain metadata. Signed URLs already issued remain usable until expiry. Manual member/operator cleanup covers abandoned uploads; automatic garbage collection and account-wide Storage cleanup require later lifecycle work. This is access-controlled shared storage, not end-to-end encryption. See Phase 6 operations and ADR-014 for final integration gates.

## ADR-020: Shared calendar, visible entry media and free location lookup

**Status:** Accepted, user-directed Phase 6 extension.

**Decision:** Add a standalone Calendar accessed from Home/navigation, projecting plans, memories and moments with independent bounded cursors. Moments retain the existing milestone relational model and gain detail routes, private media, shared comments and personal reminders. Memory/moment creation includes multi-file selection and captions; save the authorized story before sending binary files so upload failures preserve it. Use real IndexedDB files for developer preview, isolated by session and entry. Preview due notifications are computed without background cookie mutations.

Remove manual coordinates from memory/plan UI and current memory DTOs; preserve legacy database columns/migrations. The user declined paid Google Places, so use free Photon/OpenStreetMap suggestions and explicit nearby lookup, with attribution, throttling, generic failures, configurable service endpoint and manual fallback. Store selected bounded place labels, not coordinates. Google Calendar OAuth remains a separate R2 feature.

**Consequences:** The community geocoder has no availability guarantee and may throttle substantial traffic; its endpoint can be changed without changing the app. Preview media is local and expires after 24 hours, with deletion on later access, and does not simulate partner synchronization. Notifications are in-app, not push/email/SMS. Photos have individual captions; comments attach to their parent entry.

## ADR-021 — Galleries and comments belong to individual files

**Status:** Accepted; supersedes the entry-reminder part of ADR-020.

**Context:** The owner requested removal of reminders from memories/moments, compact six-photo previews, a full gallery and a Home gallery with comments on each photo.

**Decision:** Keep plan reminders. Retire entry reminders throughout UI/API/cron while retaining historical rows. Show the first six uploaded images on Memories and Moments listings and details. Show more navigates to /gallery scoped by validated kind and entry UUID, with every photo and video available. Listing media loads near the viewport. Photo viewers support horizontal touch swipes, arrow keys and Previous/Next buttons; videos retain native controls. Reuse one viewer for entry and Home galleries. Show captions and per-file partner comments within the viewer; preserve older story-level comments separately. Add normalized media_comments with ownership-aware RLS and a 500-comment per-file bound. Use a security-invoker shared_gallery view and 48-file keyset pages, grouping by source or story date. Preview uses the same interaction with session/entry/file-scoped IndexedDB records.

**Consequences:** Gallery navigation and comment edits share one media identity. Photo deletion cascades its comments after Storage cleanup. Comments load on opening a file, and Refresh comments retrieves partner updates; no realtime subscription is claimed. The original story date determines date grouping, not EXIF or upload time.

## ADR-022 — Lists before ideas and five mobile destinations

**Status:** Accepted, user-directed UI follow-up, 2026-09-04.

**Decision:** `/bucket` browses lists and offers Add list. `/bucket/lists/[listId]` opens one authorized list and its paginated ideas. Add idea links to `/bucket/new?list=<UUID>` and preselects an existing authorized list; details return to the owning list. Options retains filters and rename/empty-delete for the current list. Resetting filters preserves the list. Only opaque IDs enter these URLs, never titles or idea content. Reuse existing authenticated loaders and mutation validation; no database or ownership changes.

Phone navigation has Home, Calendar, Lists, Memories and More. More opens an accessible modal containing Plans, Moments, Profile and Partner. Preserve the desktop sidebar and reserve bottom safe-area space for content.

**Consequences:** The list landing page no longer queries all ideas. A list route validates its UUID and checks it against the session-authorized list result before loading ideas; missing and inaccessible lists return the same 404. Bucket mutations invalidate the list route pattern as well as existing destinations. Existing partner-refresh behavior remains in place.

## ADR-023 — Purchase secrets cascade, and Phase 7 has no developer-preview store

**Status:** Accepted, 2026-09-04.

**Decision:** A purchase secret references its wishlist item `on delete cascade`, not `on delete restrict`. Only the purchaser holds any privilege on the secrets table, and `private.can_hold_purchase_secret` additionally requires that the caller is not the item owner. No view, aggregate, count or notification joins an item to a secret, and the server returns one generic message whether a probed item was missing or forbidden.

Wishlists and notes read and write only through a connected Supabase account. The developer preview keeps no local wishlist or note store and shows the standard pairing notice instead.

**Consequences:** Deleting a wish silently removes a partner gift plan. That is the point: `restrict` would surface a foreign-key error to the owner and prove a secret existed, which fails the phase exit gate. The cost is that a purchaser can lose a plan without explanation when the owner removes the wish, which is the correct trade against disclosure.

Because there is no preview store, these two surfaces cannot be exercised by the local dev-login fixture, so their forms are verified by the hosted assertion suite, types, lint and build rather than by preview screenshots. Building a second local source of truth was rejected as fake behavior presented as complete.

## ADR-024 — Release 2 carryovers, manual acceptance and account lifecycle hold

**Status:** Accepted, owner-directed, 2026-09-05.

**Decision:** Record owner manual testing of Phase 7 changes, account creation, linking and synchronization. Defer remaining implementation and automated verification to `docs/release-2/`. Account lifecycle completion is on hold and requires an explicit instruction to resume. Preserve existing gallery changes; the owner believes Claude probably fixed the issue and asks not to reopen it now.

**Consequences:** Manual evidence is valid and recorded separately from automated tests. Historical gaps are retained as deferred work, not erased or represented as passed. This is a scope/status decision, not a change to existing authorization rules, application behavior or future phase gates.

## ADR-025 — OpenStreetMap wherever location is involved

**Status:** Accepted, owner-directed, 2026-09-05; extends ADR-020 project-wide.

**Decision:** Use OpenStreetMap-based services for every location-bearing feature. Reuse authenticated Photon search/nearby lookup, editable place labels and explicit geolocation permission. Follow [location policy](release-2/LOCATION_POLICY.md). Do not introduce Google Places or a paid proprietary default. Google Calendar remains independent of location lookup.

**Consequences:** Future map/routing capabilities choose a suitable OpenStreetMap-based service with policy/attribution review before implementation. No endpoints, coordinates, existing map links or schema are changed by this documentation update.

## ADR-026 — Finished drawings and a minimal Android widget

**Status:** Accepted by the owner, 2026-09-16; source implemented, release gates open.

**Decision:** Keep existing editable shared/private text notes unchanged. Add a distinct immutable drawing-note table and private PNG bucket. The web editor keeps local drafts, previews before send and publishes only after validated upload. Android reads the latest received drawing with its own Supabase session, keeps one app-private image cache and opens the web detail on tap. Use content-free normal-priority FCM data messages for prompt refresh, with app-open, reconnection and periodic refresh as backups. Android is first and the first package is a private APK.

**Consequences:** A fixed delivery deadline cannot be promised under Android background limits. A home-screen drawing is visible to anyone viewing that phone. Server and Firebase credentials are required for push but not for sending or manual refresh. Database migration and device testing precede release; text-note edit/privacy behavior remains intact.

## ADR-027 — Separate Drawings and a compact canvas workspace

**Status:** Accepted by the owner, 2026-09-17.

**Decision:** Drawings has a distinct destination from editable text Notes. Its editor uses a fixed 4:3 canvas, icon buttons with accessible names, preset swatches instead of a custom color picker, and a size slider for stroke tools. The same private, immutable send and widget flow remains.

**Consequences:** The editor and drawing history use a playful paper treatment while retaining the established brand colors. Canvas-first headings are deliberately compact. No schema, API or Android change is needed.

## ADR-028 — Full offline Android product target

**Status:** Superseded by ADR-032 on 2026-09-20. Retained for history.

**Decision:** Deliver every current Us Together feature through one Android APK. Existing Supabase Auth, database and private Storage remain the synchronization service; the Android UI and prior authorized data must work offline. The Next.js app remains the functional baseline until native parity is verified. The widget opens a native cached drawing screen instead of a web route.

**Consequences:** This is a full client migration with local data security, queued mutations, conflict rules, native feature screens and device acceptance. The current debug APK is not a standalone replacement. See [Android offline migration](ANDROID_OFFLINE_MIGRATION.md). This decision supersedes ADR-026's widget web tap, while its private Storage and immutable drawing rules remain.

## ADR-029 — Android is the product target

**Status:** Superseded by ADR-032 on 2026-09-20. Retained for history.

**Decision:** Build Us Together as a native Android app, not a webapp or hosted WebView. Use the existing Next.js implementation only as a behavior and data-contract reference while native parity is built. Keep Supabase as the shared synchronization backend. The first native offline mutation is a drawing: it is saved locally with a stable ID, then published through existing RLS-protected tables and private Storage when connected.

**Consequences:** A compiled APK is not release acceptance. Every existing feature still needs native screens and offline data behavior; privileged and conflict-prone actions need equivalent server authorization. The native drawing send path needs device and paired-account verification before it is trusted.
## 2026-09-17 — content-minimal partner activity

Partner activity fans out from database triggers on shared rows, with fixed strings and target IDs. This covers web and future Android mutations through one Supabase boundary, subject to recipient membership and preferences. File activity waits for ready state. Private notes and purchaser-only gift state never enter this path. The native APK reads a bounded inbox and caches generic envelopes per account; prompt Android background alerts require separate Firebase delivery and are not claimed here.

## ADR-030 — Web section locks before native parity

**Status:** Owner-directed, 2026-09-17; web source and hosted migration implemented.

**Decision:** Ship per-account selectable locks in the existing web Settings first. Use a code as universal fallback; offer platform device unlock only when WebAuthn PRF and user verification work in the current browser. Enforce selected areas through authenticated-session-bound database RLS and Storage policies, with route gates for understandable UI.

**Consequences:** Calendar and Our Story inherit source-area restrictions. Current Android cached data and downloaded files are outside this web lock; native parity needs encrypted cache and device acceptance. A forgotten code has no self-service recovery yet, so settings explains that limitation. This does not enable the separately specified Vault.

## ADR-031 — Guided heart-keypad PIN flow

**Status:** Owner-directed, 2026-09-17; web source and hosted migration implemented.

**Decision:** Use a numeric PIN screen with heart-shaped digit buttons for selected web sections. New PINs have four or six digits. Setup proceeds through length, create and confirm; change proceeds through current PIN, new length, create and confirm. The server rechecks the current PIN in the final change transaction and revokes active unlocks.

**Consequences:** Four-digit PINs rely on the existing five-attempt cooldown. Existing longer codes continue working until changed. Device unlock on the current browser is removed after a PIN change; other browsers retain encrypted wrappers of the old PIN but server verification rejects them. The separate Vault specification remains unimplemented.

## ADR-032 — One Android APK: web app in a Trusted Web Activity, native widget, FCM

**Status:** Owner-directed, 2026-09-20; source implemented, device acceptance open. Supersedes ADR-028 and ADR-029.

**Decision:** The Android deliverable is a single release-signed APK, package `app.ustogether`, that both partners sideload. Its launcher opens the deployed web app as a Trusted Web Activity, so every feature is the web feature and the web session is the app session. A native side, reached by long-pressing the icon or from the widget, holds its own Supabase session for the home-screen drawing widget, the offline drawing outbox and Firebase Cloud Messaging. The two sessions are not bridged; each is signed into once. Android push rides the database exactly as Web Push does: every `notifications` row fans out to the recipient's registered devices through `fcm_deliveries`, a per-minute worker posts content-free envelopes to the `fcm-dispatch` Edge Function, and settlement retires dead tokens. A registered token is the opt-in; sign-out deletes it. Drawings are sent at high priority so Doze wakes the widget; other categories are normal priority. Web Push is hidden inside the shell so one event never rings twice.

**Consequences:** No native feature parity work remains; the full offline product in ADR-028/029 is abandoned and `docs/ANDROID_OFFLINE_MIGRATION.md` is history. ADR-026's immutable drawings and private Storage and ADR-013's content-minimal payloads are unchanged. Asset links require a stable release keystore that only the owner holds. A drawing sent from the native editor now reaches the partner's widget through the same path as a web send; the former web-route FCM call is deleted. Delivery latency is bounded by the cron minute. The debug APK proves compilation only; Trusted Web Activity verification, delivery and widget behaviour are owner device gates.

## ADR-033 — Per-user drawing read rows

**Status:** Owner-approved plan, 2026-09-20; migration and source implemented.

**Decision:** Record that a recipient opened a drawing in `drawing_reads` (primary key drawing, user), mirroring `note_reads`, rather than reusing `notifications.read_at`. Rows are insert-only under RLS: no UPDATE grant is issued and the application writes `ON CONFLICT DO NOTHING`. The author never writes a row. Lists look up read state only for the drawings on the current page.

**Consequences:** A "New" pill works even when the recipient has turned the drawing notification category off, and opening a drawing does not silently mark an inbox row read. The same change fixed `note_reads`: the previous upsert needed an UPDATE privilege the grant never gave, so every read mark failed with 42501 and the notes pill never cleared. Any future read-state table must be written insert-only for the same reason.

## ADR-034 — Partner presentation is your own record, not theirs

**Status:** Owner-approved, 2026-09-22; migration `20260922104847_partner_presentation_avatars` applied to the hosted project.

**Decision:** During onboarding an account chooses a name and a picture **for** its partner, and both live on the choosing account's side. `public.partner_presentations` holds one owner-scoped row per account; the image is an object under that account's own `avatars` folder. Resolution is per field: the name I chose wins, falling back to my partner's own `display_name` and then to "Your partner"; the colour I chose wins, falling back to `rose`; the picture I chose wins and **falls back to nothing**. `profiles.avatar_style` finally persists the colour the onboarding picker has been collecting and discarding for every real account since it shipped.

**Consequences:** No cross-account storage read exists anywhere in the feature, so the `avatars` bucket keeps its four own-folder-only policies unchanged. The picture chain must terminate rather than fall back to the partner's own `avatar_path`, because reading that would require precisely the policy this shape avoids; an account without a chosen picture renders initials on the chosen colour. The presentation cannot live on `profiles`: `profiles_select_self_or_partner` grants the whole row to the partner and RLS cannot hide one column from a row policy, so a nickname stored there would be readable by its subject. The row carries `confirmed_couple_id` so pairing with a different person prompts once rather than silently greeting them by a previous partner's name and face. Leaving a couple never deletes the row — re-pairing with the same person is the common case — so forgetting is an explicit control on `/profile`. `/api/avatar/[scope]` takes a closed pair of literals rather than an id, answers 404 for every failure, and proxies with `private, max-age=300` plus an ETag rather than the `no-store` the other private-media routes use, because an avatar is chrome the requester uploaded themselves and repeats many times per page.

## ADR-035 — Memories are rows, and the calendar legend is its filter

**Status:** Implemented, 2026-09-22.

**Decision:** The memories index shows a thumbnail, title, date and one line of story per row, grouped by month, superseding the date-grouped title-only shape of 2026-09-17. The shared calendar replaces its four exclusive filter buttons and its legend-less marker shapes with one row of three independent toggle chips, each showing its own marker shape beside its name, and deletes the per-day "N entries" line. Comment threads render as chat bubbles whose author is encoded by side, tail-corner radius, surface and avatar presence — never by hue.

**Consequences:** The 2026-09-17 title-only decision is revised knowingly: it was never seen in a browser before shipping, because the verification journey timed out at sign-in before reaching Memories. Three of the four new row fields cost no query — they were already selected and discarded — but the embedded media row needed an explicit `media_type, created_at` ordering, since `limit(1)` with no order returned an arbitrary file as the thumbnail. Author-by-hue was not viable in the comment thread because `--wine` and `--rose` are the same value in dark mode, and the old wine "You"/"Your partner" label also spent the single accent colour once per comment. `MonthGrid` is extracted and draws interior rules with a one-pixel gap over `bg-border`; the plans workspace deliberately does not adopt it, because it tiles its borders differently and never had the doubled-edge bug.

## ADR-036 — The native screens take the web tokens, without Material

**Status:** Implemented, 2026-09-22.

**Decision:** The four native Android screens adopt the web app's design tokens through `res/values` — a full semantic palette, a `values-night` warm-plum dark mode, a spacing and radius scale, a serif/sans type scale, and styled buttons — rather than adding `com.google.android.material`. Surfaces are built from shape and ripple XML.

**Consequences:** Material sells component behaviour — elevation, state layers, dynamic colour — that this flat, bordered, tonal language would then have to suppress, it would ship unshrunk into an APK built with `minifyEnabled false`, and because all three activities extend plain `Activity` rather than `AppCompatActivity` it would supply theme attributes without tinting anything. The module gains dark mode for the first time, from API 29 up. `brand`, `paper`, `cream`, `ink`, `plum` and `blush` keep no night variant because they are baked into the adaptive launcher and monochrome notification icons. Dark `on_primary` must be `#27161d`: warm white on the dark blush primary measures 2.49:1 and fails. Raising the widget's icon buttons to the 48dp touch floor requires `DrawingWidget.CAPTION_DP` to move 44 to 52 in the same change, because `fitted()` reserves that height when sizing the bitmap.
