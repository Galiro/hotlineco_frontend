-- Create organizations for existing users who don't have one
-- This handles users who signed up before the auto-org creation trigger was added

do $$
declare
    user_record record;
    new_org_id uuid;
begin
    -- Loop through all users who don't have an organization
    for user_record in 
        select 
            u.id,
            u.email,
            coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as display_name
        from auth.users u
        where not exists (
            select 1 
            from public.orgs o 
            where o.owner_id = u.id
        )
    loop
        -- Create organization for this user
        insert into public.orgs (name, owner_id)
        values (
            user_record.display_name || '''s Organization',
            user_record.id
        )
        returning id into new_org_id;
        
        -- Add user as owner of the organization
        insert into public.memberships (org_id, user_id, role)
        values (new_org_id, user_record.id, 'owner');
        
        -- Log the creation (optional)
        raise notice 'Created organization for user: % (%)', user_record.email, new_org_id;
    end loop;
end $$;
