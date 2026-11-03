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

function audioResponse(audio: ArrayBuffer, cache: "hit" | "miss") {
  return new Response(audio, {
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="igbo-audio.mp3"',
      "Cache-Control": "public, max-age=86400",
      "X-TTS-Cache": cache,
    },
  });
}

type TtsProvider = "yarngpt" | "elevenlabs";

/** TTS_PROVIDER=elevenlabs switches every voice to ELEVENLABS_VOICE_ID; default YarnGPT. */
function resolveProvider(): TtsProvider {
  const forced = Deno.env.get("TTS_PROVIDER")?.toLowerCase().trim();
  if (forced === "elevenlabs" && Deno.env.get("ELEVENLABS_API_KEY") && Deno.env.get("ELEVENLABS_VOICE_ID")) {
    return "elevenlabs";
  }
  return "yarngpt";
}

// ---- Storage cache: each (provider, voice, model, text) is generated once, then served from the
// private "tts-cache" bucket (see migration 20261103120000_tts_cache_bucket.sql).

const CACHE_BUCKET = "tts-cache";

async function cacheKey(parts: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(parts.join("\u0000"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function storageConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return url && serviceKey ? { url, serviceKey } : null;
}

async function readCache(key: string): Promise<ArrayBuffer | null> {
  const cfg = storageConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/storage/v1/object/${CACHE_BUCKET}/${key}.mp3`, {
      headers: { Authorization: `Bearer ${cfg.serviceKey}`, apikey: cfg.serviceKey },
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

async function writeCache(key: string, audio: ArrayBuffer): Promise<void> {
  const cfg = storageConfig();
  if (!cfg) return;
  try {
    const res = await fetch(`${cfg.url}/storage/v1/object/${CACHE_BUCKET}/${key}.mp3`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.serviceKey}`,
        apikey: cfg.serviceKey,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
      },
      body: audio,
    });
    if (!res.ok) console.warn("TTS cache write failed:", res.status, await res.text());
  } catch (e) {
    console.warn("TTS cache write error:", e);
  }
}

// ---- Providers

type GenerateResult = { ok: true; audio: ArrayBuffer } | { ok: false; status: number; details: string };

async function generateYarnGPT(text: string, voice: string, responseFormat: string): Promise<GenerateResult> {
  const apiKey = Deno.env.get("YARNGPT_API_KEY");
  if (!apiKey) return { ok: false, status: 500, details: "YARNGPT_API_KEY not set" };

  const response = await fetch("https://yarngpt.ai/api/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, response_format: responseFormat }),
  });
  if (!response.ok) return { ok: false, status: response.status, details: await response.text() };
  return { ok: true, audio: await response.arrayBuffer() };
}

async function generateElevenLabs(text: string, voiceId: string, modelId: string): Promise<GenerateResult> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY")!;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: modelId }),
    }
  );
  if (!response.ok) return { ok: false, status: response.status, details: await response.text() };
  return { ok: true, audio: await response.arrayBuffer() };
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

    const safeText = (text.length > 500 ? text.slice(0, 500) : text).trim().normalize("NFC");

    const allowedVoices = ["Chinenye", "Nonso", "Idera", "Adaora"];
    const yarnVoice = allowedVoices.includes(voice) ? voice : "Idera";

    const provider = resolveProvider();
    const elevenVoice = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "";
    const elevenModel = Deno.env.get("ELEVENLABS_TTS_MODEL")?.trim() || "eleven_v3";

    const key = await cacheKey(
      provider === "elevenlabs"
        ? ["elevenlabs", elevenVoice, elevenModel, safeText]
        : ["yarngpt", yarnVoice, responseFormat, safeText]
    );

    const cached = await readCache(key);
    if (cached) return audioResponse(cached, "hit");

    console.log(`Generating TTS (${provider}) for: "${safeText.slice(0, 80)}..."`);

    const result =
      provider === "elevenlabs"
        ? await generateElevenLabs(safeText, elevenVoice, elevenModel)
        : await generateYarnGPT(safeText, yarnVoice, responseFormat);

    if (!result.ok) {
      console.error(`${provider} TTS error:`, result.status, result.details);
      return jsonResponse(
        { error: "TTS generation failed", details: result.details, status: result.status },
        result.status >= 400 && result.status < 600 ? result.status : 502
      );
    }

    await writeCache(key, result.audio);
    return audioResponse(result.audio, "miss");
  } catch (error) {
    console.error("TTS error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
