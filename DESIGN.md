---
name: Us Together
description: A warm, private shared journal where plans become memories.
colors:
  warm-paper: "#fbf7f3"
  charcoal-ink: "#2f2527"
  field-paper: "#fffdfb"
  card-paper: "#fffaf6"
  deep-wine: "#6f1730"
  deep-wine-strong: "#591124"
  warm-white: "#fff9f6"
  quiet-blush: "#f4e7e5"
  blush-ink: "#542b34"
  muted-ink: "#74676a"
  fine-rule: "#decfca"
  restrained-rose: "#b75a6d"
  night-paper: "#0e0d0c"
  night-card: "#181716"
  night-rose: "#f07a8c"
typography:
  display:
    fontFamily: '"Iowan Old Style", Baskerville, "Times New Roman", serif'
    fontSize: "clamp(3rem, 6vw, 5.4rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: '"Iowan Old Style", Baskerville, "Times New Roman", serif'
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline-wide:
    fontSize: "2.25rem"
    lineHeight: 1.2
  section-compact:
    fontSize: "1.375rem"
    lineHeight: 1.3
  entry:
    fontFamily: 'Aptos, "Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: '"Iowan Old Style", Baskerville, "Times New Roman", serif'
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: 'Aptos, "Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: 'Aptos, "Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  control: "0.5rem"
  navigation: "0.875rem"
  panel: "1rem"
  surface: "1.25rem"
  full: "9999px"
spacing:
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
components:
  button-primary:
    backgroundColor: "{colors.deep-wine}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.control}"
    padding: "0 1.25rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.deep-wine-strong}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.control}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.control}"
    padding: "0 1.25rem"
    height: "2.75rem"
  input:
    backgroundColor: "{colors.field-paper}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "3rem"
  card:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.panel}"
    padding: "1.5rem"
  navigation-active:
    backgroundColor: "{colors.quiet-blush}"
    textColor: "{colors.blush-ink}"
    rounded: "{rounded.navigation}"
    padding: "0 1rem"
    height: "2.75rem"
---

# Design System: Us Together

## Overview

**Creative North Star: "The Shared-Journal Thread"**

Us Together feels like a modern private letter meeting a shared calendar. Warm paper surfaces, restrained blush fields, deep-wine controls, and editorial serif headlines make the product intimate without becoming decorative or nostalgic. The interface stays calm and content-led: relationship continuity is the organizing structure, not a grid of equal administrative cards.

The system pairs generous reading space with compact, dependable controls. Fine rules and a single vertical thread connect what partners plan, experience, and remember. Dark mode preserves the same warm chromatic relationships rather than turning the product neutral or blue-black.

**Key Characteristics:**

- Warm paper surfaces with deep-wine actions and quiet blush grouping fields
- Editorial serif headlines paired with a highly legible system sans-serif
- Content-led vertical rhythm and a recurring relationship thread
- Fine borders, restrained ambient shadow, and rounded but not pill-heavy forms
- Clear privacy language presented as part of the experience

## Colors

The palette is a warm paper-and-wine system: deep wine carries action and emphasis, blush groups related material, and charcoal preserves comfortable reading contrast.

### Primary

- **Deep Wine:** The rare, high-confidence voice for primary controls, active navigation, compact labels, and the brand mark.
- **Deep Wine Strong:** The pressed or hovered continuation of the primary action color.
- **Warm White:** Text and icon color placed on deep-wine surfaces.

### Secondary

- **Quiet Blush:** A low-contrast grouping field for timelines, active navigation, and supporting panels.
- **Restrained Rose:** A connective accent for selection, focus-adjacent details, and the relationship thread gradient.

### Neutral

- **Warm Paper:** The page canvas.
- **Card Paper:** The principal elevated or bounded surface.
- **Field Paper:** The slightly brighter input surface.
- **Charcoal Ink:** The default reading color.
- **Muted Ink:** Secondary explanations, supporting metadata, and unavailable-state copy.
- **Fine Rule:** Borders and dividers that clarify structure without dominating it.
- **Night Paper, Night Card, and Night Rose:** Dark mode is Ink and rose (ADR-053): a near-black ground and card, warm ivory type (`#f4f0e9`), and rose for primary actions, labels and progress.

### Named Rules

**The One Wine Voice Rule.** Deep wine carries primary action and active emphasis; do not introduce a second competing accent for ordinary interaction.

**The Ink and Rose Rule.** Dark mode is a near-black, faintly warm ground with ivory type, so photographs carry the colour; rose is its one accent and fills its primary buttons. This replaced the earlier Warm Dark (plum) rule by owner direction on 2026-11-11 (ADR-053).

## Typography

**Display Font:** Iowan Old Style, with Baskerville and Times New Roman fallbacks  
**Body Font:** Aptos, with Segoe UI Variable and Segoe UI fallbacks

**Character:** The serif is intimate and editorial, while the sans-serif keeps controls and longer explanations modern and highly readable. Their contrast creates warmth without making functional UI feel like stationery.

### Hierarchy

- **Display** (regular, fluid 3–5.4rem, 0.98 line-height): First-view headlines and major narrative statements; use tight tracking only at this scale.
- **Page title** (`text-page-title`, serif regular, 1.875rem mobile / 2.25rem wide, 1.2 line-height): One consistent scale for app pages, detail pages, forms, and authentication.
- **Section title** (`text-section-title`, serif regular, 1.375rem mobile / 1.5rem wide, 1.3 line-height): Panels, content groups, calendars, and dialogs.
- **Entry title** (`text-entry-title`, sans-serif semibold, 1.125rem, 1.4 line-height): Moments, memories, notes, ideas, wishes, and Home entries. Long titles wrap safely; compact list rows retain their existing truncation.
- **Body** (regular, 1rem, 1.5–1.75 line-height): Explanations and form support; introductory passages stay within 65 characters per line. Page introductions use 1rem with a shorter heading-to-copy gap.
- **Label** (semibold, 0.875rem, 1.25 line-height): Fields, compact actions, section eyebrows, and navigation.

