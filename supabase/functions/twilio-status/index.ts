import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the request body (Twilio sends form data)
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string
    const callDuration = formData.get('CallDuration') as string
    const recordingUrl = formData.get('RecordingUrl') as string

    console.log(`Call status update: ${callSid} - ${callStatus}`)

    // Update the call log with status and duration
    const updateData: any = {
      status: callStatus,
      ended_at: new Date().toISOString()
    }

    if (callDuration) {
      updateData.duration_s = parseInt(callDuration)
    }

    if (recordingUrl) {
      updateData.recording_url = recordingUrl
    }

    const { error: updateError } = await supabaseClient
      .from('call_logs')
      .update(updateData)
      .eq('call_sid', callSid)

    if (updateError) {
      console.error('Error updating call log:', updateError)
    } else {
      console.log(`Updated call log for ${callSid}`)
    }

    // Return empty response (Twilio doesn't need anything back)
    return new Response('', { 
      status: 200,
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Error in status callback:', error)
    
    return new Response('Error', { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
