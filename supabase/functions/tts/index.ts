import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  // CORS preflight — must return 2xx with headers (browser blocks otherwise)
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { text, voice = "Idera", responseFormat = "mp3" } = await req.json();

    if (!text || typeof text !== "string") {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    if (text.length > 2000) {
      return jsonResponse({ error: "Text exceeds 2000 character limit" }, 400);
    }

    const yarngptApiKey = Deno.env.get("YARNGPT_API_KEY");
    if (!yarngptApiKey) {
      console.error("YARNGPT_API_KEY not set in Supabase secrets");
      return jsonResponse({ error: "TTS service not configured" }, 500);
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
      // Return 200 with fallback signal so the client can gracefully use its
      // alternate audio path (Igbo API / browser TTS) without surfacing a runtime error.
      return jsonResponse(
        { fallback: true, error: "TTS generation failed", upstreamStatus: response.status, details: errorText },
        200
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
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
