-- Schema privado. Solo una Edge Function privilegiada accede a los datos.
create table if not exists public.shared_pads (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Mi bloc libre',
  body text not null default '',
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shared_pad_title_length check (char_length(title)<=120),
  constraint shared_pad_body_length check (char_length(body)<=30000)
);
create table if not exists public.shared_pad_files (
  id uuid primary key default gen_random_uuid(),
  pad_id uuid not null references public.shared_pads(id) on delete cascade,
  filename text not null,
  storage_path text not null unique,
  mime text not null,
  byte_size bigint not null check(byte_size>0 and byte_size<=10000000),
  created_at timestamptz not null default now()
);
create index if not exists shared_pad_files_room_idx on public.shared_pad_files(pad_id);
alter table public.shared_pads enable row level security;
alter table public.shared_pad_files enable row level security;
revoke all on public.shared_pads from anon, authenticated;
revoke all on public.shared_pad_files from anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('franklabs-pads','franklabs-pads',false,10000000) on conflict(id) do update set public=false,file_size_limit=10000000;
-- No políticas de acceso para anon/authenticated: solo service-role en la función.
