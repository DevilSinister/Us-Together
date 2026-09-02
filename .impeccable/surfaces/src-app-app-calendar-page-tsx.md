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
