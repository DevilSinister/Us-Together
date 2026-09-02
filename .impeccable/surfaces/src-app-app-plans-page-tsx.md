---
version: 1
slug: "src-app-app-plans-page-tsx"
primary_target: "src/app/(app)/plans/page.tsx"
related_targets: ["src/app/(app)/plans/new/page.tsx","src/app/(app)/plans/[id]/page.tsx","src/app/(app)/plans/[id]/edit/page.tsx","src/app/(app)/memories/page.tsx","src/app/(app)/memories/new/page.tsx"]
---

# Plans and memories continuity

- **Mode:** Operate
- **Audience/job:** An active couple member schedules and prepares a shared experience, marks it complete, and preserves it as a memory without losing provenance.
- **Direction:** Extend the verified Shared-Journal Thread. Deep wine carries actions and plan links; quiet blush groups view controls, selected dates, and the memory bridge. Serif headings and fine rules keep the calendar and practical details part of one personal narrative.
- **Calendar:** Upcoming opens as a chronological reading list. Month and week use a Monday-first seven-column grid with Previous, Today, and Next controls, an explicit timezone, and planned/completed/cancelled/all filtering. Desktop cells show up to two titles and an overflow count; mobile cells show counts. Selecting a date reveals its full agenda below the grid. Empty views offer “Plan something”; bounded results expose “Load more plans” when needed.
- **Plan detail:** A single reading column leads from title, status, time, location, and optional budget to Edit plan and the current lifecycle action. Ordered checklist rows retain visible Save controls and separate reorder/remove actions; the Add step field and action stack on mobile. Fine rules separate “A gentle reminder” and “Keep it handy” without turning them into equal cards.
- **Reminders and files:** Five presets run from the start time through one week before, with scheduled time and delivery state shown beside removable reminders. Private PDF, PNG, and JPEG attachments are limited to 2 MB each; connected accounts can upload, download, and remove them. Preview explains that binary attachments require a connected account and that reminder editing does not deliver notifications.
- **Memorable moment:** Completing a plan reveals the blush “Keep a little of this moment” bridge and “Save this memory” action; an existing memory instead offers “Open saved memory.” The resulting memory retains its source connection.
- **Changes and recovery:** Dedicated creation/edit routes keep timezone and clock-repeat choices explicit. Cancellation keeps details and stops pending reminders; cancelled plans can be restored. Permanent deletion sits behind disclosure and typed DELETE confirmation, requires attachment removal first, and explains that saved memories remain. Pending and failed actions receive visible feedback.
- **Verification boundary:** Calendar, detail, checklist, and reminder editing have desktop/mobile preview evidence. Hosted reminder scheduling is enabled and verified; real-account browser flows and binary attachment upload/download integration remain final integration checks under ADR-014. The implemented memory gallery, image previews, and private media viewer are documented in `src-app-app-memories-page-tsx.md`.
