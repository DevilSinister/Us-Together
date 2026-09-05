# Release 2 carryover backlog

Updated: 2026-09-05. Deferred work is recorded here rather than presented as the immediate next MVP task. Suggested priorities are planning guidance, not owner approval to implement.

| ID | State | Item | Completion evidence |
| --- | --- | --- | --- |
| R2-01 | On hold; explicit resume required | Account export/deletion and broader account/couple lifecycle completion | Agreed ownership/retention behavior, confirmations, session revocation, Storage-first cleanup and authorization tests |
| R2-02 | Deferred | Complete settings, privacy controls, content-free audit events and operations hooks | Working controls with failure states, redacted logs, authorization and operational checks |
| R2-03 | Suggested first | Paginate notes and wishlists beyond their current 200-item windows | Older entries reachable, stable cursors, no duplicates; each partner list remains reachable |
| R2-04 | Suggested first | Scope note-read lookup to displayed notes rather than an independent 500-row window | Correct read indicators with more than 500 historical reads and pagination |
| R2-05 | Proposed | Contextual Home next action instead of expanding the current six-action stack | Useful empty/populated/completed-plan states; no private-content or purchase-secret inference |
| R2-06 | Deferred optional feature | Manual wishlist images and note attachments | Private upload boundary, quotas, binary checks, signed reads and cleanup; no third-party image hotlinking |
| R2-07 | Deferred | Moment edit/delete UI and remaining Moments copy consistency | Authorized edits/deletes, media/linked-record consequences; notification titles use intended user-facing wording |
| R2-08 | Deferred automation | Add real-account Phase 7 and account/link/sync browser regression coverage | Two-account tests for shared/private notes, owner-only wishlist edits, secret purchases, linking and sync; retain owner's manual acceptance |
| R2-09 | Deferred automation | Run browser and database authorization coverage in CI | Isolated test environment, browser installation/port isolation, meaningful failures and no production fixtures |
| R2-10 | Deferred verification | Clean migration replay and local/hosted history reconciliation | Disposable clean environment, full replay, migration list correspondence and documented reconciliation without rewriting applied history |
| R2-11 | Deferred verification | Genuine overlapping-session and final-slot pairing tests | Concurrent acceptance cannot admit a third member; stale/conflicting mutations have explicit outcomes |
| R2-12 | Deferred verification | Real-account plan attachment round trip | Authorized upload/download/delete and partner/foreign/former-member denial |
| R2-13 | Deferred operational cleanup | Historical Phase 6 generated fixture cleanup | Recheck exact generated fixtures and authorization before any cleanup; earlier cleanup was not confirmed applied |
| R2-14 | Deferred review | Existing advisor notices, accessibility, performance, dependencies and production-like smoke checks | Fresh scoped evidence; historical advisor findings are not asserted current without inspection |
| R2-15 | Deferred maintenance | Faithful Graphify refresh | Preserve docs and SQL semantics alongside current code; check Phase 7 coverage, graph integrity and linked source locations |
| R2-16 | Preserve current behavior | Gallery/media follow-up | Owner asks to keep current changes; no active repair. Reopen only with a fresh regression or explicit request |

## Baseline, not unfinished work

Phase 7 is implemented and owner-manually-tested. Account creation, linking and sync have owner-reported manual verification. Existing leave/empty-delete, memory media, bucket flows, plan calendar/checklist/reminders and private gift plans must not be re-listed as missing features.

The repository overview/status contradictions are corrected in this documentation update. Historical verification reports retain their original results with dated superseding notes. The graph remains a partial historical map until R2-15; use source files to verify its answers.
