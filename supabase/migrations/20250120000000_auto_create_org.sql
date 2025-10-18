-- Function to automatically create an organization when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create a new organization for the user
  insert into public.orgs (name, owner_id)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1) || '''s Organization'),
    new.id
  );
  
  -- Get the org_id of the newly created organization
  insert into public.memberships (org_id, user_id, role)
  select 
    o.id,
    new.id,
    'owner'
  from public.orgs o
  where o.owner_id = new.id
  order by o.created_at desc
  limit 1;
  
  return new;
end;
$$;

-- Trigger to automatically create org on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
