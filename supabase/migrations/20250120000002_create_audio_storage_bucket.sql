-- Create storage bucket for audio files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio-assets',
  'audio-assets',
  false, -- Private bucket for security
  104857600, -- 100MB file size limit
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac']
);

-- Note: RLS is already enabled on storage.objects by default in Supabase

-- Create policy for org members to view audio files
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

-- Create policy for org editors to upload audio files
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

-- Create policy for org editors to update audio files
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

-- Create policy for org owners to delete audio files
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