### Named Rules

**The Serif Tells the Story Rule.** Use the display serif for emotional hierarchy and relationship language; keep controls, validation, navigation, and explanatory copy in the sans-serif.

## Layout

The core spatial model is one narrative path with supporting context, not a collection of equal cards. Public landing and authentication surfaces sit within a bounded paper sheet; wide screens use an asymmetric two-column split, while narrow screens collapse to a single reading column without changing content order. The signed-in shell uses a persistent 16rem sidebar from the medium breakpoint upward and five bottom destinations on smaller screens: Home, Calendar, Lists, Memories, and More. The sidebar lists Home on its own, then three labelled groups that follow the product loop: Plan together (Calendar, Plans, Bucket lists), Keep together (Memories, Gallery, Moments, Notes, Wishlists), and Your account (Notifications, Profile, Partner). More opens a focused destination dialog carrying the same groups for every destination outside the phone bar. A skip-to-content link precedes the sidebar, the sidebar scrolls independently at full viewport height, and the phone header stays pinned to the top.

Content containers use generous outer gutters that grow from 1.25rem on phones to 2rem on larger screens. The product body is capped at 72rem, auth and landing sheets extend to 90–92rem, and form content stays near 29rem. Spacing follows the recurring 0.5rem, 0.75rem, 1rem, 1.25rem, 1.5rem, and 2rem rhythm, with larger page-level gaps composed from it.

The Gallery is a Cover screen (see Cover Screens) with a single 44px Filter trigger before the media. Grouping, source, media type, and date live in one keyboard-accessible dialog rather than an always-visible four-field panel; on phones it rises from the bottom edge. The trigger shows an active-filter count, and a short applied summary sits opposite it; dialog edits are staged until Show gallery, while Escape leaves the current gallery intact. Scoped galleries omit the fixed source control. The first media group follows the trigger with one small gap.

**The One Narrative Path Rule.** A page should make the next meaningful relationship step visually dominant. Supporting material may sit beside it, but must not flatten the story into an equal-card dashboard.

## Elevation & Depth

The system is flat by default and uses tonal layering, fine borders, and restrained ambient shadow together. Large paper surfaces receive a broad, low-contrast wine-tinted shadow; primary buttons and timeline markers use smaller directional shadows. Shadow indicates tactility or containment, never a floating stack of unrelated cards.

### Shadow Vocabulary

- **Paper Ambient** (`shadow-paper`, light `0 24px 70px -45px rgba(58, 25, 34, 0.45)`): Large landing, auth, and focused form sheets against the page canvas.
- **Action Tactile** (`shadow-action`, `0 10px 28px -16px var(--wine)`): Primary buttons only.
- **Thread Marker** (`shadow-marker`, light `0 6px 20px -12px rgba(80, 20, 40, 0.8)`): Circular markers attached to the relationship thread.

Each is a theme token, not a pasted value. Paper Ambient and Thread Marker carry a separate dark-mode definition so depth stays visible on night paper instead of tinting wine into an invisible shadow; Action Tactile follows the wine token and needs no override.

### Named Rules

**The Bounded Paper Rule.** Prefer a tonal shift and fine rule before adding elevation; reserve shadow for the outer paper, a primary action, or a small thread marker.

## Shapes

Controls use gently curved 0.5rem corners. Navigation selections soften to 0.875rem, content panels to 1rem, and major bounded paper surfaces to 1.25rem. The scale is exposed as `rounded-control`, `rounded-navigation`, `rounded-panel`, and `rounded-surface`; arbitrary radius values are drift, not vocabulary. Fully round shapes belong to compact icons, markers, and the brand emblem. Borders are one-pixel fine rules; the system avoids heavy outlines and ornamental clipping.

**The Radius Follows Scale Rule.** Small controls use the smallest established radius, panels step up once, and only whole-page paper surfaces use the largest radius.

## Components

### Buttons

- **Shape:** Gently curved controls with a 2.75rem minimum height and 0.5rem radius.
- **Primary:** Deep-wine fill, warm-white text, semibold sans-serif, and restrained tactile shadow; large form actions increase height to 3rem.
- **Hover / Focus:** Hover deepens the wine. Keyboard focus uses a visible two-pixel rose ring with offset; active state moves down by one pixel. Reduced-motion users do not depend on movement.
- **Outline / Ghost:** Outline buttons use a fine border on transparent paper; ghost buttons remove the border. Both adopt quiet blush on hover.

### Cards / Containers

- **Corner Style:** Content panels use a 1rem radius; page-scale paper uses 1.25rem.
- **Background:** Card paper for bounded content and quiet blush for supporting context.
- **Shadow Strategy:** Most panels remain tonal and border-led; only principal paper surfaces or focused form containers receive ambient depth.
- **Border:** Fine rules separate large regions and page edges.
- **Internal Padding:** 1.5rem on phones, commonly growing to 2rem on wider screens.

### Inputs / Fields

- **Style:** Three-rem-high field-paper surface, fine-rule border, 0.5rem radius, and one-rem horizontal padding.
- **Focus:** Border shifts to deep wine and adds a translucent rose ring.
- **Error / Disabled:** Error messaging uses a separate danger color and text, not color alone; disabled fields lower opacity and show a not-allowed cursor.

### Bucket Dialogs

Bucket-list Options and in-place idea editing use one focused, warm card-paper dialog. The list landing page shows spacious linked list rows and a direct Add list dialog. Each list has its own ideas page and Add idea action. Options moves between filtering and management of that list with an explicit Back action, never stacked dialogs. Native modal behavior makes the background inert; Tab cycles inside, Escape closes, and focus returns to the opener. Long forms scroll inside a viewport-bounded surface with a persistent close control. Pending mutations disable dismissal; failed saves keep the form and show feedback inside it.

Applied filters remain visible as removable blush controls above the idea rows. The list landing page has a direct creation action, including its empty state. Step editing retains visible Save controls and 44px checkbox/reorder targets; narrow screens put reorder actions below the input instead of compressing it.

