import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { pricing_plan_id, billing_cycle = 'monthly' } = await req.json()

    if (!pricing_plan_id) {
      return new Response(
        JSON.stringify({ error: 'pricing_plan_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the pricing plan details
    const { data: pricingPlan, error: planError } = await supabaseClient
      .from('membership_pricing')
      .select('*')
      .eq('id', pricing_plan_id)
      .eq('is_active', true)
      .single()

    if (planError || !pricingPlan) {
      return new Response(
        JSON.stringify({ error: 'Pricing plan not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the user's organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'User organization not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get organization details
    const { data: org, error: orgError } = await supabaseClient
      .from('orgs')
      .select('name')
      .eq('id', membership.org_id)
      .single()

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine the price based on billing cycle
    const priceCents = billing_cycle === 'yearly' && pricingPlan.price_yearly_cents 
      ? pricingPlan.price_yearly_cents 
      : pricingPlan.price_monthly_cents

    const interval = billing_cycle === 'yearly' ? 'year' : 'month'

    console.log("using url", `${Deno.env.get('SITE_URL')}/dashboard?success=true`)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pricingPlan.name} Plan`,
              description: pricingPlan.description,
              metadata: {
                pricing_plan_id: pricingPlan.id,
                org_id: membership.org_id,
              },
            },
            unit_amount: priceCents,
            recurring: {
              interval: interval as 'month' | 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL')}/dashboard?success=true`,
      cancel_url: `${Deno.env.get('SITE_URL')}/membership?cancelled=true`,
      customer_email: user.email,
      metadata: {
        pricing_plan_id: pricingPlan.id,
        org_id: membership.org_id,
        user_id: user.id,
        billing_cycle: billing_cycle,
      },
      subscription_data: {
        metadata: {
          pricing_plan_id: pricingPlan.id,
          org_id: membership.org_id,
          user_id: user.id,
          billing_cycle: billing_cycle,
        },
      },
    })

    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
