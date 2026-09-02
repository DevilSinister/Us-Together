# Foundation auth and home surface

- **Mode:** Operate
- **Audience/job:** A partner securely signs in, then understands the next shared moment and the Dream-to-Memory loop at a glance.
- **Direction:** A modern private letter meets a shared calendar. Warm paper surfaces, deep wine controls, quiet blush fields, and a single vertical thread connect upcoming plan, bucket idea, and recent memory.
- **Approved composition:** Delegated selection of generated Variant C. The timeline hierarchy carries forward; wax seals, torn-paper edges, device chrome, and generated photos do not.
- **Gallery entry point:** Home quick actions include Open gallery, leading to shared photos/videos grouped by memory/moment or date. The gallery preserves the journal identity; its compact filters, preview hierarchy, and shared file viewer are documented in `src-app-app-gallery-page-tsx.md`.
- **Constraints:** Email/password only; never claim E2EE; mobile-first; clear privacy state; no fake actions or demo data presented as user data.

## Direction contract

**THESIS:** Relationship continuity is the home structure; refuse the generic equal-card dashboard.

**OWN-WORLD:** Warm paper and blush fields, deep-wine actions, charcoal text, fine rules, restrained rose, content-led vertical rhythm.

**STORY:** Sign in to a private shared space, then move from what is next to what you dream about and what you remember.

**FIRST VIEWPORT:** Auth uses a calm split composition with the form primary. Signed-in mobile home leads with greeting and relationship thread; desktop adds persistent navigation without changing the story.

**FORM:** `concept-c/relationship-thread-calm-auth` — operate-first shared-journal composition selected from three generated north-star variants. The implemented auth form sits on the right so the narrative promise is read before credentials on wide screens; semantic HTML/CSS implements every control and piece of text.

## Fidelity inventory

| Ingredient | Implementation |
| --- | --- |
| Auth split and typography | Semantic HTML and CSS |
| Fine relationship thread | CSS border and Lucide icons |
| Navigation and controls | React, shadcn-derived primitives, Lucide |
| User content/media | Real Supabase data later; honest empty states now |
| Paper tactility | Flat color and restrained shadow; no raster texture required |