### Idea Tiles and Organize

An opened bucket list is sectioned under wine label headings with an icon and a count: In progress, Planned, Ideas, Completed by default, or by category or priority from the Organize control beside Options. Organize is a native select laid under an outline-button face, so phones get their own picker. Ideas are card-paper tiles in one column on phones and two from `sm`. The tile rule is border or tone, never both with shadow. A tile leads with a round blush category mark and a four-dot rose priority meter (the memory-rating vocabulary, with a sparkle for Dream). Then comes the serif title, clamped to two lines, and a two-line story, then date and place in muted metadata. A lived idea sits on muted paper, trades its category mark for a success check, and says "Lived" and the date. Whatever the list is grouped by is left off the tile.

### Page Headers

Every signed-in surface uses one page header component rather than a hand-built `<header>`. It composes an optional back row, a wine label eyebrow, one serif `h1`, and a lede capped at 68 characters, with page actions bottom-aligned to the right on wide screens and stacked below on phones. Two scales exist: `display` for page indexes and `compact` for workspaces and narrow reading columns. The fine rule under the header is on by default and turned off only where the next element already provides separation. No surface introduces its own header rhythm, heading size, tracking, or lede measure.

### Shared States

Two components carry the states a partner meets most often, so they read identically everywhere.

- **Pairing notice:** a quiet blush panel with the handshake mark, a serif title, an explanation of the couple boundary, and one wine action to the connection page. Used wherever a surface needs two active accounts before it has anything to show.
- **Empty state:** content-led rather than a bounded card. An optional mark, a serif title in the product's own voice, one explanation, and the actions that would fill it.

**The One Locked Door Rule.** An unpaired surface explains the couple boundary through the pairing notice, never through a bare sentence, a link in running text, or a differently shaped card.

### Navigation

Desktop navigation lives in the warm card-paper sidebar and uses quiet blush to mark the active destination. Mobile navigation is fixed to the bottom safe area, uses the same paper tone with a fine top rule, and pairs icons with compact labels. All navigation targets meet the 44px minimum touch height. Five evenly spaced mobile targets prevent cramped labels; Lists is the short mobile label for Bucket lists. More uses the shared modal focus and Escape behavior. Bottom content padding reserves navigation height plus the device safe area.

The mobile top bar carries only search and the notification bell; appearance (Light, Dark, Match this device) and Sign out live in Profile (ADR-054). The desktop sidebar has a Search button under the brand. Its badge shows the signed-in recipient's unread count, capped visually at 99+, while the accessible name states the full count. At narrow phone widths the brand uses a smaller single-line serif label so both controls keep their 44px targets.

**Search.** The search icon opens one sheet (bottom sheet on phones, centred from tablet width): a 48px field that takes focus, a Filters button with the active count for the screen's own filters, and a "Search everywhere" check box. Results are ruled rows with a round section mark, the kicker above the title, and italic section headings when searching everywhere. Search reads the current screen's section by default; Home, Gallery and settings always search everywhere. On a page with a cover the header is laid transparently over it (see Cover Screens).

### Cover Screens

The redesign in progress (ADR-053), so far applied to Home, Memories, the Gallery, Moments, Notes and the Drawings list. A cover opens the screen: the newest relevant photograph under a scrim that darkens its top and foot, or the cover field (deep wine in light mode, near-black in dark) when there is none. Its type is always light. On phones the cover bleeds to the screen edges and the phone header lies over it; from tablet width it is a rounded panel inside the content column. A sheet with the 1.25rem radius on its top corners overlaps the cover's foot on phones. It holds one highlighted block for the next step (a blush or ink field with a date tile) and ruled rows, each a 44px leading mark (round icon field, avatar, thumbnail or progress ring), a small muted kicker and a 17px semibold title. Create actions sit behind one rose button that opens a single sheet: floating above the bottom navigation on phones, inline beside the greeting from tablet width. On phones the sheet rises from the bottom edge.

Home's cover is the newest memory's first photograph with the day count in the 72px display serif and a "Recently kept" link. Beneath: the greeting, the next plan or an invitation to make one, then rows for the featured moment, the latest note, the latest drawing (with Draw back), bucket progress and wishes. Four recent photographs and Open gallery sit last on phones and in a 20rem side column from desktop width, followed by the privacy line.

Memories' cover is the newest photographed memory under a 44px serif "Memories" and one line, "N kept · the latest was …". There is no search or filter: the sheet goes straight into italic serif month labels and ruled rows, each a 44px thumbnail or monogram with the date (or "no photos yet") above the title and a small heart for a favourite. Place, story and tags stay on the memory. Add a memory floats on phones and sits on the cover from tablet width.

A memory's cover is its own lead photograph, with "Memory · date" and the title in the display serif, and a round 44px back button in its top-left corner; on a phone the app header steps aside for it. The sheet opens with "Kept by" and the keeper's avatar, the favourite heart and rating dots opposite, then tag chips and a place chip with a pin, then the story as plain large text and "From the plan …" or "From your bucket list" when it began there, then the photo collection and the conversation; Edit and Delete are in the corner menu.

The Gallery's cover is a band: the cover field with no photograph, only as tall as its title, because the sheet beneath is already all photographs. It carries a 40px serif "Gallery" and one line stating what is kept ("128 photos and videos", "12 photos", "1 video"). The sheet opens with the Filter button and, opposite it, "Grouped by memory and moment" or the applied-filter summary. Each memory or moment is then a 19px serif title with a small chevron, which is the link into that entry, over a muted line ("Memory · Nov 2 · 12 files"; the year appears only when it is not this one, and the count is withheld while later pages may still add to the group), and a contact sheet: square tiles with the 0.5rem control radius and a 6px gap, three across on phones, four from `sm`, six from `xl`, with no captions. A video tile carries a 24px play mark in its upper right and its length in a small chip at the lower left. Grouped by date, the title is the long date and is not a link. One entry's gallery is the same screen named for that entry: a "Memory gallery" or "Moment gallery" label over the entry's title, the round corner back button to the entry, no group heading, and "Open the whole gallery" at the foot under a fine rule. While files are read, six skeleton tiles hold the grid.

