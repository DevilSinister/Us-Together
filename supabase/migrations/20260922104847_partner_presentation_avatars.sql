-- Partner presentation and avatars.
--
-- During onboarding one account chooses a name and a picture FOR its partner.
-- Both live entirely on the choosing account's side: the image is an object in
-- that account's own `avatars` folder, and the record is a row only that
-- account can read. The `avatars` bucket keeps its four own-folder-only
-- policies unchanged and this feature introduces no cross-account storage read
-- anywhere.
--
-- Why a separate table rather than three more columns on `profiles`:
-- `profiles_select_self_or_partner` makes every column of a profile row
-- readable by the partner, and row level security cannot hide one column from a
-- policy that grants the row. A nickname I chose for my partner must not be
-- readable by them, so it cannot live on `profiles`.
--
-- Rollback: drop table public.partner_presentations; drop the check constraint
-- and the avatar_style column from public.profiles. Partner pictures would
-- remain as orphaned objects inside each owner's own private folder, which is
-- harmless and deletable by that owner.

-- 1. The onboarding avatar colour finally has somewhere to live for the signed
--    in user. It was collected by the form and discarded for every real
--    account. NOT NULL with a constant default is metadata-only in PostgreSQL
--    11+, so this does not rewrite the live table.
alter table public.profiles
  add column if not exists avatar_style text not null default 'rose'
    check (avatar_style in ('rose', 'wine', 'blush', 'plum'));

comment on column public.profiles.avatar_style is
  'Fallback initials colour for this account''s own avatar. Presentation only; never an authorization source.';

-- 2. A structural guarantee that a recorded avatar path can only ever name an
--    object inside the owning account's own folder. The storage policies remain
--    the authorization boundary; this only stops the application recording a
--    path it could never legally read. NOT VALID first so the live table is not
--    scanned under an exclusive lock, then validated separately.
alter table public.profiles
  add constraint profiles_avatar_path_own_folder
    check (avatar_path is null or avatar_path like user_id::text || '/%') not valid;

alter table public.profiles validate constraint profiles_avatar_path_own_folder;

-- 3. How one account chooses to see its partner.
--
--    Deliberately no foreign key to a partner user id: the row must be able to
--    exist before the partner's account does, and binding it to a user would
--    make it a record *about them* and drag cross-account semantics back in.
create table if not exists public.partner_presentations (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_path text check (avatar_path is null or avatar_path like owner_id::text || '/%'),
  avatar_style text not null default 'rose'
    check (avatar_style in ('rose', 'wine', 'blush', 'plum')),
  confirmed_couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partner_presentations is
  'One row per account: the name and picture that account chose for its partner. Owned and stored entirely by that account, never readable by the partner, never an authorization source.';
comment on column public.partner_presentations.avatar_path is
  'Object in the owner''s own avatars folder. A guessed path is not authorization; the storage policies still decide.';
comment on column public.partner_presentations.confirmed_couple_id is
  'The couple this presentation was last confirmed against. A different active couple means the application asks the owner to review the name before reusing it, so pairing with someone new cannot silently greet them by a previous partner''s name.';

create index if not exists partner_presentations_confirmed_couple_idx
  on public.partner_presentations (confirmed_couple_id)
  where confirmed_couple_id is not null;

alter table public.partner_presentations enable row level security;
alter table public.partner_presentations force row level security;

revoke all on table public.partner_presentations from anon, authenticated;
grant select, insert, update, delete on table public.partner_presentations to authenticated;

create policy "partner_presentations_select_own"
on public.partner_presentations for select to authenticated
using (owner_id = (select auth.uid()));

create policy "partner_presentations_insert_own"
on public.partner_presentations for insert to authenticated
with check (owner_id = (select auth.uid()));

-- UPDATE carries both USING and WITH CHECK so a row cannot be handed to
-- another owner on the way out.
create policy "partner_presentations_update_own"
on public.partner_presentations for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Forgetting these details is a real user action, so it needs a policy.
create policy "partner_presentations_delete_own"
on public.partner_presentations for delete to authenticated
using (owner_id = (select auth.uid()));

create trigger partner_presentations_set_updated_at
before update on public.partner_presentations
for each row execute function private.set_updated_at();
