# Vault Specification

## Release and claim

The Vault is a Release 2 protected area for sensitive relationship photos, videos, audio, letters, and memories. It uses private storage, strict RLS, server authorization, temporary unlock state, and short-lived signed URLs.

It is **not** end-to-end encrypted or zero knowledge. The service infrastructure may technically process plaintext. Product copy must state this honestly and must not imply universal biometric support.

## Access requirements

A media/content request succeeds only when all are true:

1. The user has a valid authenticated session.
2. The user is an active member of the owning couple.
3. The user has configured/retained vault access as allowed by product policy.
4. A server-verifiable vault unlock session is current.
5. The item metadata and storage object belong to that couple and vault.

Client state or a localStorage flag never proves unlock.

## Unlock methods

### PIN/password

- Store only a modern password hash with unique salt and reviewed cost parameters.
- Apply account/session/device-aware attempt throttling and cooldown.
- Never log, return, or store the raw value in localStorage/sessionStorage.
- Exact recovery/reset consequences are explained; resetting may invalidate active vault sessions.

### Passkeys/WebAuthn

Use standards-based WebAuthn/passkeys after checking current browser/platform support and a reviewed server library. “Use biometrics” is not a portable promise; platform authenticators may use PIN, device unlock, or other gestures. Maintain a configured fallback.

## Unlock session

- Created server-side after successful vault authentication and bound to user, authenticated session, and vault/couple.
- Stored as an opaque secure HTTP-only cookie/reference plus server-side record or equivalent tamper-resistant mechanism.
- Has absolute and inactivity expiry; supported choices include immediate-on-leave, 1, 5, or 15 minutes.
- Rotation/revocation occurs on lock, logout, membership loss, PIN reset, account security change, and suspicious activity.
- Browser background/visibility behavior is best effort and never replaces server expiry.

## Storage and delivery

- Vault uses a dedicated private bucket or clearly isolated policy namespace.
- Server constructs paths; client paths are untrusted.
- Upload validation follows [Security](SECURITY.md) and uses stricter configurable quotas.
- Signed URLs are generated only after all access requirements and expire as quickly as usable.
- Do not place signed URLs in analytics/logs/referrers. Prefer an authorized streaming/proxy approach where it materially reduces leakage and platform limits permit it.
- Viewer does not preload an entire vault or autoplay/download video.
- Lock removes in-memory URLs/previews and returns to a non-sensitive surface.

## UI privacy

Outside an unlocked vault, do not render filenames, counts, thumbnails, titles, recent items, notifications, activity, search matches, or accessible labels containing vault content. App switcher/browser snapshots and cached pages should be considered in implementation; use appropriate obscuring/no-store behavior where feasible.

## Audit and alerts

Record unlock success/failure class, lock, credential change, and media access metadata without content or filenames. Retain only what supports security. User-facing access history is a future decision and must not expose a partner's unrelated private device metadata.

## Threats and mitigations

- **Guessed PIN:** strong hashing, throttle, cooldown, recent session, alerts/audit.
- **Stolen signed URL:** short expiry, no logs/referrers, membership recheck when proxied.
- **Stale unlocked tab:** server inactivity/absolute expiry and explicit lock.
- **Client path substitution:** server path construction plus metadata ownership checks.
- **Cross-couple RLS/storage bug:** dedicated negative test suite and advisor review.
- **XSS stealing content:** CSP, sanitization, minimal client exposure, no raw HTML.
- **Service/operator compromise:** outside MVP protection; future E2EE may address part of this.

## Future E2EE boundary

True E2EE requires a separate, reviewed design for client-side encryption, per-user/device keys, partner sharing, recovery, revocation, thumbnails, search, backup, and migration of existing media. Use established Web Crypto primitives and a reviewed protocol; never layer reversible encoding or a home-grown cipher and call it encryption.

## Release gate

Vault remains disabled until the dedicated threat model, PIN/passkey tests, timeout tests, RLS/storage negative suite, media leakage review, logs review, mobile background behavior, accessibility, and production-like signed URL tests pass.