Moments' cover is the first photograph of the newest pictured moment under a 44px serif "Moments" and the line "The dates that hold the thread". Each moment on the sheet is a ruled row: a 17px semibold title that opens it, a muted line of its long date, its kind when it has one ("Travel", "Anniversary"; a custom moment names none) and "Featured" in the accent, a two-line story in 14px muted text, then a strip of up to six 76px photographs with the control radius and a 6px gap that runs off the sheet's right edge on phones and scrolls sideways. "View all N files" follows only when the entry holds more than the strip shows. A moment with no photographs shows no strip and asks for none; a moment with some holds their place with skeleton tiles until they are read. Add a moment floats on phones and sits on the cover from tablet width.

A moment's page follows a memory's: its first photograph is the cover, with "Moment · date" and the title in the display serif and the round back button in the corner. The sheet opens with "Kept by" and the keeper's avatar, with a filled star and "Featured" opposite when it is featured, then a kind chip and a place chip with a pin, the story as plain large text, the photo collection and the conversation. A moment has no edit or delete yet, so the page has no action foot.

Notes' cover is a band, because words have no photograph to lead with: a 40px serif "Notes" over "Letters to each other, and pages of your own". The sheet is ruled rows aligned to their top: a 44px lead (the writer's avatar for a shared note, a round field with a lock for a private one), a 17px semibold title that may wrap, a two-line 14px excerpt, and a last muted line, "From Sam · Nov 9", "From you · Nov 6" or "Only you · Dec 1, 2025" (the year only when it is not this one, with the full time as the tooltip). A partner's shared note not yet opened carries a small rose "New" pill opposite the title. There is no separate Private pill or pinned badge: the lock and "Only you" say it. "Older notes" follows the list. Write a note floats on phones and sits on the band from tablet width.

A note's page is a band with the round back button in its corner: an accent label, "Shared note · November 9" or "Private note · …", over the title in the 32px serif. On the sheet a letter leads with the writer's avatar, "From Sam to you" or "From you to Sam" and when it was written; the words follow on the one-pixel note thread at 16px with a 1.7 line height, exactly as typed, and the writer's name is signed beneath in 24px serif italic. A private note leads with a lock mark and "Only you" and carries no signature. The reader of a partner's letter gets a full-width rose "Write back" and an outline "Reply with a drawing" (side by side from tablet width); the writer gets Edit and Delete in the corner menu. The paper card and journal tint of the earlier design are gone.

Drawings' cover is a band: a 40px serif "Drawings" over "Little things, drawn by hand". When the newest drawing is your partner's, the sheet leads with the next-step block: a 64px thumbnail on white, "Sam sent a drawing" in the accent, when it arrived, and a primary "Draw back"; the thumbnail and text open the drawing. Under a serif "Back and forth", every drawing sits on a small mat (quiet blush in light, the card colour in dark, 1rem radius, 10px padding) holding the drawing on white at 4:3 and one line, "Sam · Sunday" or "You · yesterday", with a rose "New" pill on one you have not opened. Two mats across on phones, three from `sm`, four from `lg`. The earlier three-colour pastel mats are gone. Make a drawing floats on phones and sits on the band from tablet width.

**The form pattern.** A form is a band with the round back button, a 34px serif title naming the task ("New note", "Edit note") and one short line; the back button is the way out, so the form has no Cancel. The sheet holds one column of fields 16px apart: a 14px semibold label, the 48px field, and help text in 13px muted type. A two-way choice is a pair of equal 44px controls side by side with an icon and a word each; the chosen one is filled and its border takes the primary colour, and one line beneath states what that choice means. Counters sit opposite the label. The form ends in one primary action, 48px tall and full width on phones, with "Unsaved changes" beside it when there are any. So far applied to the note form.

**Motion.** One entrance per Cover screen: the photograph settles from a 1.08 zoom over 1.6s, the title rises 14px out of a 6px blur, rows follow in a 45ms stagger, and the floating button springs in last. Hovering a row nudges its chevron and scales its thumbnail. All of it is off under reduced motion and leaves no transform or filter behind.

The cover, the sheet, the corner back button and the floating action are shared components (`components/app/cover.tsx`), so every Cover screen lays them out identically.

Every route a partner can reach is reachable from navigation; no destination depends on a link that happens to sit on Home. Each destination carries its own icon, so no two adjacent items read as the same thing.

### Calendar Day Markers

A calendar cell marks the kinds saved on that date by shape first and color second: a wine circle for a plan, a rose square for a memory, and a blush-ink diamond for a moment. Shape carries the meaning because wine and rose resolve to the same token in dark mode. The cell's accessible name lists the kinds present rather than only a count.

### Relationship Thread

The signature component is a content-led vertical sequence: circular card-paper markers sit over a one-pixel line that gradients from fine rule through restrained rose and back. Each marker introduces a serif title and supporting sans-serif copy. Use it only when entries form a genuine temporal or conceptual journey.

### Deletion and the Corner Menu

Edit, Delete and their kin (Cancel plan, Rename list) live in one round "More options" button in the cover's top-right corner, opposite the back button, on every detail page you can change: plan, idea, bucket list, memory, your own note and your own wish. A partner's note or wish has no menu. The menu is a card on the page layer: items with a muted mark, a rule, then the danger item in danger text; arrow keys move, Escape or an outside tap closes, and it scrolls with the page. The page itself ends on its content. (This replaces the ruled Edit and Delete row at the foot, 2026-11-13.) Delete always opens a confirmation dialog. It carries a round danger-tint mark, a serif question ("Delete this note?"), the named item and what goes and what stays, then "Keep it" (focused) and a solid danger button repeating the action. A precondition the server enforces is shown as a blush note inside the dialog, and it disables the confirm button. While deleting, every control, including close, is disabled; a deletion that leaves the page stays pending until the route changes. There are no disclosures or typed confirmations for ordinary content. Couple and account deletion keep their stronger typed confirmation.

