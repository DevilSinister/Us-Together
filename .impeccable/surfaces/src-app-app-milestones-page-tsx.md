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
- **Listing:** The relationship timeline retains title, date/type, description, and Featured state. Each moment adds up to six small square image previews in three columns, loaded near the viewport. Thumbnails open the swipeable viewer; Show more opens `/gallery?kind=moment&entry=UUID` for every photo/video in that moment.
- **Detail:** Back to moments precedes the date/title/location header and story. Up to six square photo previews use the same Show more route, followed by the uploader. The native viewer with touch swipes, arrow keys and Previous/Next, caption/file options, individual file comments, and unfinished-upload recovery reuse the shared gallery behavior in `src-app-app-gallery-page-tsx.md`. What you remember remains a separate entry-level comment thread.
- **Preview:** Real preview files, captions, and entry/file comments stay in this browser with the disclosed 24-hour boundary.
- **Evidence and boundary:** `.impeccable/qa/gallery-list-moment-{desktop,mobile}-chromium.png` captures listing previews and `gallery-preview-moment-{desktop,mobile}-chromium.png` captures the compact detail gallery; the earlier shared-moment captures predate that change. Final visual verification stays in the phase records. Location behavior follows the memories brief, and moment lifecycle scope is unchanged.
