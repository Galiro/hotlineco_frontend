import { useCallback, useEffect } from 'react';
import { supabase } from '../supabase';
import { useUserStore } from '../stores/userStore';

export const useAuth = () => {
  const user = useUserStore((state) => state.user);
  const currentOrg = useUserStore((state) => state.currentOrg);
  const hasActiveSubscription = useUserStore((state) => state.hasActiveSubscription);
  const currentMembership = useUserStore((state) => state.currentMembership);
  const loading = useUserStore((state) => state.loading);
  const subscriptionLoading = useUserStore((state) => state.subscriptionLoading);
  const initialLoadComplete = useUserStore((state) => state.initialLoadComplete);
  const error = useUserStore((state) => state.error);
  const clearError = useUserStore((state) => state.clearError);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    useUserStore.getState().reset();
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        useUserStore.getState().setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
      } else {
        useUserStore.getState().reset();
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          useUserStore.getState().setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
        } else {
          useUserStore.getState().reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Empty deps - only run once on mount

  // Load organization when user changes
  useEffect(() => {
    const loadUserOrg = async () => {
      if (!user) {
        useUserStore.getState().setCurrentOrg(null);
        return;
      }

      console.log('Loading organization for user:', user.id);

      try {
        // Get user's organization
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            org_id,
            orgs(
              id,
              name,
              plan,
              created_at,
              owner_id
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (membershipError || !membership || !membership.orgs) {
          console.error('Error loading user organization:', membershipError);
          useUserStore.getState().setCurrentOrg(null);
          return;
        }

        // orgs is a single object, not an array
        const org = membership.orgs as any;
        console.log('Organization loaded:', org.name);
        useUserStore.getState().setCurrentOrg(org);
        
        // Load subscription for this organization
        await useUserStore.getState().loadSubscription(org.id);
      } catch (err) {
        console.error('Error loading user organization:', err);
        useUserStore.getState().setCurrentOrg(null);
      }
    };

    loadUserOrg();
  }, [user?.id]); // Only depend on user ID, not the entire user object

  return {
    user,
    currentOrg,
    hasActiveSubscription,
    currentMembership,
    loading: loading || subscriptionLoading,
    initialLoadComplete,
    error,
    clearError,
    signOut,
  };
};