### Memory Monogram

A memory with no photograph wears its own initial in the thumbnail square: the first letter of its first lettered word ("5 meetup" reads M), in the story serif and wine, on the blush field with a faint rose corner. A title with no lettered word gets a small heart. A failed image still shows the image-off glyph, because that one is information.

### Notes as Letters

A shared note is a letter: the author's avatar and "From … to …" at its head, the body on the one-pixel note thread, and the author's name signed in serif italic at the foot. A private note is a page of your own: a lock mark and "Only you", unsigned. Both sit directly on a Cover screen's sheet (see Cover Screens), not on a card. The notes list is a Cover screen (see Cover Screens): each row leads with the author's avatar, or a lock for a private note, then a 17px title, a quiet 14px two-line excerpt and a "From …" or "Only you" line.

### Compact Moments

Moments are a Cover screen (see Cover Screens): full-width reading rows separated by fine rules, without the old timeline gutter. Titles are 17px semibold, followed by one date/kind line and a two-line story preview. Up to six photos sit in a horizontally scrollable strip of small square tiles. Every tile opens the viewer. The title opens the moment, and View all N files appears only when the scoped gallery contains files beyond the preview. Detail media controls use the explicit label Open gallery.

## Do's and Don'ts

### Do:

- **Do** organize major experiences around one clear narrative path and one dominant next step.
- **Do** reserve deep wine for primary action, active emphasis, and the brand voice.
- **Do** pair large serif relationship language with sans-serif controls and explanations.
- **Do** preserve visible focus, 44px touch targets, high-contrast text, and reduced-motion behavior.
- **Do** use privacy state as explicit, readable interface content.
- **Do** say **Moments** in every piece of interface copy for the shared timeline. The `/milestones` route and the `milestones` table keep their internal names; users never see the word.

### Don't:

- **Don't** turn relationship progress into a generic grid of equal metric cards.
- **Don't** use hearts, rose, or wine as all-over decoration; their restraint is part of the premium tone.
- **Don't** introduce unrelated bright accents, cool gray dashboards, or blue-black dark mode.
- **Don't** add shadow to every container; use tonal grouping and fine rules first.
- **Don't** use pill shapes for ordinary buttons, fields, or panels.
- **Don't** hand-build a page header, pairing notice, or empty state when the shared component exists.
- **Don't** paste a radius or shadow value that the named scale already covers.
## Drawing workspace — 2026-09-17

Drawings have their own navigation destination and history, separate from editable text Notes. The editor places a fixed 4:3 white card inside a soft rose mat. Nine drawing tools are shown as icon buttons with accessible names and a visible selected state. Eleven preset swatches replace the custom color input; the eyedropper can still sample the page. A 1–12 size slider controls pencil, marker, highlighter, airbrush and eraser strokes. Pencil is narrow, marker is opaque and broad, highlighter is translucent with a square tip, and airbrush deposits a soft spray. Undo, redo and clear use compact icon controls. Send remains a two-step preview and confirmation. Mobile uses a four-column tool grid and wraps swatches; desktop uses one tool row. Keyboard focus and reduced-motion behavior remain explicit.

## Photo viewer, picture framing and Our Story — 2026-09-25

**Photo viewer.** A photo opens the way a phone shows one: full screen on black, fitted to the screen, with nothing else competing. The neighbouring files wait either side, so a sideways swipe pulls the next one in under the finger, with a 24px gap and a 260ms exponential ease-out settle. The first and last files resist rather than wrap. Pinch or double-tap zooms to 2.5×. Swipe up for comments; pull down to put the photo away, with the black fading as it goes. The top bar is a black-to-transparent gradient holding Close, the source title in the serif with "n of m · date", and a three-dot menu on card paper. It appears on tap, mouse movement or keyboard focus, and takes no taps while hidden. The bottom carries only the caption, at most three lines, and a chevron "Comments" handle. Comments and the caption editor rise in a card-paper sheet with a drag handle and the 1.25rem surface radius on its top corners. Crossing into a different memory raises a small translucent label with the memory's serif title and date for 2.6 seconds. Pointer devices get round translucent arrows. Reduced motion removes every slide and fade.

**Picture framing.** Choosing a profile picture opens a card-paper dialog around a square framing window on near-black, with the avatar circle cut out by a dim surround and a fine white ring. Rule-of-thirds lines appear only while dragging. Below it sit a zoom slider between zoom-out and zoom-in icons, then four equal outline tools with icon and short label: Left, Right, Center and Reset. Center and Reset disable when they would do nothing. Settings shows one face per person: the editor's circle carries it, and the section heading does not repeat it.

**Our Story.** An album rather than a log. The header eyebrow is the two overlapping avatars and both names. The lede is one sentence: when it began and what has been kept. Each year opens with a large wine serif numeral and an italic "Chapter …" label over a fine rule; italic serif month names mark each new month on the thread. Memories and moments show up to three photos as prints: card-paper mats, the lead photo tilted about 1.25° with a paper shadow and two more peeking behind. Alternate entries lean the other way, and hover or focus straightens the lead print. A 3xl serif title follows, then a three-line story excerpt and "Kept by" with a small avatar. Plans kept and dreams lived are quieter 2xl lines with muted markers. The last page closes, centred, on the pair of avatars, "Where it began" and the date.


## Video thumbnails - 2026-10-03

Video tiles now show an early paused frame fitted to the existing square crop. A small translucent black play mark sits at the upper right; the film mark and duration remain on the bottom gradient. A sending file's tile uses the same frame. Loading keeps the existing skeleton, and unreadable originals show "Preview unavailable" without disabling the video action. Desktop and mobile visual evidence uses the fictional flower-video fixture.

## Adding photos and local time — 2026-10-19

