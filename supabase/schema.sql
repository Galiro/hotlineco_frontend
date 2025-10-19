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

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  pricing_plan_id uuid not null references public.membership_pricing(id),
  status text not null check (status in ('active', 'cancelled', 'expired', 'trial')) default 'trial',
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')) default 'monthly',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  trial_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id) -- One active subscription per org
);

create index organization_subscriptions_org_id_idx on public.organization_subscriptions(org_id);
create index organization_subscriptions_pricing_plan_id_idx on public.organization_subscriptions(pricing_plan_id);
create index organization_subscriptions_status_idx on public.organization_subscriptions(status);
create index organization_subscriptions_stripe_subscription_id_idx on public.organization_subscriptions(stripe_subscription_id);

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

create table public.membership_pricing (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price_monthly_cents integer not null,
  price_yearly_cents integer,
  max_hotlines integer not null default 1,
  max_phone_numbers integer not null default 1,
  max_audio_files_per_hotline integer not null default 10,
  max_audio_storage_mb integer not null default 100,
  max_minutes_monthly integer not null default 1000,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index membership_pricing_name_idx on public.membership_pricing(name);
create index membership_pricing_is_active_idx on public.membership_pricing(is_active);
create index membership_pricing_sort_order_idx on public.membership_pricing(sort_order);

create table public.hotline_audio_files (
  id uuid primary key default gen_random_uuid(),
  hotline_id uuid not null references public.hotlines(id) on delete cascade,
  audio_asset_id uuid not null references public.audio_assets(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(hotline_id, audio_asset_id)
);

create index hotline_audio_files_hotline_id_idx on public.hotline_audio_files(hotline_id);
create index hotline_audio_files_audio_asset_id_idx on public.hotline_audio_files(audio_asset_id);
create index hotline_audio_files_display_order_idx on public.hotline_audio_files(hotline_id, display_order);

-- Row Level Security policies
alter table public.orgs enable row level security;
alter table public.memberships enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.phone_numbers enable row level security;
alter table public.hotlines enable row level security;
alter table public.audio_assets enable row level security;
alter table public.call_logs enable row level security;
alter table public.membership_pricing enable row level security;
alter table public.hotline_audio_files enable row level security;

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

-- Hotline audio files policies
create policy "Org members can view hotline audio files" on public.hotline_audio_files
  for select
  using (
    exists (
      select 1
      from public.hotlines h
      where h.id = hotline_id
        and public.is_org_member(h.org_id)
    )
  );

create policy "Org editors can manage hotline audio files (insert)" on public.hotline_audio_files
  for insert
  with check (
    exists (
      select 1
      from public.hotlines h
      where h.id = hotline_id
        and public.is_org_editor(h.org_id)
    )
  );

create policy "Org editors can manage hotline audio files (update)" on public.hotline_audio_files
  for update
  using (
    exists (
      select 1
      from public.hotlines h
      where h.id = hotline_id
        and public.is_org_editor(h.org_id)
    )
  )
  with check (
    exists (
      select 1
      from public.hotlines h
      where h.id = hotline_id
        and public.is_org_editor(h.org_id)
    )
  );

create policy "Org owners can delete hotline audio files" on public.hotline_audio_files
  for delete
  using (
    exists (
      select 1
      from public.hotlines h
      where h.id = hotline_id
        and public.is_org_owner(h.org_id)
    )
  );

-- Membership pricing policies
create policy "Anyone can view active membership pricing" on public.membership_pricing
  for select
  using (is_active = true);

create policy "Service role can manage membership pricing" on public.membership_pricing
  for all
  using (auth.role() = 'service_role');

-- Organization subscription policies
create policy "Org members can view organization subscriptions" on public.organization_subscriptions
  for select
  using (public.is_org_member(org_id) or auth.role() = 'service_role');

create policy "Org owners can manage organization subscriptions" on public.organization_subscriptions
  for all
  using (public.is_org_owner(org_id) or auth.role() = 'service_role');

-- Add constraint to limit max 10 audio files per hotline
create or replace function public.check_hotline_audio_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.hotline_audio_files where hotline_id = new.hotline_id) >= 10 then
    raise exception 'Hotline cannot have more than 10 audio files';
  end if;
  return new;
end;
$$;

create trigger check_hotline_audio_limit_trigger
  before insert on public.hotline_audio_files
  for each row
  execute function public.check_hotline_audio_limit();

-- Add trigger to update updated_at timestamp for membership pricing
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_membership_pricing_updated_at
  before update on public.membership_pricing
  for each row
  execute function public.update_updated_at_column();

create trigger update_organization_subscriptions_updated_at
  before update on public.organization_subscriptions
  for each row
  execute function public.update_updated_at_column();


-- Storage bucket for audio files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-assets',
  'audio-assets',
  false, -- Private bucket for security
  104857600, -- 100MB file size limit
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac']
);

-- Note: RLS is already enabled on storage.objects by default in Supabase

-- Storage policies for audio files
create policy "Org members can view audio files" on storage.objects
  for select
  using (
    bucket_id = 'audio-assets' and
    exists (
      select 1
      from public.audio_assets aa
      join public.memberships m on m.org_id = aa.org_id
      where aa.storage_path = (bucket_id || '/' || name)
        and m.user_id = auth.uid()
    )
  );

create policy "Org editors can upload audio files" on storage.objects
  for insert
  with check (
    bucket_id = 'audio-assets' and
    auth.role() = 'authenticated' and
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  );

create policy "Org editors can update audio files" on storage.objects
  for update
  using (
    bucket_id = 'audio-assets' and
    exists (
      select 1
      from public.audio_assets aa
      join public.memberships m on m.org_id = aa.org_id
      where aa.storage_path = (bucket_id || '/' || name)
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  )
  with check (
    bucket_id = 'audio-assets' and
    exists (
      select 1
      from public.audio_assets aa
      join public.memberships m on m.org_id = aa.org_id
      where aa.storage_path = (bucket_id || '/' || name)
        and m.user_id = auth.uid()
        and m.role in ('owner', 'editor')
    )
  );

create policy "Org owners can delete audio files" on storage.objects
  for delete
  using (
    bucket_id = 'audio-assets' and
    exists (
      select 1
      from public.audio_assets aa
      join public.memberships m on m.org_id = aa.org_id
      where aa.storage_path = (bucket_id || '/' || name)
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );
