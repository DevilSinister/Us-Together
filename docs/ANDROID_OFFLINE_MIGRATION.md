# Offline Android migration

> **Superseded on 2026-09-20 by ADR-032.** The Android deliverable is now the deployed web app in a Trusted Web Activity plus the native widget, outbox and FCM notifications in one APK; no native feature parity is planned. This document is kept as history of the direction it replaced. See `docs/DECISIONS.md` and `android-widget/README.md`.

Owner direction, 2026-09-17: one Android APK must expose every current Us Together feature, work while offline, and synchronize with the existing Supabase service when connectivity returns. The installed experience must not depend on a deployed Next.js UI or a browser sign-in. Supabase remains the shared backend for two-device synchronization.

## Current source truth

The owner has selected a native Android product instead of a webapp. The Next.js implementation remains the behavioral reference while the Android client is built. The Android module now has direct Supabase sign-in, a widget, cached received-drawing view, and a native editor with nine tools, local draft persistence and a per-account PNG send queue. Queued drawings retry through RLS-protected Supabase tables and private Storage when a network job runs. The native upload path is compiled but has not passed a device or paired-account round trip. The other product areas are not present in the APK, and a debug APK is not a replacement release.

## Required Android architecture

- Implement a local encrypted relational store for per-user, per-couple records and private media metadata. Partition by authenticated user and purge or lock data on sign-out, membership loss and account switch. Never cache a partner's private or surprise content in a shared projection.
- Keep mutations as typed local operations with a stable client operation ID, schema version, dependency order and retry state. Persist an operation before showing a successful offline save. Retry with network-constrained Android work, and show pending/conflict/failed state in each surface.
- Reuse the existing Supabase Auth account and RLS-protected data/Storage. Refresh the session serially before sync. Do not trust client-supplied ownership fields; privileged actions require an authenticated server API with the same authorization as the web action.
- Define per-domain conflict rules before writing: immutable drawings and media use create-only IDs; notes/profile/list edits need revisions and explicit conflict resolution; ordered checklist items need order semantics; pairing, membership, reveal, secret purchase and deletion are online-only until their server invariants can be preserved offline. Never silently overwrite a partner's change.
- Keep private media in app-private storage with bounded cache and cleanup. Show offline thumbnails only after prior authorized download. Upload queues must preserve file bytes, validate types and sizes, and fail visibly if authorization changes.
- Keep the widget backed by the same native repository and open the native drawing detail. Push is an optional wakeup; app-open, reconnection and durable work perform eventual sync.

## Feature parity work to finish before Android release

| Area | Native screen and local state | Offline mutation and sync |
| --- | --- | --- |
| Account and partner | Sign-in/recovery, onboarding, pairing, profile, membership state | Auth bootstrap and safe online-only membership operations |
| Home and notifications | Home, milestones, preferences, notifications | Per-user projection and pending actions |
| Dream and plan | Bucket lists/items/steps, plans/checklists/reminders, Calendar | Ordered edits, conflict rules, scheduled data reconciliation |
| Remember | Memories, moments, story, gallery, comments, media | Local media cache, queued upload and conflict-aware edits |
| Keep in touch | Text notes, drawings, wishlists and secret gift plans | Privacy-aware caches and owner-specific queues |
| Integrations | Existing Calendar and location flows where configured | Explicit offline states and retry behavior |

Each row needs native UI, authorization tests, offline and reconnect tests, two-account conflict tests, accessibility and device verification. A navigation item is added only when its flow works end to end.

## Release gate

Do not call the APK the complete product until every row above passes parity on a physical Android device, including airplane-mode create/read/edit, reconnect sync, account switch, revoked membership, private/secret denial, media failure recovery, widget tap, keyboard and reduced-motion checks. Build and install a configured signed private test APK before acceptance. The debug APK in this repository proves compilation only.
## Partner updates slice — 2026-09-17

Native Home opens a bounded partner-updates inbox. It reads only the signed-in recipient's generic envelopes, saves a per-account app-private copy for offline viewing, and clears it at sign-out. Mark-read uses an authenticated, RLS-governed POST RPC. Source compiles; device interaction and two-account sync remain unverified. The cache is not yet the encrypted relational store required for complete parity, and the APK has no general activity FCM transport, so prompt background alerts remain open.

The partner activity migration is applied on the hosted Us-Together project as version `20260917144048`; native device and prompt-background-delivery acceptance remain open.

## Privacy PIN parity — 2026-09-17

The web product now has selected section locks and a guided 4/6-digit heart-keypad PIN flow. Android must implement equivalent current-PIN verification, create/confirm/change flows and a native biometric prompt before it can open sections selected by a user. RLS blocks online Android reads for selected sections now; previously cached offline content is not revoked by the web lock. Native parity requires protected per-user cache and account-switch cleanup, then physical-device acceptance.
