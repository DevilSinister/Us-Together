-- Note it polish: per-user read rows for received drawings, and a keyset index for /notes paging.
--
-- drawing_reads mirrors note_reads. A row exists only when the recipient has opened a
-- ready drawing; the author never writes one. Writes are insert-only (on conflict do
-- nothing), so no UPDATE grant is issued -- an upsert that needed UPDATE would fail with
-- 42501 exactly as note_reads did before this change (see ADR-033).
create table public.drawing_reads (
  drawing_id uuid not null references public.drawing_notes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (drawing_id, user_id)
);
create index drawing_reads_user_idx on public.drawing_reads(user_id);
comment on table public.drawing_reads is 'Recipient-only record that a ready drawing was opened. Insert-only; no content.';

alter table public.drawing_reads enable row level security;
alter table public.drawing_reads force row level security;
revoke all on public.drawing_reads from anon, authenticated;
grant select, insert, delete on public.drawing_reads to authenticated;

create policy drawing_reads_select_own on public.drawing_reads for select to authenticated
  using (user_id = (select auth.uid()));
create policy drawing_reads_insert_own on public.drawing_reads for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.drawing_notes n
    where n.id = drawing_reads.drawing_id and n.status = 'ready' and n.recipient_id = (select auth.uid())));
create policy drawing_reads_delete_own on public.drawing_reads for delete to authenticated
  using (user_id = (select auth.uid()));

-- R2-03: /notes pages by (updated_at desc, id desc); this index serves the keyset filter.
create index notes_couple_updated_idx on public.notes(couple_id, updated_at desc, id desc);

notify pgrst, 'reload schema';
