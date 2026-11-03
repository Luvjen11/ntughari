import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSignedInUserId } from "../_shared/auth.ts";

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

function getOpenAiKey(): string | null {
  const dedicated = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (dedicated) return dedicated;
  const legacy = Deno.env.get("LLM_API_KEY")?.trim();
  // Anthropic keys (sk-ant-…) cannot be used for Whisper
  if (legacy && !legacy.startsWith("sk-ant-")) return legacy;
  return null;
}

function audioFileName(audioBlob: Blob, fallback = "recording.webm"): string {
  if (audioBlob instanceof File && audioBlob.name) return audioBlob.name;
  const type = audioBlob.type;
  if (type.includes("mp4")) return "recording.m4a";
  if (type.includes("ogg")) return "recording.ogg";
  return fallback;
}

/** Spitch (api.spitch.app) — Nigerian-language STT with real Igbo support. */
async function transcribeWithSpitch(audioBlob: Blob): Promise<string | null> {
  const key = Deno.env.get("SPITCH_API_KEY")?.trim();
  if (!key) return null;

  const formData = new FormData();
  formData.append("content", audioBlob, audioFileName(audioBlob));
  formData.append("language", "ig");

  try {
    const res = await fetch("https://api.spitch.app/v1/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
    });

    if (!res.ok) {
      console.error("Spitch STT error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch (e) {
    console.error("Spitch STT request failed:", e);
    return null;
  }
}

/** ElevenLabs Scribe — lists Igbo among its supported languages. */
async function transcribeWithElevenLabs(audioBlob: Blob): Promise<string | null> {
  const key = Deno.env.get("ELEVENLABS_API_KEY")?.trim();
  if (!key) return null;

  const formData = new FormData();
  formData.append("file", audioBlob, audioFileName(audioBlob));
  formData.append("model_id", Deno.env.get("ELEVENLABS_STT_MODEL")?.trim() || "scribe_v2");
  formData.append("language_code", "ig");

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: formData,
    });

    if (!res.ok) {
      console.error("ElevenLabs STT error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch (e) {
    console.error("ElevenLabs STT request failed:", e);
    return null;
  }
}

const PROVIDERS: Record<string, (audio: Blob) => Promise<string | null>> = {
  spitch: transcribeWithSpitch,
  elevenlabs: transcribeWithElevenLabs,
  "igbo-api": transcribeWithIgboApi,
  whisper: transcribeWithOpenAI,
};

async function transcribeWithOpenAI(audioBlob: Blob): Promise<string | null> {
  const key = getOpenAiKey();
  if (!key) return null;

  const formData = new FormData();
  formData.append("file", audioBlob, audioFileName(audioBlob));
  formData.append("model", "whisper-1");
  formData.append("language", "ig");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: formData,
  });

  if (!res.ok) {
    console.error("Whisper error:", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? null;
}

async function transcribeWithIgboApi(audioBlob: Blob): Promise<string | null> {
  const key = Deno.env.get("IGBO_API_KEY");
  if (!key) return null;

  const formData = new FormData();
  formData.append("audio", audioBlob, audioFileName(audioBlob));

  const endpoints = [
    "https://igboapi.com/api/v2/speech-to-text",
    "https://igboapi.com/api/v2/speech/text",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "X-API-Key": key },
        body: formData,
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text =
        (typeof data === "object" && data && "text" in data && String((data as { text: string }).text)) ||
        (typeof data === "object" && data && "transcript" in data && String((data as { transcript: string }).transcript)) ||
        (typeof data === "object" && data && "data" in data &&
          typeof (data as { data: { text?: string } }).data?.text === "string" &&
          (data as { data: { text: string } }).data.text) ||
        "";
      if (text.trim()) return text.trim();
    } catch (e) {
      console.warn("Igbo API ASR attempt failed:", url, e);
    }
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!(await getSignedInUserId(req))) {
      return jsonResponse({ error: "Sign in to use this feature", code: "auth_required" }, 401);
    }

    const contentType = req.headers.get("content-type") ?? "";
    let audioBlob: Blob | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("audio");
      if (file instanceof File) {
        audioBlob = file;
      } else if (file instanceof Blob) {
        audioBlob = file;
      }
    } else {
      audioBlob = await req.blob();
    }

    if (!audioBlob || audioBlob.size === 0) {
      return jsonResponse({ error: "No audio provided" }, 400);
    }

    if (audioBlob.size > 5 * 1024 * 1024) {
      return jsonResponse({ error: "Audio file too large (max 5MB)" }, 400);
    }

    // Provider chain, best Igbo accuracy first. ?provider=elevenlabs (etc.) forces a
    // single provider so they can be compared on the same recording.
    const forced = new URL(req.url).searchParams.get("provider");
    const order = forced && PROVIDERS[forced]
      ? [forced]
      : ["spitch", "elevenlabs", "igbo-api", "whisper"];

    let provider = order[0];
    let text: string | null = null;
    for (const name of order) {
      provider = name;
      text = await PROVIDERS[name](audioBlob);
      if (text) break;
    }

    if (!text) {
      return jsonResponse(
        {
          error: "Transcription failed",
          details:
            "Set SPITCH_API_KEY, ELEVENLABS_API_KEY, IGBO_API_KEY, and/or OPENAI_API_KEY (Whisper) in Supabase secrets.",
        },
        502
      );
    }

    return jsonResponse({ text, language: "ig", provider });
  } catch (error) {
    console.error("ASR error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
