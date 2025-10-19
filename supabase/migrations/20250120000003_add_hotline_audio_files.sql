-- Create junction table for hotline audio files (many-to-many relationship)
create table public.hotline_audio_files (
  id uuid primary key default gen_random_uuid(),
  hotline_id uuid not null references public.hotlines(id) on delete cascade,
  audio_asset_id uuid not null references public.audio_assets(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(hotline_id, audio_asset_id)
);

-- Add indexes for performance
create index hotline_audio_files_hotline_id_idx on public.hotline_audio_files(hotline_id);
create index hotline_audio_files_audio_asset_id_idx on public.hotline_audio_files(audio_asset_id);
create index hotline_audio_files_display_order_idx on public.hotline_audio_files(hotline_id, display_order);

-- Enable RLS
alter table public.hotline_audio_files enable row level security;

-- RLS policies for hotline_audio_files
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
