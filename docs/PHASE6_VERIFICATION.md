# Phase 6 verification — 2026-09-02

> Status update — 2026-09-05: the owner confirms manual testing of Phase 7, account creation, linking and sync. Keep current gallery changes; previous gallery follow-up is not an active task. Account lifecycle is on hold. Historical results below remain evidence for their date; outstanding implementation/automated checks are tracked in the [Release 2 backlog](release-2/BACKLOG.md) and [verification ledger](release-2/VERIFICATION.md), not claimed passed.

Status: implementation and functional checks passed; release closeout awaits explicit approval for disposable-fixture account cleanup. No application production deployment was performed.

## Delivered

Memories have detail/edit routes, confirmed deletion, calendar-date validation, location labels, ratings/favorites, normalized tags, and retained plan/bucket provenance. The gallery filters tags/favorites in request bodies and paginates by memory date/UUID with twelve visible rows and one lookahead. Editing uses a checked parent revision and an atomic security-invoker RPC. Invalid submissions preserve drafts and expose associated field errors. The later user-requested extension removes manual coordinate fields and adds free place lookup; historical coordinate migrations remain for compatibility.

Private media now has server-authorized allocation, authenticated resumable upload, binary/container inspection, decoded image derivatives, explicit pending/failed/deleting recovery, a keyboard-operable native viewer, short-lived signed reads, and Storage-first deletion. User-facing limits and recovery steps are in [Memory media operations](PHASE6_OPERATIONS.md).

## Database and binary evidence

The final hosted suite passes 42 assertions, including own/foreign/former-member/anonymous access, revision conflicts, impossible dates, atomic tag updates, exact-path upload ownership, ready-state forgery denial, expiry, parent deletion guards, file quotas, rate limits, and bounded tag pagination over 1,001 fictional memories. Its caught inner subtransaction rolls back every fixture; explicit postconditions abort the migration if any test account, couple, memory or temporary result table remains. See [PostgreSQL exception rollback semantics](https://www.postgresql.org/docs/current/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING). The earlier 32- and 37-assertion gates passed before rate/quota and coordinate expansion. The final suite additionally verifies RPC coordinate persistence and rejects unpaired/out-of-range values.

The authenticated hosted binary suite passes 34 checks: three fictional sign-ins, authorized allocation, foreign denial, no unallocated paths or overwrites, real PNG upload/decode/derivative, partner reads, repeated finalization, signed URL fetch and expiry, forged-signature rejection, interrupted uploads, valid MP4/WebM containers, and binary/metadata cleanup. These checks use actual Supabase Auth and Storage, not developer-preview substitutes.

Two additional hosted browser tests pass on desktop and mobile. They sign in through the real form, upload through the actual TUS UI, open/download a private photo, play an MP4, verify lazy images/no preloaded video, and remove the files. The preview regression suite passes eleven tests (nine in the final full run and both memory journeys in the corrected targeted rerun). Three ordinary-run skips are intentional: the desktop copy of a mobile-only test and the two separately executed hosted tests. Injected network failures preserve the memory draft and gallery filters; native video arrow keys remain with the player. The hosted spec is explicitly skipped in ordinary runs unless disposable credentials are supplied.

## Application and visual evidence

- 42 unit tests pass, including decoded JPEG/PNG dimensions, mismatched signatures, truncated containers, pixel/size limits, MP4 duration/dimensions, invalid WebM, normalized tags and invalid dates.
- Final lint, Next.js typecheck, all 42 unit tests, production build and Deno Edge typecheck passed. The checked Edge source is deployed with JWT verification enabled (version 7).
- A secret-pattern scan covered 182 deliverable files with no findings. Application/Edge media code contains no console/logger calls; integration output uses named checks. Git diff whitespace checks passed.
- The one-time Impeccable mechanical detector returned no findings. The separate finish review led to one batch correcting video arrow-key handling and network-error recovery; both were then browser-verified.
- Desktop/mobile screenshots live in ignored `.impeccable/qa/phase6-*.png`. Fixtures are labeled fictional or CC0. Visual verification corrected the file-input affordance, shortened a mobile placeholder, and removed a duplicate rule for story-free memories. The completed coordinate form was also inspected at desktop/mobile sizes with no horizontal overflow.
- Graphify was refreshed to 1,039 nodes, 2,003 edges and 62 communities. Semantic extraction covers the Phase 6 docs and SQL, including the historical coordinate follow-up; the structural graph includes the application/Edge code. The SQL parser dependency is unavailable, so SQL relationships use the reviewed semantic extraction.
- The in-app browser runtime could not initialize. Standalone Playwright provided the browser and screenshot evidence.

## Operational boundary

Supabase advisors retain the pre-existing intentional RPC-only invitation-table notice and [disabled leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The private verification fixture table remains RLS-enabled with no policies and no client grants while cleanup awaits approval; this produces a second expected informational advisor notice. The performance advisor reports 28 informational unused indexes and no warning/error findings; these are not production performance evidence.

The gallery is bounded and tested against a 1,001-row fixture; this is not a production-scale load benchmark. ADR-014 still defers a disposable clean-from-zero hosted replay, genuinely concurrent database-session timing and the real two-person pairing journey to final integration. Human screen-reader and broader browser/device coverage, production deployment, automatic video captions/transcoding, and automatic expired-upload garbage collection are not represented as completed here.

## Migration correspondence and pending cleanup

The hosted list contains twenty-one migrations: thirteen through Phase 5 and eight applied Phase 6 migrations. Connector-assigned timestamps differ from local CLI filenames; match names and reviewed SQL, not timestamps alone.

| Migration name | Local timestamp | Hosted timestamp |
| --- | --- | --- |
| phase6_memories_media | 20260902103206 | 20260902103749 |
| phase6_gallery_guards | 20260902104118 | 20260902104251 |
| phase6_integration_fixture_setup | 20260902105857 | 20260902110000 |
| phase6_tag_lock | 20260902111450 | 20260902111546 |
| phase6_verification | 20260902112945 | 20260902111616 |
| phase6_media_budgets | 20260902111701 | 20260902111821 |
| phase6_final_verification | 20260902112300 | 20260902112410 |
| phase6_memory_coordinates | 20260902115221 | 20260902115624 |
| phase6_integration_fixture_cleanup | 20260902112947 | Unapplied: approval required |

The original verification file was renamed locally to ensure clean replay orders it after the tag-lock correction; its SQL is unchanged. The final verification includes both fixes and request budgets.

Read-only closeout checks confirmed exactly three generated fixture accounts and two fixture couples, matching the original recorded identities. All email addresses use the generated example.test pattern; profiles and stories remain fictional, with no unexpected members. No fixture media metadata or Storage objects remain. The guarded cleanup refuses changed provenance, unexpected memberships/content, other couple feature data or remaining binaries before deleting anything. Automatic approval review rejected that irreversible Auth/couple deletion even after these checks, so it remains unapplied pending explicit user approval. The restricted private fixture table and ignored local test credential file are retained for that closeout; neither is exposed to application clients or committed.

## Later user-directed extension

The original results above describe the first Phase 6 implementation. Current calendar, moment media, preview uploads, comments, reminders, free locations and additional migration/gate results are recorded in [Phase 6 extension verification](PHASE6_EXTENSION_VERIFICATION.md). The generated-account cleanup blocker is unchanged.