**Adding photos.** Choosing files sends them straight away. Each one takes its place in the entry's grid as a tile that develops while it sends: it starts muted and mostly grey and gains its colour and brightness with the transfer, the way a print comes up in the tray, over a 4px wine line along the bottom edge. A small black chip names the state — Up next, Starting, a percentage, Paused, Waiting, Finishing… — and Finishing breathes the full wine line instead of inventing a number. A round black × in the corner (44px target) takes a file out; it is absent while the server finishes. A file that cannot be added keeps its tile under a card-paper veil with a danger mark, "Couldn't add" and a wine "Try again"; the whole tile is the retry button and the reason sits beneath it. Files left unfinished on another visit appear only to the person who added them, as dashed-rose tiles reading "Didn't finish · Try again". The chooser is the last cell: a dashed rose border on blush, "Add more". Beneath the grid, one blush status line speaks for the batch ("Adding 3 photos", "Paused · 2 photos still to add", "Waiting for a connection" with "They'll carry on by themselves when you're back online.") over a thin progress rule, with a single outline Pause or wine Continue at 44px. File names, sizes, HTTP codes and the words upload, processing and status never appear. Creation forms show chosen files as the same square tiles with ×, and say they will be added as soon as the entry is saved; captions are written afterwards in the viewer.

**Local time.** Profile and onboarding show the zone as a quiet blush row with a clock mark — "Your local time: Asia/Karachi" and "Taken from this device, so plans, notes and notifications follow you wherever you are." — instead of a text field asking for an IANA name.

## Drawing editor as a Cover screen — 2026-11-12

The editor follows the "Drawing editor" mockup. Its own top bar (close, "For {partner}", Send) replaces the phone header. The 4:3 paper sits edge to edge on the raised `secondary` field, no longer in a rose mat. Below it, with no headings: nine 44px square tools (bordered, the chosen one filled `primary`), eleven 44px round swatches (the chosen one ringed in `foreground`), then undo, redo and "Clear the page" beside the 1–12 size slider. On a phone the tool row scrolls with a fade at the right edge; from `sm` it is one row. Send still opens a review of the exact image before anything is sent. This supersedes the four-column grid, visible tool labels and rose mat described in the 2026-09-17 section.

## Wishlists as a Cover screen — 2026-11-12

Wishlists opens on a band ("Wishlists", "What each of you is quietly hoping for"). The sheet shows one list at a time behind a two-link switch, "{partner}'s wishes" first and "Your wishes" second (`?list=mine`); the chosen link is filled `secondary`, the other outlined. One muted line under it says who can read what. Wishes are ruled rows: a 44px round gift mark, a 13px kicker over a 17px semibold title, a chevron. The kicker is "Really want" (only for that priority), the price and the category or shop host. On the partner's list, a wish the viewer is planning to give shows a lock and "You're planning this", "You've got this" or "You gave this", followed by "only you can see". Below it, "Your gift plans · Private to you" lists the plans still to give. New wish floats on phones and sits on the band from tablet width.

## A wish as a Cover screen — 2026-11-12

A wish opens on a band with the corner back button (to the list it came from), an accent "{owner}'s wish" and a 34px serif title. The sheet gives facts as quiet icon lines (priority, price, category, then "Open the link {owner} saved · host" in accent), the description, and "{owner}'s note". On a partner's wish the viewer's gift plan is one raised `secondary` panel with a rose lock: "You're planning this." / "You've got this." / "You gave this." over "Only you can see this. {partner} still sees an ordinary wish.", one quiet button forward and Undo one step back, and an optional private note. With no plan it asks "Giving this?" with "I'm planning this" and "I've got it". On your own wish the same panel shape explains that plans are hidden from you, and Edit and Remove are in the corner menu.

## Our Story as a Cover screen — 2026-11-12

Our Story opens on a photo cover (the newest pictured memory or moment on the page) with the two avatars, a 48px "Our Story" and one line: names, the day count (the same `relationshipDayCount` as Home) and memories kept. The sheet starts with a row of year chapters (links, the shown year filled `primary`) that scrolls on a phone. Each year opens with its number at 72px serif, and opposite it the chapter ("Chapter four") and the year's count ("18 kept so far" for the current year). The thread is a one-pixel line with italic serif month markers on a rose ring. Memories and moments are small covers: the lead photo under a scrim with the kicker and a 28px serif title, or a 2:1 grid with two more photos when there are three; moments wear a rose "Moment" pill. Plans kept, dreams lived and photoless entries are quiet rows with a dot on the thread. The first lines of a story sit under its card. "Keep reading: 2024 and 2023" pages on; the last page ends with the avatars, an italic "Where it began" and the date. The tilted prints, the thread icon markers, "Kept by" and the place line are gone from the timeline.

## Calendar as a Cover screen — 2026-11-12

The calendar opens on a band whose 40px serif title is the month, with the year and what the month holds beneath ("2026 · 2 plans, 1 memory") and two 44px arrow links beside it; away from this month a "Today" link joins them. Each month is its own address (`/calendar?month=YYYY-MM`). The sheet starts with three toggle chips (`secondary` when on, a hairline outline and a faded marker when off), each carrying its marker: plans a round dot, memories a rose square, moments a diamond. The grid has no rules: single-letter weekdays, 46px days with their markers under the number, trailing days faded, today a thin rose ring, the chosen day filled `primary` with its markers in `primary-foreground`. A month that fits in five weeks shows five rows. Under the grid the chosen day is a 22px serif heading ("Saturday 14 November") over ruled rows: a 44px round icon, a kicker that says when and where ("Plan · Day 1 of 3 · 10:00 AM · Nathia Gali"), the title and a chevron. One outline "Add to this day" opens three tiles — a plan, a memory, a moment — with the day filled in, a plan first for days still to come. From desktop width the grid and the day sit side by side. The Month/Week switch, the Today button and the three creation links are gone; week view stays on Plans.

## Plans as a Cover screen — 2026-11-12

