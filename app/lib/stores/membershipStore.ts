import { create } from 'zustand';
import { supabase } from '../supabase';
import type { PricingPlan, OrganizationSubscription } from '../hooks/useMembership';

interface MembershipState {
  pricingPlans: PricingPlan[];
  currentSubscription: OrganizationSubscription | null;
  loading: boolean;
  error: string | null;
  isSelecting: boolean;
  
  // Actions
  loadPricingPlans: () => Promise<void>;
  loadCurrentSubscription: (orgId: string) => Promise<void>;
  selectMembership: (orgId: string, pricingPlanId: string) => Promise<void>;
  clearError: () => void;
  hasActiveSubscription: () => boolean;
}

export const useMembershipStore = create<MembershipState>((set, get) => ({
  pricingPlans: [],
  currentSubscription: null,
  loading: false,
  error: null,
  isSelecting: false,

  loadPricingPlans: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('membership_pricing')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      set({ pricingPlans: data || [], loading: false });
    } catch (err) {
      console.error('Error loading pricing plans:', err);
      set({ 
        error: 'Failed to load pricing plans', 
        loading: false 
      });
    }
  },

  loadCurrentSubscription: async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .select('*')
        .eq('org_id', orgId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      set({ currentSubscription: data });
    } catch (err) {
      console.error('Error loading subscription:', err);
      set({ error: 'Failed to load subscription' });
    }
  },

  selectMembership: async (orgId: string, pricingPlanId: string) => {
    set({ isSelecting: true, error: null });

    try {
      // For now, we'll create a trial subscription
      // In the future, this will integrate with Stripe
      const { data, error } = await supabase
        .from('organization_subscriptions')
        .insert({
          org_id: orgId,
          pricing_plan_id: pricingPlanId,
          status: 'trial',
          billing_cycle: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      set({ 
        currentSubscription: data, 
        isSelecting: false 
      });
    } catch (err) {
      console.error('Error selecting membership:', err);
      set({ 
        error: 'Failed to select membership plan', 
        isSelecting: false 
      });
    }
  },

  clearError: () => set({ error: null }),

  hasActiveSubscription: () => {
    const { currentSubscription } = get();
    return currentSubscription && 
           ['active', 'trial'].includes(currentSubscription.status) &&
           new Date(currentSubscription.current_period_end) > new Date();
  }
}));
