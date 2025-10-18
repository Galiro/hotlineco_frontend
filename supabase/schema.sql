-- Extensions
create extension if not exists "pgcrypto";

-- Helper functions for row level security checks
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
end;
$$;

create or replace function public.is_org_editor(p_org_id uuid)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  );
end;
$$;

create or replace function public.is_org_owner(p_org_id uuid)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
end;
$$;

-- Core tables
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create index orgs_owner_id_idx on public.orgs(owner_id);

create table public.memberships (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);

create table public.phone_numbers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  twilio_sid text unique,
  e164 text unique,
  region text,
  status text not null default 'active' check (status in ('active', 'inactive', 'released')),
  created_at timestamptz not null default now()
);

create index phone_numbers_org_id_idx on public.phone_numbers(org_id);
create index phone_numbers_e164_idx on public.phone_numbers(e164);

create table public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text,
  storage_path text not null,
  duration_ms integer,
  source text not null check (source in ('upload', 'tts')),
  hash text,
  created_at timestamptz not null default now()
);

create index audio_assets_org_id_idx on public.audio_assets(org_id);
create index audio_assets_hash_idx on public.audio_assets(hash);

create table public.hotlines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  phone_number_id uuid references public.phone_numbers(id) on delete set null,
  slug text unique,
  name text not null,
  mode text not null check (mode in ('audio', 'tts', 'simple_ivr')),
  tts_text text,
  audio_asset_id uuid references public.audio_assets(id),
  ivr_json jsonb,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now()
);

create index hotlines_org_id_idx on public.hotlines(org_id);
create index hotlines_phone_number_id_idx on public.hotlines(phone_number_id);
create index hotlines_slug_idx on public.hotlines(slug);
create index hotlines_mode_idx on public.hotlines(mode);

create table public.call_logs (
  id bigserial primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  hotline_id uuid references public.hotlines(id) on delete set null,
  call_sid text,
  from_number text,
  to_number text,
  status text,
  duration_s integer,
  started_at timestamptz,
  ended_at timestamptz,
  ivr_path jsonb,
  recording_url text,
  created_at timestamptz not null default now()
);

create index call_logs_org_id_idx on public.call_logs(org_id);
create index call_logs_hotline_id_idx on public.call_logs(hotline_id);
create index call_logs_started_at_idx on public.call_logs(started_at);
create index call_logs_call_sid_idx on public.call_logs(call_sid);

-- Row Level Security policies
alter table public.orgs enable row level security;
alter table public.memberships enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.hotlines enable row level security;
alter table public.audio_assets enable row level security;
alter table public.call_logs enable row level security;

-- Orgs policies
create policy "Org members can view orgs" on public.orgs
  for select
  using (public.is_org_member(id) or auth.role() = 'service_role');

create policy "Org owners can insert orgs" on public.orgs
  for insert
  with check ((auth.uid() = owner_id) or auth.role() = 'service_role');

create policy "Org owners can update orgs" on public.orgs
  for update
  using ((auth.uid() = owner_id) or auth.role() = 'service_role')
  with check ((auth.uid() = owner_id) or auth.role() = 'service_role');

create policy "Org owners can delete orgs" on public.orgs
  for delete
  using ((auth.uid() = owner_id) or auth.role() = 'service_role');

-- Membership policies
create policy "Members can view memberships" on public.memberships
  for select
  using (
    user_id = auth.uid()
    or public.is_org_owner(org_id)
    or auth.role() = 'service_role'
  );

create policy "Owners manage memberships (insert)" on public.memberships
  for insert
  with check (public.is_org_owner(org_id) or auth.role() = 'service_role');

create policy "Owners manage memberships (update)" on public.memberships
  for update
  using (public.is_org_owner(org_id) or auth.role() = 'service_role')
  with check (public.is_org_owner(org_id) or auth.role() = 'service_role');

create policy "Owners manage memberships (delete)" on public.memberships
  for delete
  using (public.is_org_owner(org_id) or auth.role() = 'service_role');

-- Phone number policies
create policy "Org members can view phone numbers" on public.phone_numbers
  for select
  using (public.is_org_member(org_id) or auth.role() = 'service_role');

create policy "Org editors manage phone numbers (insert)" on public.phone_numbers
  for insert
  with check (public.is_org_editor(org_id) or auth.role() = 'service_role');

create policy "Org editors manage phone numbers (update)" on public.phone_numbers
  for update
  using (public.is_org_editor(org_id) or auth.role() = 'service_role')
  with check (public.is_org_editor(org_id) or auth.role() = 'service_role');

create policy "Org owners can delete phone numbers" on public.phone_numbers
  for delete
  using (public.is_org_owner(org_id) or auth.role() = 'service_role');

-- Hotline policies
create policy "Org members can view hotlines" on public.hotlines
  for select
  using (public.is_org_member(org_id) or auth.role() = 'service_role');

create policy "Org editors manage hotlines (insert)" on public.hotlines
  for insert
  with check (public.is_org_editor(org_id) or auth.role() = 'service_role');

create policy "Org editors manage hotlines (update)" on public.hotlines
  for update
  using (public.is_org_editor(org_id) or auth.role() = 'service_role')
  with check (public.is_org_editor(org_id) or auth.role() = 'service_role');

create policy "Org owners can delete hotlines" on public.hotlines
  for delete
  using (public.is_org_owner(org_id) or auth.role() = 'service_role');

-- Audio asset policies
create policy "Org members can view audio assets" on public.audio_assets
  for select
  using (public.is_org_member(org_id) or auth.role() = 'service_role');

create policy "Org editors manage audio assets (insert)" on public.audio_assets
  for insert
  with check (public.is_org_editor(org_id) or auth.role() = 'service_role');

create policy "Org editors manage audio assets (update)" on public.audio_assets
  for update
  using (public.is_org_editor(org_id) or auth.role() = 'service_role')
  with check (public.is_org_editor(org_id) or auth.role() = 'service_role');

create policy "Org owners can delete audio assets" on public.audio_assets
  for delete
  using (public.is_org_owner(org_id) or auth.role() = 'service_role');

-- Call log policies
create policy "Org members can view call logs" on public.call_logs
  for select
  using (public.is_org_member(org_id) or auth.role() = 'service_role');

create policy "Service role manages call logs (insert)" on public.call_logs
  for insert
  with check (auth.role() = 'service_role');

create policy "Service role manages call logs (update)" on public.call_logs
  for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role manages call logs (delete)" on public.call_logs
  for delete
  using (auth.role() = 'service_role');
