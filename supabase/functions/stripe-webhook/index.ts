import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the raw body and signature for webhook verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('No Stripe signature found')
      return new Response('No signature', { status: 400 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('Received webhook event:', event.type)

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      
      console.log('Processing checkout session:', session.id)
      console.log('Session metadata:', session.metadata)

      // Extract metadata from the session
      const { 
        pricing_plan_id, 
        org_id, 
        user_id, 
        billing_cycle 
      } = session.metadata || {}

      if (!pricing_plan_id || !org_id || !user_id || !billing_cycle) {
        console.error('Missing required metadata:', { pricing_plan_id, org_id, user_id, billing_cycle })
        return new Response('Missing metadata', { status: 400 })
      }

      // Get the subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      
      console.log('Retrieved subscription:', subscription.id)

      // Calculate the current period dates
      const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

      // Create or update the organization subscription
      const { data: existingSubscription, error: existingError } = await supabaseClient
        .from('organization_subscriptions')
        .select('id')
        .eq('org_id', org_id)
        .single()

      let subscriptionData
      if (existingSubscription) {
        // Update existing subscription
        const { data, error } = await supabaseClient
          .from('organization_subscriptions')
          .update({
            pricing_plan_id,
            status: 'active',
            billing_cycle: billing_cycle as 'monthly' | 'yearly',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            updated_at: new Date().toISOString(),
          })
          .eq('org_id', org_id)
          .select()
          .single()

        if (error) {
          console.error('Error updating subscription:', error)
          throw error
        }

        subscriptionData = data
        console.log('Updated existing subscription:', data.id)
      } else {
        // Create new subscription
        const { data, error } = await supabaseClient
          .from('organization_subscriptions')
          .insert({
            org_id,
            pricing_plan_id,
            status: 'active',
            billing_cycle: billing_cycle as 'monthly' | 'yearly',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating subscription:', error)
          throw error
        }

        subscriptionData = data
        console.log('Created new subscription:', data.id)
      }

      // Log successful processing
      console.log('Successfully processed checkout session:', {
        session_id: session.id,
        subscription_id: subscription.id,
        org_id,
        pricing_plan_id,
        billing_cycle
      })

      return new Response(
        JSON.stringify({ 
          success: true, 
          subscription_id: subscriptionData.id,
          stripe_subscription_id: subscription.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle subscription updates (for billing cycle changes, cancellations, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      
      console.log('Processing subscription update:', subscription.id)

      // Find the subscription in our database
      const { data: existingSubscription, error: findError } = await supabaseClient
        .from('organization_subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (findError || !existingSubscription) {
        console.error('Subscription not found in database:', subscription.id)
        return new Response('Subscription not found', { status: 404 })
      }

      // Update the subscription status and period
      const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString()
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
      
      let status = 'active'
      if (subscription.status === 'canceled') {
        status = 'cancelled'
      } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
        status = 'expired'
      }

      const { error: updateError } = await supabaseClient
        .from('organization_subscriptions')
        .update({
          status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        throw updateError
      }

      console.log('Successfully updated subscription:', subscription.id)
    }

    // Handle subscription cancellations
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      
      console.log('Processing subscription cancellation:', subscription.id)

      const { error: updateError } = await supabaseClient
        .from('organization_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      if (updateError) {
        console.error('Error cancelling subscription:', updateError)
        throw updateError
      }

      console.log('Successfully cancelled subscription:', subscription.id)
    }

    // Return success for unhandled event types
    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
