import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useUserStore } from '../stores/userStore';

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  max_hotlines: number;
  max_phone_numbers: number;
  max_audio_files_per_hotline: number;
  max_audio_storage_mb: number;
  max_minutes_monthly: number;
  features: string[];
  sort_order: number;
}

export interface OrganizationSubscription {
  id: string;
  org_id: string;
  pricing_plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useMembership = () => {
  const { currentOrg, hasActiveSubscription, loadSubscription } = useUserStore();
  const navigate = useNavigate();
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Load pricing plans
  const loadPricingPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('membership_pricing')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      setPricingPlans(data || []);
    } catch (err) {
      console.error('Error loading pricing plans:', err);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };


  // Select a membership plan
  const selectMembership = async (pricingPlanId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    if (!currentOrg) {
      setError('No organization found');
      return;
    }

    setIsSelecting(true);
    setError(null);

    try {
      // Call the Stripe checkout function
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          pricing_plan_id: pricingPlanId,
          billing_cycle: billingCycle,
        },
      });

      if (error) throw error;

      if (data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Error creating Stripe checkout session:', err);
      setError('Failed to start checkout process');
    } finally {
      setIsSelecting(false);
    }
  };

  // Load pricing plans on mount
  useEffect(() => {
    loadPricingPlans();
  }, []);

  return {
    pricingPlans,
    loading,
    error,
    isSelecting,
    selectMembership,
    hasActiveSubscription
  };
};
