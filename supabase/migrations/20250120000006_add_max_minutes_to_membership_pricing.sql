-- Add max_minutes_monthly column to existing membership_pricing table
alter table public.membership_pricing 
add column max_minutes_monthly integer not null default 1000;

-- Add comment to document the column
comment on column public.membership_pricing.max_minutes_monthly is 'Maximum number of call minutes allowed per month for this pricing plan';
