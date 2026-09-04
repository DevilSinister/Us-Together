-- The owner, author, recipient and reader columns are cascade targets from
-- auth.users. Without a leading index on each, deleting an account scans these
-- tables. The composite couple-first indexes cannot serve that lookup.
create index note_reads_user_idx on public.note_reads (user_id);
create index notes_author_only_idx on public.notes (author_id);
create index notes_recipient_idx on public.notes (recipient_id) where recipient_id is not null;
create index wishlist_items_owner_only_idx on public.wishlist_items (owner_id);
