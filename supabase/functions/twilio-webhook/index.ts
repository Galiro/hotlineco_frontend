// supabase/functions/twilio-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import twilio from "npm:twilio";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const { twiml } = twilio;

const respondWithTwiML = (voiceResponse) => new Response(voiceResponse.toString(), {
  headers: {
    ...corsHeaders,
    "Content-Type": "text/xml"
  }
});

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });

  const formData = await request.formData(); // Twilio posts form-encoded
  const toNumber = formData.get("To") ?? "";
  const fromNumber = formData.get("From") ?? "";
  const callSid = formData.get("CallSid") ?? "";
  const voiceResponse = new twiml.VoiceResponse();

  try {
    if (!toNumber) {
      voiceResponse.say({
        voice: "alice"
      }, "Invalid call. Goodbye.");
      voiceResponse.hangup();
      return respondWithTwiML(voiceResponse);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    
    console.log("Receiving call for number:", toNumber);
    
    // 1) Find phone number by E.164
    const { data: phoneNumber, error: phoneNumberError } = await supabaseClient
      .from("phone_numbers")
      .select("id, org_id, e164")
      .eq("e164", toNumber)
      .single();
    
    if (phoneNumberError || !phoneNumber) {
      voiceResponse.say({
        voice: "alice"
      }, "This number is not configured. Goodbye.");
      voiceResponse.hangup();
      return respondWithTwiML(voiceResponse);
    }

    console.log("Found phone number:", phoneNumber.id);
    
    // 2) Find active hotline bound to that number
    const { data: hotline, error: hotlineError } = await supabaseClient
      .from('hotlines')
      .select(`
        id,
        name,
        mode,
        tts_text,
        status,
        phone_numbers!inner(e164)
      `)
      .eq('phone_numbers.e164', toNumber)
      .eq('status', 'active')
      .single();
      
    if (hotlineError || !hotline) {
      voiceResponse.say({
        voice: "alice"
      }, "No active hotline found. Goodbye.");
      voiceResponse.hangup();
      return respondWithTwiML(voiceResponse);
    }
    // 3) Log the call
    await supabaseClient.from("call_logs").insert({
      org_id: phoneNumber.org_id,
      hotline_id: hotline.id,
      call_sid: callSid,
      from_number: fromNumber,
      to_number: toNumber,
      status: "ringing",
      started_at: new Date().toISOString()
    });

    // 4) Get the first audio file for this hotline (if any)
    const { data: hotlineAudioFiles, error: audioError } = await supabaseClient
      .from('hotline_audio_files')
      .select(`
        id,
        display_order,
        audio_assets!inner(
          id,
          storage_path,
          title
        )
      `)
      .eq('hotline_id', hotline.id)
      .order('display_order', { ascending: true })
      .limit(1);

    // 5) Generate TwiML based on mode and available audio
    if (hotline.mode === "audio" && hotlineAudioFiles && hotlineAudioFiles.length > 0) {
      // Get signed URL for the first audio file
      const audioFile = hotlineAudioFiles[0];
      const fileName = audioFile.audio_assets.storage_path.split('/').pop();

      console.log("Audio file:", fileName);
      
      if (fileName) {
        const { data: signedUrlData, error: urlError } = await supabaseClient.storage
          .from('audio-assets')
          .createSignedUrl(fileName, 3600); // 1 hour expiry
        
        if (!urlError && signedUrlData) {
          console.log("Playing audio file:", audioFile.audio_assets.title);
          voiceResponse.play(signedUrlData.signedUrl);
        } else {
          console.error("Failed to generate signed URL:", urlError);
          voiceResponse.say({
            voice: "alice"
          }, "Audio file not available.");
        }
      }
    } else if (hotline.mode === "tts" && hotline.tts_text) {
      voiceResponse.say({
        voice: "alice",
        language: "en-US"
      }, hotline.tts_text);
    } else if (hotline.mode === "simple_ivr") {
      voiceResponse.say({
        voice: "alice"
      }, "This menu is not configured yet.");
    } else {
      voiceResponse.say({
        voice: "alice"
      }, `Welcome to ${hotline.name}. Not fully configured.`);
    }
    
    voiceResponse.hangup();
    return respondWithTwiML(voiceResponse);
  } catch (error) {
    console.error("Twilio webhook error:", error);
    voiceResponse.say({
      voice: "alice"
    }, "Sorry, there was an error processing your call.");
    voiceResponse.hangup();
    return respondWithTwiML(voiceResponse);
  }
});
