# Design Brief

## Status and mode

This is a pre-build brief for an **Operate** product: users must quickly understand state and complete tasks, while the product still feels intimate and memorable. It records design intent, not an implemented design system. `DESIGN.md` will be created only after the first real interface is built and visually verified.

## Experience thesis

Us Together should feel like opening a carefully kept shared journal that is alive with upcoming plans. It must combine the calm legibility of a modern consumer utility with the emotional warmth of a private keepsake. The interface should never feel like project management software wearing pink.

## Principles

1. **The couple leads.** Partner names, shared time, upcoming moments, and meaningful content lead before metrics or controls.
2. **Warmth through detail.** Copy, typography, imagery, and transitions create intimacy; repeated hearts and decorative gradients do not.
3. **Clear privacy state.** Shared, private, secret, scheduled, and vault states are named and explained where decisions are made.
4. **One connected story.** Related bucket items, plans, and memories show provenance and the next meaningful action.
5. **Mobile is designed, not compressed.** Navigation, calendars, media, dialogs, and forms adapt to touch and narrow viewports.

## Visual direction

### Character

Premium, cozy, romantic, intimate, modern, tactile, and restrained. Avoid childish illustrations, wedding clichés, excessive hearts, default shadcn styling, generic SaaS cards, neon romance, and seasonal Valentine's imagery.

### Color strategy

Use a restrained palette for operational surfaces and allow richer fields for memories or celebratory moments.

- Warm off-white or quiet blush grounds
- Soft charcoal for primary text
- Deep wine/plum for anchoring navigation and strong actions
- Rose as the primary emotional accent
- Muted pink for selected states and gentle surfaces
- Semantic success, warning, danger, and information colors that remain distinguishable without relying on color alone

Dark mode uses deep charcoal/plum surfaces and warm off-white text; it is composed independently rather than produced by inversion. Exact color tokens are chosen during UI shaping and recorded in `DESIGN.md` after verification.

### Typography

Use a highly legible workhorse face for application controls and dense content. A complementary expressive face may be used sparingly for relationship counters, letters, or memory titles if it remains readable and does not turn every screen into editorial decoration. Exact families, weights, and scale are not yet authoritative.

### Shape and material

- Rounded geometry should feel refined rather than bubbly.
- Borders and tonal surfaces establish hierarchy before shadows.
- Shadows are soft, sparse, and reserved for elevation or media.
- Photography and user media are allowed to carry visual richness.
- Hearts may appear in a signature interaction, empty-state illustration, or meaningful label, not as repeated bullets and icons.

## Information architecture

Primary destinations:

```text
Home
Plans
Bucket List
Us
Vault (Release 2)
```

`Us` contains memories, notes, wishlist, milestones, and later Know Me and Our Story. Settings and notifications are secondary global destinations.

Desktop uses a persistent sidebar where space permits. Mobile uses a five-item bottom navigation with safe-area spacing. Deep views use a clear back path and preserve destination context.

## Core surfaces

### Home

Lead with a time-aware greeting and relationship context. Prioritize the single most relevant current item: upcoming plan, unread shared note, important countdown, or first-run action. Secondary widgets include bucket progress, recent memory, wishlist preview, and recent note. Optional widgets may eventually be hidden.

### Plans

Support month, week, and upcoming-list views without reproducing a desktop calendar on mobile. Plans use type plus icon/label, never color alone. The plan detail view combines schedule, location, checklist, budget, reminders, and source links.

### Bucket List

The dominant actions are add, filter, progress, plan, and complete. Completion creates a small celebratory moment followed by “Save this as a memory,” not an obstructive animation.

### Us

Content-led grids and lists make memories and letters feel personal. Private and shared states are always legible to the author. The wishlist clearly separates what the owner can see from purchaser-only controls.

### Vault

The locked state explains the security model honestly. Unlock, timeout, and reauthentication are calm and explicit. Sensitive previews never appear outside an unlocked session.

## Responsive behavior

Design and verify at representative narrow mobile, large mobile, tablet, laptop, and wide desktop widths. Use content-driven breakpoints rather than device names.

- Bottom navigation never obscures actions or form controls.
- Forms use full-width controls on mobile and constrained readable widths on desktop.
- Dialogs become bottom sheets or dedicated screens when content/keyboard interaction warrants it.
- Calendar mobile views prioritize agenda and day/week navigation over dense grids.
- Media grids change column count and fetch size; video never autoplays or downloads eagerly.
- Tables become labeled cards or horizontally safe structures without losing relationships.

## Component families

- App shell, sidebar, mobile navigation, page header, command/quick actions
- Couple/partner identity, relationship counter, countdown
- Plan card, calendar, detail, checklist, reminder form
- Bucket card, progress, filters, subtasks, completion moment
- Memory card, grid, uploader, viewer, provenance link
- Wishlist card/form and purchaser-only action panel
- Note composer, privacy selector, card, letter viewer, reveal state
- Milestone card and timeline entry
- Vault lock, unlock, session timer, protected grid and viewer
- Empty, loading, error, offline, permission-denied, and confirmation states

Component APIs are not finalized until real layouts expose recurring patterns.

## Copy and content

Use warm, plain language: “Add something,” “Plan this,” “Save the memory,” and “Write a note.” Avoid “create entity,” “record,” “resource,” and other database language. Never use romantic copy to obscure privacy, charges, deletion, or errors.

Examples use fictional partners such as Alex and Maya and are labeled demo data where necessary. Do not fabricate testimonials, usage counts, or security claims.

## States and feedback

Every major surface defines:

- First-run and returning empty states
- Skeleton/loading behavior that preserves layout
- Recoverable inline errors and a non-technical fallback
- Offline or interrupted upload behavior where relevant
- Permission-denied and expired-session behavior
- Destructive confirmation with the exact affected data
- Success feedback that does not trap focus or rely only on color

## Motion

Motion communicates navigation, completion, reveal, and spatial change. Use one orchestrated signature moment rather than scattered hover effects. Respect `prefers-reduced-motion`; content must remain visible and understandable with motion disabled.

## Accessibility acceptance

- Target WCAG 2.2 AA contrast and interaction behavior.
- Complete keyboard operation with logical focus order and visible focus.
- Correct names, descriptions, error associations, and dialog focus management.
- Minimum practical touch targets and adequate spacing.
- Status conveyed with text/icon/structure in addition to color.
- Screen-reader announcements for async results, uploads, and completion.
- Accessible alternatives for drag reordering.
- Zoom/reflow at 200% without loss of content or action.

## Design execution gate

Before implementing a new surface, run Impeccable shaping against `PRODUCT.md` and this brief. After implementation, inspect desktop and mobile together, run the design detector once, fix material issues in a bounded pass, and create `DESIGN.md` from the verified shipped system.
