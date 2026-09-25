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
  night-paper: "#211a20"
  night-card: "#2a2127"
  night-rose: "#df879a"
typography:
  display:
    fontFamily: '"Iowan Old Style", Baskerville, "Times New Roman", serif'
    fontSize: "clamp(3rem, 6vw, 5.4rem)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.03em"
  headline:
    fontFamily: '"Iowan Old Style", Baskerville, "Times New Roman", serif'
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.03em"
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
- **Night Paper, Night Card, and Night Rose:** Dark-mode counterparts that keep the palette warm and legible.

### Named Rules

**The One Wine Voice Rule.** Deep wine carries primary action and active emphasis; do not introduce a second competing accent for ordinary interaction.

**The Warm Dark Rule.** Dark mode keeps plum, rose, and warm-paper relationships. It does not collapse into neutral black with electric accent colors.

## Typography

**Display Font:** Iowan Old Style, with Baskerville and Times New Roman fallbacks  
**Body Font:** Aptos, with Segoe UI Variable and Segoe UI fallbacks

**Character:** The serif is intimate and editorial, while the sans-serif keeps controls and longer explanations modern and highly readable. Their contrast creates warmth without making functional UI feel like stationery.

### Hierarchy

- **Display** (regular, fluid 3–5.4rem, 0.98 line-height): First-view headlines and major narrative statements; use tight tracking only at this scale.
- **Headline** (regular, 3rem, 1.02 line-height): Page-level signed-in headings.
- **Title** (regular, 1.5rem, 1.25 line-height): Journey steps, panels, and content groups.
- **Body** (regular, 1rem, 1.75 line-height): Explanations and form support; long introductory passages stay near 66–68 characters.
- **Label** (semibold, 0.875rem, 1.25 line-height): Fields, compact actions, section eyebrows, and navigation.

### Named Rules

**The Serif Tells the Story Rule.** Use the display serif for emotional hierarchy and relationship language; keep controls, validation, navigation, and explanatory copy in the sans-serif.

## Layout

The core spatial model is one narrative path with supporting context, not a collection of equal cards. Public landing and authentication surfaces sit within a bounded paper sheet; wide screens use an asymmetric two-column split, while narrow screens collapse to a single reading column without changing content order. The signed-in shell uses a persistent 16rem sidebar from the medium breakpoint upward and five bottom destinations on smaller screens: Home, Calendar, Lists, Memories, and More. The sidebar lists Home on its own, then three labelled groups that follow the product loop: Plan together (Calendar, Plans, Bucket lists), Keep together (Memories, Gallery, Moments, Notes, Wishlists), and Your account (Notifications, Profile, Partner). More opens a focused destination dialog carrying the same groups for every destination outside the phone bar. A skip-to-content link precedes the sidebar, the sidebar scrolls independently at full viewport height, and the phone header stays pinned to the top.

Content containers use generous outer gutters that grow from 1.25rem on phones to 2rem on larger screens. The product body is capped at 72rem, auth and landing sheets extend to 90–92rem, and form content stays near 29rem. Spacing follows the recurring 0.5rem, 0.75rem, 1rem, 1.25rem, 1.5rem, and 2rem rhythm, with larger page-level gaps composed from it.

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

Every route a partner can reach is reachable from navigation; no destination depends on a link that happens to sit on Home. Each destination carries its own icon, so no two adjacent items read as the same thing.

### Calendar Day Markers

A calendar cell marks the kinds saved on that date by shape first and color second: a wine circle for a plan, a rose square for a memory, and a blush-ink diamond for a moment. Shape carries the meaning because wine and rose resolve to the same token in dark mode. The cell's accessible name lists the kinds present rather than only a count.

### Relationship Thread

The signature component is a content-led vertical sequence: circular card-paper markers sit over a one-pixel line that gradients from fine rule through restrained rose and back. Each marker introduces a serif title and supporting sans-serif copy. Use it only when entries form a genuine temporal or conceptual journey.

### Deletion and the Page Foot

Every detail page ends with one ruled action row: an outline Edit with a pencil, then a danger-outline Delete with a trash mark. Delete always opens a confirmation dialog. It carries a round danger-tint mark, a serif question ("Delete this note?"), the named item and what goes and what stays, then "Keep it" (focused) and a solid danger button repeating the action. A precondition the server enforces is shown as a blush note inside the dialog, and it disables the confirm button. While deleting, every control, including close, is disabled; a deletion that leaves the page stays pending until the route changes. There are no disclosures or typed confirmations for ordinary content. Couple and account deletion keep their stronger typed confirmation.

### Memory Monogram

A memory with no photograph wears its own initial in the thumbnail square: the first letter of its first lettered word ("5 meetup" reads M), in the story serif and wine, on the blush field with a faint rose corner. A title with no lettered word gets a small heart. A failed image still shows the image-off glyph, because that one is information.

### Notes as Letters

A shared note is a letter: card paper with the paper shadow and no border, the author's avatar and "From … to …" at its head, the body on the one-pixel note thread, and the author's name signed in serif italic at the foot. A private note is a journal page: flat muted paper with an "Only you" seal. The notes list leads each row with the author's avatar and a small visibility badge pinned to it, a one-line serif title, and a two-line serif-italic excerpt.

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