Plans opens on a band with a 40px serif "Plans" and "2 coming up · 14 kept". The next plan leads as a raised `secondary` card: a 56x64 date tile on the page colour ("NOV" over a 28px serif day), an accent "Next · in 3 days", the title at 18px and "Sat · 7:30 PM · Lakeside"; an accent chevron. Coming up, Did these happen? (planned, every day past), Kept and, on request, Cancelled are 22px serif headings over ruled rows with a 44px date tile (`secondary`, 11px month over a 19px serif day; quieter for past plans), a kicker and the title. A kept plan links to the memory it became ("Became a memory") or says "No memory yet". The cancelled count is one muted link at the foot. New plan floats on a phone and sits in the band from tablet width. The Upcoming/Month/Week switch, the status select and the plans grid are gone.

## A plan as a Cover screen — 2026-11-12

A plan opens on a band with the corner back button, an accent kicker that says where it stands ("Coming up in 3 days", "Happening now", "Did this happen?", "Kept", or a muted "Cancelled"), a 34px serif title and quiet icon lines: when in full ("Saturday 14 November · 7:30 PM", a same-day range, or both ends of a trip), where, and the budget. The sheet gives the story and an "Open the map" link; for a plan whose day has come, one raised panel with "Keep it as a memory" (marks it kept and opens the memory form) and "Mark it kept, no memory"; for a cancelled one, Restore. "To do" is tick rows with a 22px rounded box, done steps struck through, "1 of 3 done" opposite the heading, and "Add a step" / "Edit steps" as quiet links (renaming, reordering and removal live behind Edit steps). Reminders, Where it began (the bucket idea) and Attachments are ruled rows with a 44px round icon, kicker and title. A kept plan ends on a full-width "Open the memory" or "Keep it as a memory". Edit, Cancel plan (for a planned one) and Delete are in the corner menu. Errors from a change appear as a dismissible toast above the navigation, so they are seen wherever the change was made.

## New plan and Edit plan in the Cover form pattern — 2026-11-12

New plan opens on a band with the corner back button, a 34px serif "New plan" and "Something to look forward to." (from a bucket idea: an accent "From your bucket list" over the title, and the picker panel says which idea). The sheet holds, in order: "What are you planning?", Date and Time side by side, Place (OpenStreetMap suggestions; "Any name you type is fine."), Notes, and Remind us (The day before by default, with "Arrives Fri 18 Dec · 7:30 PM." beneath once the day and time are known), then one full-width "Save plan". Kind, end, budget, map link, timezone and the clock-change rule sit in one raised "More details" panel that opens by itself when any of them is filled or has an error. The bucket-list picker is a compact raised panel above the form. Edit plan is the same form with "Edit plan" over the plan's title in the band, no reminder field (reminders are managed on the plan page) and "Save changes".

## Bucket lists as a Cover screen — 2026-11-13

Bucket lists opens on a band with a 40px serif "Bucket lists" and "23 dreams · 7 lived". Each list is a ruled row led by a 44px ring: a 4px `border` track with a rose arc that fills clockwise from the top as the list's dreams are lived (no arc for none), then "9 dreams · 2 lived" over the list's name and a chevron; an empty list says "No dreams yet". "Lately lived" (22px serif) lists the five most recently lived dreams with a round `secondary` dot holding a green tick, "List · lived 12 Sept" (the year when not this one). New list floats on a phone and sits in the band from tablet width; both open a small dialog ("List name", "Make the list") and the new list opens once made.

## A bucket list as a Cover screen — 2026-11-13

A list opens on a band with the corner back button, an accent "Bucket list", its name at 40px serif and "9 dreams · 2 lived" (counts for the whole list, not the first page). Under it two outline controls: "Organize: Status" (a native select under a button face; status, category or priority, kept per device) and "Options" (filters, and Manage this list for rename and delete). Ideas sit in sections headed by an accent label with a count ("In progress · 1", "Planned", "Ideas", "Lived"); each is a ruled row with a 44px round mark for its category, or a green tick once lived, a kicker of the four-dot priority meter and word plus "by 10 May" when it has a target (the status word when the list is organized another way; "Lived 12 Sept" for a lived one), the title and a chevron. The category is spoken for screen readers, since the mark only draws it. A section longer than five ends in "Show 3 more ideas". Add idea floats on a phone and sits in the band from tablet width. The idea tiles are gone.

## A bucket idea as a Cover screen — 2026-11-13

An idea opens on a band with the corner back button ("Back to {list}"), an accent "{list} · In progress", a 34px serif title, and the four-dot priority meter with its word. The sheet gives the story, then quiet icon lines for the category, place, "By 10 May 2027" and "About EUR 1,800". Steps are tick rows (22px rounded box, done steps struck through, "2 of 3 done" opposite the heading) with "Add a step" and "Edit steps" as quiet links; renaming, arrows, the drag handle, hold-and-drag on a phone and removal live behind Edit steps. "Make it a plan" is the full-width primary with "We lived it" in outline beneath; We lived it opens a raised "When did you live it?" panel. A lived idea shows a raised "One more dream lived." panel with Save this as a memory and the day you lived it. Edit (the editor dialog) and Delete sit side by side at the foot. Failures appear as a dismissible toast above the navigation.

## Notifications as a Cover screen — 2026-11-13

Notifications opens on a band with a 36px serif "Notifications" and "2 unread" (or "All caught up"). "New" (an accent label, with "Mark all read" opposite) and "Earlier" are ruled rows: your partner's 44px avatar for notes, drawings, memories, moments, wishes and bucket ideas, or a round `secondary` bell for reminders, On this day and system notices; a kicker of relative time ("9 minutes ago", "Yesterday", "3 days ago", then "2 Oct"); the line itself, semibold with a 8px rose dot while unread and regular once read. A row is the link: it opens what it points to and marks itself read on the way. "Notification settings" is an outline disclosure holding the preferences form and device alerts, closed by default. The privacy line closes the page.

## Corner menu for entry actions — 2026-11-13

