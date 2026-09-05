-- Best-effort narrowing of pg_net's default grants.
--
-- Applied 2026-09-05. On hosted Supabase this is a NO-OP and is retained for
-- honesty and for self-hosted replays, not because it changed anything here.
--
-- pg_net installs with `EXECUTE` granted to PUBLIC, so net.http_post is callable by
-- anon and authenticated: a server-side HTTP client reachable by any session that
-- can execute SQL as those roles. On hosted Supabase, `net` and its functions are
-- owned by supabase_admin, and PostgreSQL silently ignores a REVOKE issued by a role
-- that did not grant the privilege — so a project migration cannot remove it. The
-- observed ACL after this migration is still `=X/supabase_admin`.
--
-- Why this is nonetheless not an open door today: PostgREST exposes only the
-- `public` and `graphql_public` schemas, so `net` has no REST or RPC surface, and
-- application clients never hold a direct Postgres connection. The exposure would
-- become reachable only if `net` were added to the exposed schemas, or if a
-- SECURITY DEFINER function in `public` built dynamic SQL from user input.
--
-- Tracked as a Release 2 review item. Removing the PUBLIC grant requires
-- supabase_admin and therefore Supabase support, not a migration.
revoke all on schema net from anon, authenticated;
revoke all on all functions in schema net from public, anon, authenticated;
revoke all on all tables in schema net from anon, authenticated;
