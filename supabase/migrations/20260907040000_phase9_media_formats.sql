-- Accept the photo and video formats phones actually produce.
--
-- The original release deliberately allowed only JPEG/PNG/MP4/WebM. That
-- refused HEIC and MOV from iPhones, WebP and AVIF from the web, and GIF
-- everywhere, so the owner asked for the wider set. The Edge function still
-- decodes every image before it is published, and every accepted type is one
-- the pinned ImageMagick build can read.

do $$
declare target record;
begin
  for target in
    select rel.relname as table_name, con.conname as constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname in ('memory_media', 'milestone_media')
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%image/jpeg%'
  loop
    execute format('alter table public.%I drop constraint %I', target.table_name, target.constraint_name);
  end loop;
end $$;

alter table public.memory_media add constraint memory_media_mime_type_check
  check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/webm','video/quicktime'));

alter table public.milestone_media add constraint milestone_media_mime_type_check
  check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/webm','video/quicktime'));

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/webm','video/quicktime'],
    file_size_limit = 20971520
where id in ('memory-media', 'moment-media');
