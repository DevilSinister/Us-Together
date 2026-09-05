-- pg_net backs the push dispatcher's outbound call to the Edge Function.
--
-- Enabled in its own migration so the extension exists before dispatch_due_push is
-- created, and so its schema placement can be checked independently. The extension
-- registers in public but creates its own `net` schema, which is where http_post
-- actually lives — the dispatcher calls net.http_post.
create extension if not exists pg_net;
