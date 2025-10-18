// supabase/functions/voice-inbound/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import twilio from "npm:twilio";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const { twiml } = twilio;
const respondXml = (vr) => new Response(vr.toString(), {
  headers: {
    ...corsHeaders,
    "Content-Type": "text/xml"
  }
});

serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });

  const form = await req.formData(); // Twilio posts form-encoded
  const toNumber = form.get("To") ?? "";
  const fromNumber = form.get("From") ?? "";
  const callSid = form.get("CallSid") ?? "";
  const r = new twiml.VoiceResponse();

  try {
    if (!toNumber) {
      r.say({
        voice: "alice"
      }, "Invalid call. Goodbye.");
      r.hangup();
      return respondXml(r);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    
    console.log("Recieving call for toNumber", toNumber);
    
    // 1) phone_numbers by E.164
    const { data: pn, error: pnErr } = await sb.from("phone_numbers").select("id, org_id, e164").eq("e164", toNumber).single();
    
    if (pnErr || !pn) {
      r.say({
        voice: "alice"
      }, "This number is not configured. Goodbye.");
      r.hangup();
      return respondXml(r);
    }

    console.log("Found number", pn.id);
    
    // 2) active hotline bound to that number
    const { data: hl, error: hlErr } = await sb.from('hotlines').select(`
        id,
        name,
        mode,
        tts_text,
        status,
        phone_numbers!inner(e164)
      `).eq('phone_numbers.e164', toNumber).eq('status', 'active').single();
    if (hlErr || !hl) {
      r.say({
        voice: "alice"
      }, "No active hotline found. Goodbye.");
      r.hangup();
      return respondXml(r);
    }
    // 3) best-effort log
    await sb.from("call_logs").insert({
      org_id: hl.org_id,
      hotline_id: hl.id,
      call_sid: callSid,
      from_number: fromNumber,
      to_number: toNumber,
      status: "ringing",
      started_at: new Date().toISOString()
    });
    // 4) TwiML based on mode
    if (hl.mode === "tts" && hl.tts_text) {
      r.say({
        voice: "alice",
        language: "en-US"
      }, hl.tts_text);
    } else if (hl.mode === "audio" && hl.audio_url) {
      // audio_url must be public (or use a short-lived signed URL)
      r.play(hl.audio_url);
    } else if (hl.mode === "simple_ivr") {
      r.say({
        voice: "alice"
      }, "This menu is not configured yet.");
    } else {
      r.say({
        voice: "alice"
      }, `Welcome to ${hl.name}. Not fully configured.`);
    }
    r.hangup();
    return respondXml(r);
  } catch (err) {
    console.error("voice-inbound error:", err);
    r.say({
      voice: "alice"
    }, "Sorry, there was an error processing your call.");
    r.hangup();
    return respondXml(r);
  }
});
