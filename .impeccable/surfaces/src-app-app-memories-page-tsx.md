---
version: 1
slug: "src-app-app-memories-page-tsx"
primary_target: "src/app/(app)/memories/page.tsx"
related_targets: ["src/app/(app)/memories/new/page.tsx","src/app/(app)/memories/[id]/page.tsx","src/app/(app)/memories/[id]/edit/page.tsx"]
---

# The stories you keep

- **Mode:** Operate
- **Audience/job:** Preserve an ordinary moment or completed experience, add private media, and revisit its story without losing its source plan or idea.
- **Direction:** Inherit the Shared-Journal Thread: warm paper, deep-wine actions, serif titles, fine rules, and blush provenance. Hearts remain a small labeled Favorite accent.
- **Gallery:** Tag and Favorites only filters use an explicit Apply filters action. Story entries grow from one column on mobile to two, then three. Each entry retains date, title, excerpt, location, and tags, followed by up to six small square image previews in three columns. Preview media loads near the viewport; thumbnails open the swipeable viewer and Show more opens the entry's full photo/video gallery. Empty states and Load more memories remain explicit.
- **Story and location:** The date and large serif title lead through a saved place name, optional rating, story, tags, and the “Where this moment began” provenance aside. Creation/editing use the shared location combobox: Photon/OpenStreetMap suggestions, keyboard selection, Use my location, contributor attribution, and free-text fallback. Location search needs no paid key. Coordinate entry and coordinate display are absent.
- **Creation:** The bounded form pairs date/location and rating/favorite on wider screens and stacks them on mobile. Users can select several photos/videos and caption each before saving. The saved-story state starts the queued upload and offers View memory. Editing retains tags. Associated field errors and draft-preserving recovery remain visible.
- **Shared media:** Memory details lead with up to six square photo previews, three across on mobile and six on wider screens. Show more navigates to `/gallery?kind=memory&entry=UUID` for every photo/video in the memory; the multi-file uploader follows the previews. “What you remember” remains the entry-level comment thread. The separate combined gallery is available from Home; shared gallery/viewer rules are recorded in `src-app-app-gallery-page-tsx.md`.
- **Viewer and recovery:** Tiles open the shared native viewer with a sticky count/Close header. Desktop places photo and caption/file-comments side by side; mobile stacks them. Touch swipes, arrow keys, and Previous/Next navigate the files. Caption editing, file comments, and removal live inside the viewer. Uploads retain batch progress, processing, and Pause/Resume/Stop; unfinished files retain Finish processing and removal. Limits and hosted processing are defined in `docs/PHASE6_OPERATIONS.md`.
- **Preview:** Real selected files and comments work locally through IndexedDB. The interface states that preview photos remain in this browser for up to 24 hours and are not uploaded to the shared account. This replaces the former disabled preview uploader.
- **Deletion:** Typed DELETE confirmation remains behind disclosure; all files and unfinished uploads must be removed first, and source plans/ideas remain.
- **Evidence:** Listing previews use `.impeccable/qa/gallery-list-memory-{desktop,mobile}-chromium.png`. Current detail previews and viewer captures use `.impeccable/qa/gallery-preview-memory-{desktop,mobile}-chromium.png` and `gallery-viewer-{desktop,mobile}-chromium.png`. Earlier shared-memory and free-location captures retain their narrower evidence. Final visual/operational verification stays in the phase records.
