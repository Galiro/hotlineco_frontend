-- Create organization subscriptions table
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

-- Add indexes for performance
create index organization_subscriptions_org_id_idx on public.organization_subscriptions(org_id);
create index organization_subscriptions_pricing_plan_id_idx on public.organization_subscriptions(pricing_plan_id);
create index organization_subscriptions_status_idx on public.organization_subscriptions(status);
create index organization_subscriptions_stripe_subscription_id_idx on public.organization_subscriptions(stripe_subscription_id);

-- Enable RLS
alter table public.organization_subscriptions enable row level security;

-- RLS policies for organization_subscriptions
create policy "Org members can view organization subscriptions" on public.organization_subscriptions
  for select
  using (public.is_org_member(org_id) or auth.role() = 'service_role');

create policy "Org owners can manage organization subscriptions" on public.organization_subscriptions
  for all
  using (public.is_org_owner(org_id) or auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
create trigger update_organization_subscriptions_updated_at
  before update on public.organization_subscriptions
  for each row
  execute function public.update_updated_at_column();
