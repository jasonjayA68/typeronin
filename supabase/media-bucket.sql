-- The media bucket.
--
-- Run this once per project, in the Supabase dashboard's SQL editor (or via the
-- CLI). It is idempotent — running it again re-asserts the settings rather than
-- failing.
--
-- Why this is not a Prisma migration: `storage` is Supabase's schema, not ours.
-- prisma/schema.prisma makes the same call about `auth` and says why — Prisma does
-- not own those tables, and a migration that reaches into them makes every future
-- `prisma migrate` depend on Supabase's internals staying put. The bucket is
-- infrastructure, so it is provisioned like infrastructure.
--
--
-- ON THE ABSENCE OF POLICIES
--
-- There are none, and that is the design rather than an omission.
--
-- `storage.objects` has RLS enabled by default and no policy means deny, so the
-- anon and authenticated roles cannot write here at all — not from the browser,
-- not with a stolen session. Every write in this app goes through the service
-- role in src/lib/supabase/admin.ts, which bypasses RLS and is only reachable
-- from a Server Action that has already called requirePermission("media:write").
--
-- Authorization for uploading is a row in *our* Role/Permission tables. A storage
-- policy cannot read those without a security-definer function, which would be a
-- second place where "who may upload" is decided — and two answers to that
-- question is how a panel ends up letting someone do what its sidebar says they
-- cannot. One answer, in one place, in code.
--
-- Reads are public: `public = true` means the object endpoint serves these
-- without consulting RLS, which is what makes the URL cacheable and what lets
-- next/image fetch it. A draft's image is readable by anyone holding its URL.
-- That was the deliberate trade — see src/features/media/url.ts.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  -- 50MB, matching the largest per-type ceiling in src/features/media/accepted.ts.
  -- That module holds the real per-type limits; this is the backstop for a bug in
  -- it, enforced by storage itself rather than by us asking nicely.
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Note what is NOT in that list: image/svg+xml. An SVG can carry script, and this
-- bucket is served from the Supabase origin — the same origin that holds a signed-in
-- user's session. Storage refusing the content type is the backstop for the
-- allowlist in accepted.ts.
