-- Foreign-key validation for a new couple-owned list requires REFERENCES, not broader table access.
grant references on table public.couples to authenticated;
