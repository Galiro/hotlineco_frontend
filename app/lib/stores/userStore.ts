import { create } from 'zustand';
import { supabase } from '../supabase';
import type { PricingPlan, OrganizationSubscription } from '../hooks/useMembership';

interface User {
  id: string;
  email: string;
}

interface Org {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  owner_id: string;
}

interface UserState {
  // User data
  user: User | null;
  currentOrg: Org | null;
  
  // Subscription data
  currentSubscription: OrganizationSubscription | null;
  currentMembership: PricingPlan | null;
  hasActiveSubscription: boolean;
  
  // Loading states
  loading: boolean;
  subscriptionLoading: boolean;
  initialLoadComplete: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setCurrentOrg: (org: Org | null) => void;
  loadSubscription: (orgId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  user: null,
  currentOrg: null,
  currentSubscription: null,
  currentMembership: null,
  hasActiveSubscription: false,
  loading: false,
  subscriptionLoading: false,
  initialLoadComplete: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),

  setCurrentOrg: (org) => set({ currentOrg: org }),

  loadSubscription: async (orgId: string) => {
    console.log('Loading subscription for org:', orgId);
    set({ subscriptionLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          membership_pricing!inner(
            id,
            name,
            description,
            price_monthly_cents,
            price_yearly_cents,
            max_hotlines,
            max_phone_numbers,
            max_audio_files_per_hotline,
            max_audio_storage_mb,
            max_minutes_monthly,
            features
          )
        `)
        .eq('org_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        // No subscription found - this is not an error, just no subscription
        console.log('No subscription found for org:', orgId);
        
        // Batch update - single state change
        set({ 
          currentSubscription: null,
          currentMembership: null,
          hasActiveSubscription: false,
          subscriptionLoading: false,
          initialLoadComplete: true
        });
        return;
      }

      // Check if subscription is active and not expired
      let hasActiveSubscription = false;
      let membershipDetails: PricingPlan | null = null;
      
      if (data) {
        const isActiveStatus = ['active', 'trial'].includes(data.status);
        const isNotExpired = new Date(data.current_period_end) > new Date();
        hasActiveSubscription = isActiveStatus && isNotExpired;
        
        // Extract membership details from the joined data
        if (data.membership_pricing) {
          membershipDetails = {
            id: data.membership_pricing.id,
            name: data.membership_pricing.name,
            description: data.membership_pricing.description,
            price_monthly_cents: data.membership_pricing.price_monthly_cents,
            price_yearly_cents: data.membership_pricing.price_yearly_cents,
            max_hotlines: data.membership_pricing.max_hotlines,
            max_phone_numbers: data.membership_pricing.max_phone_numbers,
            max_audio_files_per_hotline: data.membership_pricing.max_audio_files_per_hotline,
            max_audio_storage_mb: data.membership_pricing.max_audio_storage_mb,
            max_minutes_monthly: data.membership_pricing.max_minutes_monthly,
            features: data.membership_pricing.features,
            sort_order: data.membership_pricing.sort_order || 0
          };
        }
      }

      console.log('Subscription loaded:', { 
        hasActiveSubscription, 
        status: data?.status, 
        current_period_end: data?.current_period_end,
        membershipName: membershipDetails?.name
      });

      // Batch update - single state change for all fields
      set({ 
        currentSubscription: data,
        currentMembership: membershipDetails,
        hasActiveSubscription,
        subscriptionLoading: false,
        initialLoadComplete: true
      });
    } catch (err) {
      console.error('Error loading subscription:', err);
      
      // Batch update - single state change
      set({ 
        error: 'Failed to load subscription',
        subscriptionLoading: false,
        hasActiveSubscription: false,
        currentMembership: null,
        initialLoadComplete: true
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    user: null,
    currentOrg: null,
    currentSubscription: null,
    currentMembership: null,
    hasActiveSubscription: false,
    loading: false,
    subscriptionLoading: false,
    initialLoadComplete: false,
    error: null,
  }),
}));
