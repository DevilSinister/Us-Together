# UX Flows

## Flow conventions

- Every step that reads or writes data is subject to server authorization and RLS.
- “Not found” is preferred where distinguishing forbidden from absent would leak private existence.
- Recoverable failures preserve safe user input without retaining secrets in logs or browser storage.
- Destructive confirmations name the scope and whether recovery is possible.

## Signup and authentication

```text
Welcome -> Sign up -> Verify email -> Create profile -> Couple decision
```

Existing users go to login and then their incomplete onboarding step or Home. Password reset uses a single-use expiring recovery flow. Expired verification/recovery links offer a safe resend. Authentication errors do not enumerate accounts.

## Create and invite

```text
Create profile -> Name couple -> Relationship date (optional)
-> Choose invite link or code -> Share outside app -> Waiting state
-> Partner accepts -> First-run experience
```

The waiting user can revoke and regenerate credentials. Credentials show expiry and are never displayed again when policy requires rotation. If the recipient is not authenticated, the intended invitation is preserved through authentication using a safe, signed return state.

Failures:

- Expired/revoked/used: explain that a new invitation is required.
- Attempt budget exhausted: stop verification and require regeneration.
- Existing other active couple: show the conflict without changing memberships.
- Couple full: deny; do not displace an existing partner.

## Join with invite or code

```text
Open link / enter code -> Authenticate -> Preview inviter/couple safely
-> Confirm join -> Transactional acceptance -> Profile if incomplete -> Home
```

Do not reveal couple details before the credential and authenticated state are valid. Repeated submit shows the result of the first successful acceptance rather than creating duplicates.

## First-run activation

Home welcomes the couple and offers four real actions: add a bucket idea, plan a date, add a wishlist hint, or write a note. Completing one dismisses the setup emphasis naturally. Skipping preferences never blocks entry.

## Bucket to plan to memory

```text
Add idea -> Add subtasks/details -> Plan this
-> Review prefilled plan -> Save plan -> Complete experience
-> Mark bucket item complete -> Offer “Save this memory”
-> Add story/media -> Publish memory -> Show provenance
```

Cancellation during conversion leaves the source unchanged. Duplicate submit is idempotent. If memory upload partially fails, the draft and successful uploads remain recoverable without publishing broken media.

## Plan and calendar

From list/calendar, a user creates or opens a plan. The editor separates date/time/timezone, location, budget, checklist, and reminder sections. Mobile creation may use a dedicated screen rather than a tall modal. Cancelling a plan differs from deleting it; deletion requires confirmation and explains linked records.

Timezone changes show the resolved local time before save. Invalid intervals focus the relevant fields. Calendar type is conveyed by label/icon and color.

## Memory and media

```text
Add memory -> Details -> Select media -> Validate/upload with progress
-> Review -> Save -> Gallery/detail
```

Upload cancellation is explicit. Unsupported files identify the constraint without exposing backend details. Viewers lazy-load full media, support keyboard/swipe navigation where appropriate, and never expose a permanent public URL.

## Wishlist and secret purchase

Owner flow:

```text
Wishlist -> Add/edit item -> Partner can view item
```

Partner flow:

```text
Partner wishlist -> Open item -> Mark purchased privately
-> Optional purchaser-only note/status
```

The owner's interface, exports, search, activity, and notifications remain indistinguishable whether a secret purchase exists. The purchaser sees a private marker with an explanation of who can see it.

## Notes

MVP composer requires a deliberate visibility selection: shared or only me. The review text names the audience before save. Shared recipients receive an in-app notification; private notes produce none for the partner.

R2 surprise flow previews reveal time and timezone and clearly states that the recipient cannot see existence/content before reveal. Scheduled delivery failures remain private to the author until successfully delivered or surfaced as an author-only error.

## Vault (R2)

```text
Vault locked -> Unlock with configured method -> Temporary unlocked session
-> Browse/view/upload -> Inactivity or navigation trigger -> Lock
```

Leaving the vault, backgrounding according to policy, session expiry, or timeout removes usable unlock state and media URLs. Passkey unavailability falls back to configured authentication. Recovery never claims zero-knowledge protection. See [Vault](VAULT.md).

## Google Calendar (R2)

```text
Settings -> Connect Google -> Consent -> Callback -> Select calendar
-> Choose import/create behavior -> Connected state -> Disconnect/revoke
```

External events start as “Private external event.” Sharing details is per event or an explicit future rule. Connection failure leaves the app usable and offers retry. See [Google Calendar](GOOGLE_CALENDAR.md).

## Settings, export, leave, and deletion

- Account changes may require recent authentication.
- Couple date/name edits explain shared impact.
- Leaving shows what remains available to each person and how shared data is handled.
- Export creates a secure asynchronous package with expiry and no secret records owned solely by the partner.
- Account/couple deletion uses typed or equivalent strong confirmation, recent authentication, and a final scope summary.
- A partial deletion failure reports status to the actor and operations without exposing deleted content.

## Global failure paths

- **Session expired:** preserve non-sensitive draft locally only when safe, reauthenticate, retry deliberately.
- **Offline:** show cached shell/known state honestly; queue nothing unless conflict behavior is implemented.
- **Authorization changed:** stop mutation, clear stale client state, route to a safe destination.
- **Rate limited:** show retry timing without revealing defensive thresholds.
- **Upload interrupted:** resume only when the storage mechanism safely supports it; otherwise retain a draft and retry.
- **Background job delayed:** show pending state to the authorized actor; do not duplicate delivery.
- **Unknown error:** provide retry/support path and a correlation ID safe for users, with sensitive details only in protected logs.

## Project-wide location rule — 2026-09-05

Use OpenStreetMap-based APIs/services wherever location functionality is mentioned. Reuse existing Photon lookup and follow the [location policy](release-2/LOCATION_POLICY.md). Google Calendar integration does not select a geocoding provider. This documentation update adds no API, schema or runtime behavior.
