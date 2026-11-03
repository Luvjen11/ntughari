// deploy-marker: 2026-11-03T16:12Z (force fresh deploy)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-TTS-Cache, X-TTS-Provider",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Clip {
  audio: ArrayBuffer;
  /** As the provider (or storage) reported it; YarnGPT and ElevenLabs may differ. */
  contentType: string;
}

function audioType(header: string | null): string {
  return header?.startsWith("audio/") ? header.split(";")[0] : "audio/mpeg";
}

function audioResponse(clip: Clip, cache: "hit" | "miss", provider: TtsProvider) {
  return new Response(clip.audio, {
    headers: {
      ...corsHeaders,
      "Content-Type": clip.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=86400",
      "X-TTS-Cache": cache,
      "X-TTS-Provider": provider,
    },
  });
}

type TtsProvider = "yarngpt" | "elevenlabs";

/** Secrets pasted into the dashboard often carry a stray space or newline, which providers reject as malformed. */
function secret(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

function elevenLabsConfigured(): boolean {
  return !!(secret("ELEVENLABS_API_KEY") && secret("ELEVENLABS_VOICE_ID"));
}

/**
 * Providers to generate with, in order. TTS_PROVIDER=elevenlabs puts ElevenLabs
 * first; YarnGPT always follows so playback keeps working when credits run out.
 */
function generationOrder(): TtsProvider[] {
  const wantsEleven = secret("TTS_PROVIDER").toLowerCase() === "elevenlabs";
  return wantsEleven && elevenLabsConfigured() ? ["elevenlabs", "yarngpt"] : ["yarngpt"];
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

async function readCache(key: string): Promise<Clip | null> {
  const cfg = storageConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/storage/v1/object/${CACHE_BUCKET}/${key}.mp3`, {
      headers: { Authorization: `Bearer ${cfg.serviceKey}`, apikey: cfg.serviceKey },
    });
    if (!res.ok) return null;
    return { audio: await res.arrayBuffer(), contentType: audioType(res.headers.get("content-type")) };
  } catch {
    return null;
  }
}

async function writeCache(key: string, clip: Clip): Promise<void> {
  const cfg = storageConfig();
  if (!cfg) return;
  try {
    const res = await fetch(`${cfg.url}/storage/v1/object/${CACHE_BUCKET}/${key}.mp3`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.serviceKey}`,
        apikey: cfg.serviceKey,
        "Content-Type": clip.contentType,
        "x-upsert": "true",
      },
      body: clip.audio,
    });
    if (!res.ok) console.warn("TTS cache write failed:", res.status, await res.text());
  } catch (e) {
    console.warn("TTS cache write error:", e);
  }
}

// ---- Providers

type GenerateResult = ({ ok: true } & Clip) | { ok: false; status: number; details: string };

async function generateYarnGPT(text: string, voice: string): Promise<GenerateResult> {
  const apiKey = secret("YARNGPT_API_KEY");
  if (!apiKey) return { ok: false, status: 500, details: "YARNGPT_API_KEY not set" };

  const response = await fetch("https://yarngpt.ai/api/v1/tts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    // YarnGPT now rejects unknown fields (response_format included) with a 422.
    body: JSON.stringify({ text, voice }),
  });
  if (!response.ok) return { ok: false, status: response.status, details: await response.text() };
  return { ok: true, audio: await response.arrayBuffer(), contentType: audioType(response.headers.get("content-type")) };
}

async function generateElevenLabs(text: string, voiceId: string, modelId: string): Promise<GenerateResult> {
  const apiKey = secret("ELEVENLABS_API_KEY");
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: modelId }),
    }
  );
  if (!response.ok) return { ok: false, status: response.status, details: await response.text() };
  return { ok: true, audio: await response.arrayBuffer(), contentType: audioType(response.headers.get("content-type")) };
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

    const elevenVoice = secret("ELEVENLABS_VOICE_ID");
    const elevenModel = secret("ELEVENLABS_TTS_MODEL") || "eleven_v3";
    const keys: Record<TtsProvider, Promise<string>> = {
      elevenlabs: cacheKey(["elevenlabs", elevenVoice, elevenModel, safeText]),
      yarngpt: cacheKey(["yarngpt", yarnVoice, responseFormat, safeText]),
    };

    const order = generationOrder();

    // After switching back to YarnGPT (e.g. credits used up), audio already made
    // with ElevenLabs keeps being served.
    if (!order.includes("elevenlabs") && elevenVoice) {
      const cached = await readCache(await keys.elevenlabs);
      if (cached) return audioResponse(cached, "hit", "elevenlabs");
    }

    // Each provider in turn: its cached clip, else generate. A YarnGPT clip cached
    // earlier never blocks generating the preferred ElevenLabs one.
    const attempts: { provider: TtsProvider; status: number; details: string }[] = [];
    for (const provider of order) {
      const cached = await readCache(await keys[provider]);
      if (cached) return audioResponse(cached, "hit", provider);

      console.log(`Generating TTS (${provider}) for: "${safeText.slice(0, 80)}..."`);
      const result =
        provider === "elevenlabs"
          ? await generateElevenLabs(safeText, elevenVoice, elevenModel)
          : await generateYarnGPT(safeText, yarnVoice);

      if (result.ok) {
        const clip = { audio: result.audio, contentType: result.contentType };
        await writeCache(await keys[provider], clip);
        return audioResponse(clip, "miss", provider);
      }
      console.error(`${provider} TTS error:`, result.status, result.details);
      attempts.push({ provider, status: result.status, details: result.details.slice(0, 800) });
    }

    // 502, not the provider's own status: a provider's 401 means a bad provider key,
    // not that the learner is signed out. `configured` says which secrets exist
    // (never their values) so a failure can be diagnosed from the browser.
    return jsonResponse(
      {
        error: "TTS generation failed",
        attempts,
        configured: {
          ttsProvider: secret("TTS_PROVIDER") || null,
          elevenlabsKey: !!secret("ELEVENLABS_API_KEY"),
          elevenlabsVoice: !!secret("ELEVENLABS_VOICE_ID"),
          yarngptKey: !!secret("YARNGPT_API_KEY"),
        },
      },
      502
    );
  } catch (error) {
    console.error("TTS error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
