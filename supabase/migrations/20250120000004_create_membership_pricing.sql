-- Create membership pricing table
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

-- Add indexes for performance
create index membership_pricing_name_idx on public.membership_pricing(name);
create index membership_pricing_is_active_idx on public.membership_pricing(is_active);
create index membership_pricing_sort_order_idx on public.membership_pricing(sort_order);

-- Enable RLS
alter table public.membership_pricing enable row level security;

-- RLS policies for membership_pricing (public read access)
create policy "Anyone can view active membership pricing" on public.membership_pricing
  for select
  using (is_active = true);

create policy "Service role can manage membership pricing" on public.membership_pricing
  for all
  using (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
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

