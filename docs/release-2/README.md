# Release 2

Updated: 2026-09-05. Status: planning and deferred-work register; no Release 2 implementation is authorized by this documentation update.

## Current baseline and owner decisions

Implementation exists through Phase 7: accounts/pairing, Home, bucket lists, plans/reminders/attachments, shared Calendar, memories/moments/media/gallery, notifications, wishlists/private gift plans, and shared/private notes. Partner synchronization currently uses five-second polling.

The owner confirms manual testing of Phase 7 changes and other existing flows, including account creation, partner linking and synchronization. Record this as user-reported manual evidence; do not describe those flows as untested. It is not an automated browser, concurrency or migration-replay result.

Account lifecycle completion is **on hold**. Do not resume account export/deletion or broader couple-deletion work without a new owner instruction. Existing leave and empty-couple deletion remain implemented.

Keep the current gallery changes. The owner believes the issue was probably fixed by Claude and asks to leave it alone. This closes the active investigation by owner direction; it is not a new device-specific verification claim. Reopen only on a new reported regression or explicit request.

## Documents

- [Roadmap](ROADMAP.md): future capabilities and suggested delivery sequence.
- [Carryover backlog](BACKLOG.md): implementation leftovers, deferred evidence, and held work.
- [Verification](VERIFICATION.md): manual acceptance, historical evidence, and future checks.
- [Location policy](LOCATION_POLICY.md): OpenStreetMap-based APIs wherever location functionality is mentioned.

The repository is canonical. The Us Together section of the Obsidian Agents vault mirrors this release register; other projects are outside scope. Existing [feature contracts](../FEATURES.md), [Vault](../VAULT.md), [Google Calendar](../GOOGLE_CALENDAR.md), [database](../DATABASE.md), and [server contracts](../API_CONTRACTS.md) remain authoritative for their domains. This folder changes scheduling/status, not existing ownership rules or working APIs.

## Working rules

Choose a bounded release item before implementation. Read its source contracts, inspect current code and apply the required skills. Preserve current working flows and unrelated changes. Record implementation, manual evidence, automated evidence and deferral separately. Existing phase/security gates still apply to future changes; this register does not claim all historical release gates passed.