On the owner's direction the Edit and Delete row left the foot of every detail page for the mockups' "More options" (three dots) in the cover's top-right corner: a 44px round button on the cover scrim, mirroring the back button. Plan: Edit plan, Cancel plan, Delete plan. Idea: Edit idea (the editor dialog), Delete idea. Bucket list: Rename list, Delete list (the toolbar's Options is now filters only, "Filter ideas"). Memory: Edit memory, Delete memory. Your own note: Edit note, Delete note. Your own wish: Edit wish, Remove wish. Earlier sections that place Edit and Delete at the foot are superseded.

## Profile as a Cover screen — 2026-11-13

Profile opens on a band with your 64px avatar (ringed in the cover field) beside your name at 34px serif and "Your account". The sheet is one ruled list of 44px-led rows: Name and picture (opens in place to the profile form), Your local time · taken from this device (shown, not a link), Appearance (opens in place to the three appearance choices; the row names the current one after hydration), Notifications and Privacy locks ("2 sections locked", "Off", or "Needs a connected account" in the preview) leading to their pages, and Partner with their avatar leading to the partner page. A full-width outline Sign out closes the page, with the waiting-uploads line beneath. How your partner appears to you moved to the partner page (`/pairing`).

## Partner as a Cover screen — 2026-11-13

Paired, the partner page (`/pairing`) opens on a band with both avatars overlapped at 64px, "Alex and Maya" at 34px serif and "Together here since 14 August 2022 · 1,552 days". The sheet leads with a raised `secondary` panel: a green circled tick, "Connected", and "Two accounts share this space. Nobody else can be added, and shared access lasts only while both memberships are active." Then ruled rows: What you call your partner (their avatar; opens in place to the name-and-picture editor and Forget these details), Their local time, and Where it began (links to Our Story). "Leave this space" is a full-width danger outline with "You'll be asked to confirm before anything changes." beneath; it opens a dialog with the typed LEAVE confirmation. Before pairing, the band names the state ("Bring your two accounts together." / "Your invitation is waiting.") and the sheet holds the existing invitation forms.

## The More sheet — 2026-11-13

More on a phone opens a bottom sheet instead of a centred dialog: flush to the bottom edge with a 20px top radius, a 40px grab mark, "More together." in 22px serif with the close button opposite, then three groups (accent labels "Plan together", "Keep together", "Your account"), each a two-column grid of 48px outlined tiles with a muted icon and a 15px semibold label; the current destination has a `primary` border and `secondary` fill. It lists every destination but Home, including the four in the bottom bar, in the order Calendar, Plans, Bucket lists; Memories, Gallery, Moments, Notes, Drawings, Wishlists, Our Story; Notifications, Profile, Partner, Privacy locks. It slides up with the photo viewer's sheet motion (none under reduced motion). The desktop sidebar follows the same order.

## The privacy lock screen — 2026-11-13

A locked section is a centred screen, no card: a 44px round lock mark, "Memories is locked" in 28px serif, "Enter your PIN to open it for five minutes", a row of 14px dots (rose when entered, `border` when not; spoken as "2 of 4 digits entered"), and a keypad of 84x76 filled hearts (`secondary`, warming toward rose on hover) with 22px semibold digits. The pad's bottom row is device unlock (a fingerprint key, only where this browser has it set up), 0, and delete. A PIN of known length opens the section as soon as its last digit is in; an older PIN of unknown length keeps an Open button. A wrong PIN clears the dots and says so beneath. The same pad serves PIN setup in Privacy locks, whose page now sits under a band with a back button to Profile. There is no "Forgot your PIN?" link: no reset exists, and a link would lead nowhere.

## Onboarding in the Cover language — 2026-11-13

Each setup step opens on a standard cover (the cover field; there is no photograph yet) with "Step 2 of 4" above the step's 40px serif title ("Begin with you.", "Give your story a beginning.", "And the person you're doing this with.", "Bring your person in."). The sheet opens with a four-part 4px progress bar (rose for steps reached, `border` for the rest; spoken as "Step 2 of 4"), one line about the step, then its form, unchanged. An invitation shows "Your pairing code" in a raised panel, the code in 32px serif with Copy beside it, and "Only the person you give it to can join."; an expired or missing code changes the title to "This invitation has expired." and offers "Create a fresh code". "I'll do this later" is a centred accent link at the foot of every step but the last. The mockup's "send it to their email" is not built: there is no email invitation.

## Sign in and the signed-out screens — 2026-11-13

Sign in, Create your space, Let's get you back in and Choose a new password share `AuthShell`: on a phone a 360px cover (the cover field lit by a soft rose glow, since there is no photograph before sign-in) with "Us Together" in serif at its head and the screen's 44px serif title and one line at its foot ("Welcome back." / "Your own private little world."), then the form on a sheet that overlaps it. On sign in, "Forgot your password?" sits right-aligned under the password field, and "New here? Create your space" closes the sheet; the local developer buttons stay below a rule. From desktop width the cover becomes a full-height panel on the left with the form beside it. The theme toggle that sat on the old auth header is gone; the device's setting decides until Profile.

## Landing in the Cover language — 2026-11-13

The front door is a 480px cover (the rose-lit cover field, as on the signed-out screens) with "Us Together" in serif and an outline Sign in at its head, and "Our own private little world." at 48px serif over "A shared journal for the two of you." at its foot. The sheet gives one line ("Plan what's next, keep what mattered, and watch it turn into your story."), the product loop as four ruled rows with 44px marks (Dream, Plan, Memory, Our Story), a full-width "Create your space", and the privacy line with a lock. From desktop width the cover is a full-height panel beside the rest. The relationship-thread style used only by the old landing page is removed.

## Offline — 2026-11-13

The offline page is centred and quiet: a 64px round `secondary` mark with a crossed-out signal, "You're offline." in 32px serif, "Your private space opens again as soon as you reconnect.", and a full-width Try again. The mockup's "What you've already opened is still here." is not used: the service worker keeps only this page, not the pages you visited. Try again is a plain link to the current address, so it reloads what you meant to open without needing any script. The shell cache is now `us-together-shell-v3`, so installed apps pick up the new page.
