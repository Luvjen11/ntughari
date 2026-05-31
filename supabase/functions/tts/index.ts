import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice = "Idera", responseFormat = "mp3" } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 2000) {
      return new Response(JSON.stringify({ error: "Text exceeds 2000 character limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yarngptApiKey = Deno.env.get("YARNGPT_API_KEY");
    if (!yarngptApiKey) {
      console.error("YARNGPT_API_KEY not set in Supabase secrets");
      return new Response(JSON.stringify({ error: "TTS service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedVoices = ["Chinenye", "Nonso", "Idera", "Adaora"];
    const selectedVoice = allowedVoices.includes(voice) ? voice : "Idera";

    console.log(`Generating TTS for: "${text.slice(0, 80)}..." with voice: ${selectedVoice}`);

    const response = await fetch("https://yarngpt.ai/api/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yarngptApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: selectedVoice,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YarnGPT API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "TTS generation failed",
          details: errorText,
          status: response.status,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="igbo-audio.mp3"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
