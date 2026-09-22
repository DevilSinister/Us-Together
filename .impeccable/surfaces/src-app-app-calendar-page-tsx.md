---
version: 1
slug: "src-app-app-calendar-page-tsx"
primary_target: "src/app/(app)/calendar/page.tsx"
related_targets: ["src/components/entries/calendar.tsx","src/app/(app)/home/page.tsx","src/components/app/app-navigation.tsx"]
---

# A date for every part of your story

- **Mode:** Operate
- **Audience/job:** Find plans ahead, saved memories, and moments on one shared calendar, then open the entry or create the next one.
- **Direction:** Continue the Shared-Journal Thread through a paper calendar and one selected-day agenda. Serif date headings, fine grid rules, deep-wine actions, and blush selection retain the established visual identity.
- **Entry points:** Calendar is linked from Home and the desktop/mobile navigation. The page offers New plan, Add memory, Add moment, and Manage plans; an unpaired state links to connecting the shared space.
- **Calendar:** Month and Week controls accompany Previous/Next period and Today. Everything, Plans, Memories, and Moments filter the displayed entries. A Monday-first grid shows date numbers, compact type dots, and counts; it leaves full titles to the agenda below. Today uses a wine marker; selection uses blush and an inset wine ring. Plan, memory, and moment dots use wine, amber, and emerald locally.
- **Responsive and keyboard:** Wrapping controls and compact cells keep seven columns on mobile; larger screens increase cell height and padding. One date participates in the tab order; arrow keys move focus/selection across the visible grid. Agenda rows pair icons with readable kind/status labels and linked titles, so entry meaning is available beyond dot color.
- **Date meaning:** Plan times use the profile timezone; memories and moments remain on their saved dates. The selected-date heading and empty agenda text explain the current view. Bounded results expose Load more calendar entries. A load failure preserves the current calendar and gives retry guidance.
- **Evidence:** Shared calendar desktop/mobile verification is recorded in the current phase; screenshots use `.impeccable/qa/shared-calendar-{desktop,mobile}-chromium.png`. This calendar complements the plan-management calendar rather than changing plan lifecycle controls.

## Revision — 2026-09-22

This contract claimed plan, memory and moment dots use "wine, amber, and emerald". They never have in shipped code: the markers are a wine circle, a rose square and a blush-ink diamond, shape first, because `--wine` and `--rose` are the same value in dark mode. `DESIGN.md` had it right; this file did not.

Shipped now: the page header is `scale="compact"` with no lede, and the three creation links have moved out of the top of the page into the selected day's foot, where they carry `?date=` and prefill the new memory or moment. The four exclusive filter buttons and the legend-less markers have collapsed into one row of three toggle chips, each showing its own marker shape beside its name — the legend and the filter are the same control, the toggles are independent, and turning all three off reaches an explicit state with a reset rather than a blank month. The per-day "N entries" line is deleted; the markers and the cell's accessible name already carried it.

The grid moved into `MonthGrid`, shared with the plans workspace's future use, and draws its interior rules with a one-pixel gap over a `bg-border` container. Per-cell borders previously doubled against the wrapper's own border on the last column and row and clipped against the panel radius. Every cell therefore carries an explicit `bg-card`.
