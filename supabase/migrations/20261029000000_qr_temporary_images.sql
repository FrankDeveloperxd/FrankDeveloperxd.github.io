-- Execute in Supabase SQL Editor once.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-temp-images', 'qr-temp-images', false, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'];

create table if not exists public.qr_temp_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  object_path text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists qr_temp_images_expiration_idx on public.qr_temp_images(expires_at);
create index if not exists qr_temp_images_owner_idx on public.qr_temp_images(owner_id, created_at);
alter table public.qr_temp_images enable row level security;
revoke all on public.qr_temp_images from anon, authenticated;
-- No public read/write policies: only the server function uses the service role.
