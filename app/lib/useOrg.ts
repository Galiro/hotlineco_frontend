import { useState, useEffect } from "react";
import { supabase } from "./supabase";

interface Organization {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  created_at: string;
}

interface Membership {
  org_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export function useOrg() {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserOrganizations();
  }, []);

  const loadUserOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      setMemberships(membershipData || []);

      if (membershipData && membershipData.length > 0) {
        // Get organization details
        const orgIds = membershipData.map(m => m.org_id);
        const { data: orgData, error: orgError } = await supabase
          .from('orgs')
          .select('*')
          .in('id', orgIds);

        if (orgError) throw orgError;

        setUserOrgs(orgData || []);
        
        // Set current org to the first one (or the one they own)
        const ownedOrg = orgData?.find(org => org.owner_id === user.id);
        setCurrentOrg(ownedOrg || orgData?.[0] || null);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOrg = (orgId: string) => {
    const org = userOrgs.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
    }
  };

  const createOrg = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: orgData, error: orgError } = await supabase
        .from('orgs')
        .insert({
          name,
          owner_id: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          org_id: orgData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (membershipError) throw membershipError;

      // Refresh organizations
      await loadUserOrganizations();
      
      return orgData;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  };

  const getUserRole = (orgId?: string) => {
    const targetOrgId = orgId || currentOrg?.id;
    if (!targetOrgId) return null;
    
    const membership = memberships.find(m => m.org_id === targetOrgId);
    return membership?.role || null;
  };

  const isOwner = (orgId?: string) => getUserRole(orgId) === 'owner';
  const isEditor = (orgId?: string) => {
    const role = getUserRole(orgId);
    return role === 'owner' || role === 'editor';
  };
  const isViewer = (orgId?: string) => {
    const role = getUserRole(orgId);
    return role === 'owner' || role === 'editor' || role === 'viewer';
  };

  return {
    currentOrg,
    userOrgs,
    memberships,
    loading,
    switchOrg,
    createOrg,
    getUserRole,
    isOwner,
    isEditor,
    isViewer,
    refresh: loadUserOrganizations
  };
}
