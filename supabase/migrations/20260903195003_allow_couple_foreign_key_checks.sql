-- Keep RLS on couples for application roles. Do not force it on the table owner:
-- PostgreSQL foreign-key enforcement runs as the owner and must be able to verify
-- a couple-owned child row without evaluating a caller-scoped policy.
alter table public.couples no force row level security;

-- The prior temporary grant is unnecessary once constraint checks can run correctly.
revoke references on table public.couples from authenticated;
