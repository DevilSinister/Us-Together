-- Phase 7: user-owned wishlists with purchaser-only purchase secrets, and shared or
-- author-private notes.
--
-- The wishlist owner must never learn that a purchase secret exists for their item.
-- Every channel that could disclose one is closed deliberately:
--   * no view, projection or aggregate readable by the owner joins the two tables;
--   * the secret cascades when the item is deleted, so the owner never meets a
--     restrict error that would prove a row was there;
--   * no notification, preference or count is derived from a secret row;
--   * the purchaser cannot be the item owner, so nobody can plant a probe row.
--
-- Notes are couple-scoped. A private note is readable only by its author, and a
-- shared note by both active members. Notification titles never carry note content.

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 4000),
  product_url text check (product_url is null or (char_length(product_url) between 12 and 2048 and product_url ~ '^https://')),
  price_minor bigint check (price_minor is null or (price_minor >= 0 and price_minor <= 99999999999)),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  category text check (category is null or char_length(btrim(category)) between 1 and 80),
  priority text not null default 'want' check (priority in ('nice_to_have', 'want', 'really_want')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlist_price_needs_currency check ((price_minor is null) = (currency is null))
);

create table public.wishlist_purchase_secrets (
  id uuid primary key default gen_random_uuid(),
  wishlist_item_id uuid not null references public.wishlist_items (id) on delete cascade,
  purchaser_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'planned' check (status in ('planned', 'purchased', 'given', 'cancelled')),
  notes text check (notes is null or char_length(notes) <= 2000),
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlist_secret_one_per_purchaser unique (wishlist_item_id, purchaser_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipient_id uuid references auth.users (id) on delete set null,
  type text not null default 'shared' check (type in ('shared', 'private')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_recipient_is_not_author check (recipient_id is null or recipient_id <> author_id)
);

create table public.note_reads (
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

-- A purchase secret belongs to the partner of the item owner, never the owner.
create function private.can_hold_purchase_secret(target_item uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.wishlist_items item
    join public.couple_memberships membership
      on membership.couple_id = item.couple_id
     and membership.user_id = (select auth.uid())
     and membership.left_at is null
    where item.id = target_item
      and item.owner_id <> (select auth.uid())
  );
$$;
revoke all on function private.can_hold_purchase_secret(uuid) from public, anon;
grant execute on function private.can_hold_purchase_secret(uuid) to authenticated;

-- A note may only name an active member of its own couple as recipient.
create function private.can_receive_note(target_couple uuid, target_recipient uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target_recipient is null or exists (
    select 1 from public.couple_memberships membership
    where membership.couple_id = target_couple
      and membership.user_id = target_recipient
      and membership.left_at is null
  );
$$;
revoke all on function private.can_receive_note(uuid, uuid) from public, anon;
grant execute on function private.can_receive_note(uuid, uuid) to authenticated;

-- Tenancy and ownership are assigned once and never reassigned by an update.
create function private.guard_wishlist_item()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.couple_id <> old.couple_id or new.owner_id <> old.owner_id then
    raise exception using errcode = '42501', message = 'A wishlist item cannot change owner or space.';
  end if;
  return new;
end $$;
revoke all on function private.guard_wishlist_item() from public, anon, authenticated;
create trigger wishlist_items_guard before update on public.wishlist_items for each row execute function private.guard_wishlist_item();

create function private.guard_note()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.couple_id <> old.couple_id or new.author_id <> old.author_id then
    raise exception using errcode = '42501', message = 'A note cannot change author or space.';
  end if;
  return new;
end $$;
revoke all on function private.guard_note() from public, anon, authenticated;
create trigger notes_guard before update on public.notes for each row execute function private.guard_note();

-- The purchase instant is derived from status by the database, never supplied.
create function private.guard_purchase_secret()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.wishlist_item_id <> old.wishlist_item_id or new.purchaser_id <> old.purchaser_id) then
    raise exception using errcode = '42501', message = 'A purchase record cannot change item or purchaser.';
  end if;
  if new.status in ('purchased', 'given') then
    if tg_op = 'UPDATE' and old.status in ('purchased', 'given') then
      new.purchased_at := old.purchased_at;
    else
      new.purchased_at := now();
    end if;
  else
    new.purchased_at := null;
  end if;
  return new;
end $$;
revoke all on function private.guard_purchase_secret() from public, anon, authenticated;
create trigger wishlist_secrets_guard before insert or update on public.wishlist_purchase_secrets for each row execute function private.guard_purchase_secret();

create trigger wishlist_items_set_updated_at before update on public.wishlist_items for each row execute function private.set_updated_at();
create trigger wishlist_secrets_set_updated_at before update on public.wishlist_purchase_secrets for each row execute function private.set_updated_at();
create trigger notes_set_updated_at before update on public.notes for each row execute function private.set_updated_at();

-- Only a shared note reaches the partner's inbox, and only as a generic line.
-- Turning a shared note private withdraws the notification it already produced.
create function private.notify_note_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.type = 'shared' and new.type = 'private' then
    delete from public.notifications
    where target_type = 'note' and target_id = new.id and recipient_id <> new.author_id;
    return new;
  end if;
  if new.type = 'shared' and (tg_op = 'INSERT' or old.type <> 'shared') then
    insert into public.notifications (recipient_id, couple_id, category, title, target_type, target_id, idempotency_key)
    select membership.user_id, new.couple_id, 'note', 'A shared note was added', 'note', new.id,
      'note:' || new.id::text || ':' || membership.user_id::text
    from public.couple_memberships membership
    left join public.notification_preferences preference on preference.user_id = membership.user_id
    where membership.couple_id = new.couple_id
      and membership.left_at is null
      and membership.user_id <> new.author_id
      and coalesce(preference.in_app_enabled, true)
      and coalesce(preference.notes_enabled, true)
    on conflict (idempotency_key) do nothing;
  end if;
  return new;
end $$;
revoke all on function private.notify_note_visibility() from public, anon, authenticated;
create trigger notes_notify after insert or update of type on public.notes for each row execute function private.notify_note_visibility();

create index wishlist_items_couple_page_idx on public.wishlist_items (couple_id, id desc);
create index wishlist_items_owner_idx on public.wishlist_items (couple_id, owner_id, id desc);
create index wishlist_items_priority_idx on public.wishlist_items (couple_id, priority, id desc);
create index wishlist_secrets_purchaser_idx on public.wishlist_purchase_secrets (purchaser_id, id desc);
create index notes_couple_page_idx on public.notes (couple_id, type, id desc);
create index notes_author_idx on public.notes (couple_id, author_id, id desc);

alter table public.wishlist_items enable row level security;
alter table public.wishlist_items force row level security;
alter table public.wishlist_purchase_secrets enable row level security;
alter table public.wishlist_purchase_secrets force row level security;
alter table public.notes enable row level security;
alter table public.notes force row level security;
alter table public.note_reads enable row level security;
alter table public.note_reads force row level security;

revoke all on table public.wishlist_items, public.wishlist_purchase_secrets, public.notes, public.note_reads from anon, authenticated;
grant select, insert, update, delete on table public.wishlist_items, public.wishlist_purchase_secrets, public.notes to authenticated;
grant select, insert, delete on table public.note_reads to authenticated;

-- Both members read a wishlist item; only its owner changes it.
create policy "wishlist_items_select_member" on public.wishlist_items for select to authenticated using (private.is_active_couple_member(couple_id));
create policy "wishlist_items_insert_owner" on public.wishlist_items for insert to authenticated with check (private.is_active_couple_member(couple_id) and owner_id = (select auth.uid()));
create policy "wishlist_items_update_owner" on public.wishlist_items for update to authenticated using (private.is_active_couple_member(couple_id) and owner_id = (select auth.uid())) with check (private.is_active_couple_member(couple_id) and owner_id = (select auth.uid()));
create policy "wishlist_items_delete_owner" on public.wishlist_items for delete to authenticated using (private.is_active_couple_member(couple_id) and owner_id = (select auth.uid()));

-- Only the purchaser sees or touches a purchase secret. There is no owner path at all.
create policy "wishlist_secrets_select_purchaser" on public.wishlist_purchase_secrets for select to authenticated using (purchaser_id = (select auth.uid()));
create policy "wishlist_secrets_insert_purchaser" on public.wishlist_purchase_secrets for insert to authenticated with check (purchaser_id = (select auth.uid()) and private.can_hold_purchase_secret(wishlist_item_id));
create policy "wishlist_secrets_update_purchaser" on public.wishlist_purchase_secrets for update to authenticated using (purchaser_id = (select auth.uid())) with check (purchaser_id = (select auth.uid()) and private.can_hold_purchase_secret(wishlist_item_id));
create policy "wishlist_secrets_delete_purchaser" on public.wishlist_purchase_secrets for delete to authenticated using (purchaser_id = (select auth.uid()));

-- A private note is the author's alone; a shared note belongs to both members.
create policy "notes_select_visible" on public.notes for select to authenticated using (private.is_active_couple_member(couple_id) and (type = 'shared' or author_id = (select auth.uid())));
create policy "notes_insert_author" on public.notes for insert to authenticated with check (private.is_active_couple_member(couple_id) and author_id = (select auth.uid()) and private.can_receive_note(couple_id, recipient_id));
create policy "notes_update_author" on public.notes for update to authenticated using (private.is_active_couple_member(couple_id) and author_id = (select auth.uid())) with check (private.is_active_couple_member(couple_id) and author_id = (select auth.uid()) and private.can_receive_note(couple_id, recipient_id));
create policy "notes_delete_author" on public.notes for delete to authenticated using (private.is_active_couple_member(couple_id) and author_id = (select auth.uid()));

-- A read row may only be created for a note the caller can already select.
create policy "note_reads_select_own" on public.note_reads for select to authenticated using (user_id = (select auth.uid()));
create policy "note_reads_insert_own" on public.note_reads for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.notes note where note.id = note_id));
create policy "note_reads_delete_own" on public.note_reads for delete to authenticated using (user_id = (select auth.uid()));

comment on table public.wishlist_items is 'User-owned wishlist item, readable by both active members of its couple and mutable only by its owner.';
comment on table public.wishlist_purchase_secrets is 'Purchaser-only gift state. Never joined into an owner-readable projection, count or notification.';
comment on table public.notes is 'Couple-scoped note. Type shared is readable by both active members; type private only by its author.';
comment on table public.note_reads is 'Per-user read state for a note the user is already eligible to read.';
