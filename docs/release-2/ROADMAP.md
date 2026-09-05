# Release 2 roadmap

Status: proposed sequence, not a commitment to implement every item at once. Account lifecycle stays on hold regardless of this sequence.

| Order | Capability | Intended outcome | Acceptance focus |
| --- | --- | --- | --- |
| 1 | Collection browsing and contextual Home | Reach older notes/wishes; make the next relationship action relevant | Stable pagination, accurate read state, privacy-safe suggestions, empty and populated states |
| 2 | Our Story and richer Moments | Turn existing idea/plan/memory provenance into a readable relationship timeline | Eligible shared sources only, provenance links, bounded browsing, moment edit/delete consequences |
| 3 | Know Me | Capture partner preferences, favorites and likes/dislikes | Explicit ownership/visibility, editing and cross-couple denial |
| 4 | Advanced notes | Surprise, scheduled and open-when notes | Pre-reveal non-disclosure, timezone handling, idempotent delivery and author controls |
| 5 | Protected vault | Temporarily unlocked private content | Dedicated threat review, server-verifiable unlock, timeout/revocation and media negatives; never claim E2EE |
| 6 | Google Calendar | Optional per-user connection and selected event synchronization | Private-by-default events, explicit sharing, OAuth lifecycle, conflicts and disconnect |
| 7 | Push, selective realtime and search | Timely shared updates and authorized discovery | Opt-in, no secret inference, revoked access, reconnect and provider failure |

Use [FEATURES](../FEATURES.md), [UX flows](../UX_FLOWS.md), [Vault](../VAULT.md) and [Google Calendar](../GOOGLE_CALENDAR.md) as behavior contracts. Break each capability into a separately verified phase before coding; no speculative schema or public endpoint is introduced here.

Wishlist images and note attachments are optional carryovers, with dedicated private upload/storage design before implementation. Account/export work is excluded from this sequence until explicitly resumed.

For all existing and new location-bearing experiences, including plans, lists, memories, moments, timeline places and Calendar integrations, follow the [OpenStreetMap location policy](LOCATION_POLICY.md).

AI, native apps, advanced trip planning, rule-based date suggestions and couple questions remain Later, not newly promoted to Release 2.
