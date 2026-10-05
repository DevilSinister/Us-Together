---
version: 1
slug: "src-app-app-milestones-page-tsx"
primary_target: "src/app/(app)/milestones/[id]/page.tsx"
related_targets: ["src/app/(app)/milestones/page.tsx","src/app/(app)/milestones/new/page.tsx","src/components/dashboard/milestone-form.tsx","src/components/entries/media-collection.tsx"]
---

# Moments worth marking

- **Mode:** Operate
- **Audience/job:** Mark a meaningful date, preserve its details and photos, and exchange comments about the story or an individual file.
- **Direction:** Inherit the paper-and-wine journal. A small date and large serif title lead into the saved place and story; fine rules divide practical media/comment tools from the reading path.
- **Creation:** The existing milestone form collects name, kind, date, story, and optional place. It uses the same Photon/OpenStreetMap location search as memories, with nearby lookup, keyboard suggestions, attribution, and typed-name fallback. A multi-file picker gives each selected file a caption and removal control. Feature this milestone on Home remains a blush checkbox group. Saving with selected files opens the saved-moment state, processes the queue, and offers View moment.
- **Listing:** Compact rows retain title, date/type, a two-line description, and Featured state without a timeline gutter. Entry titles use the shared 18px sans-serif role. Up to six square photo previews form a horizontally scrollable strip with a partially visible next tile. Thumbnails open the viewer. A View all N files link appears only when files remain outside the preview and opens the scoped gallery; the title opens the moment.
- **Detail:** Back to moments precedes the compact date/title/location header and story. Up to six square previews have an explicitly named Open gallery link, followed by the uploader. The viewer, caption/file options, individual file comments, and unfinished-upload recovery reuse the shared gallery behavior in `src-app-app-gallery-page-tsx.md`. What you remember remains a separate entry-level comment thread.
- **Preview:** Real preview files, captions, and entry/file comments stay in this browser with the disclosed 24-hour boundary.
- **Evidence and boundary:** `.impeccable/qa/gallery-list-moment-{desktop,mobile}-chromium.png` captures listing previews and `gallery-preview-moment-{desktop,mobile}-chromium.png` captures the compact detail gallery; the earlier shared-moment captures predate that change. Final visual verification stays in the phase records. Location behavior follows the memories brief, and moment lifecycle scope is unchanged.
