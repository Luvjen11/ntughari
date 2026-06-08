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

async function transcribeWithOpenAI(audioBlob: Blob): Promise<string | null> {
  const key = Deno.env.get("LLM_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
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
  formData.append("audio", audioBlob, "recording.webm");

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

    let text = await transcribeWithIgboApi(audioBlob);
    if (!text) {
      text = await transcribeWithOpenAI(audioBlob);
    }

    if (!text) {
      return jsonResponse(
        {
          error: "Transcription failed",
          details: "Set IGBO_API_KEY or LLM_API_KEY (OpenAI Whisper) in Supabase secrets.",
        },
        502
      );
    }

    return jsonResponse({ text, language: "ig" });
  } catch (error) {
    console.error("ASR error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
