import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSignedInUserId } from "../_shared/auth.ts";

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

/** MP3, WAV, OGG and FLAC all begin with a recognisable marker; a JSON job receipt does not. */
function looksLikeAudio(bytes: ArrayBuffer): boolean {
  const b = new Uint8Array(bytes.slice(0, 4));
  if (b.length < 4) return false;
  const head = String.fromCharCode(...b);
  if (head.startsWith("ID3") || head === "RIFF" || head === "OggS" || head === "fLaC") return true;
  // MPEG frame sync: first byte 0xFF, next byte's three top bits set.
  return b[0] === 0xff && (b[1] & 0xe0) === 0xe0;
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
    const type = res.headers.get("content-type") || "";
    const audio = await res.arrayBuffer();
    // An older version saved a job receipt here as if it were audio; never play that.
    if (!looksLikeAudio(audio)) return null;
    return { audio, contentType: audioType(type) };
  } catch {
    return null;
  }
}

async function writeCache(key: string, clip: Clip): Promise<void> {
  const cfg = storageConfig();
  if (!cfg || !looksLikeAudio(clip.audio)) return;
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

/** Regenerating overwrites a stored clip and spends credits, so only admins may ask. */
async function isAdmin(req: Request): Promise<boolean> {
  const userId = await getSignedInUserId(req);
  const cfg = storageConfig();
  if (!userId || !cfg) return false;
  const res = await fetch(
    `${cfg.url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&role=eq.admin&select=user_id`,
    { headers: { Authorization: `Bearer ${cfg.serviceKey}`, apikey: cfg.serviceKey } }
  );
  if (!res.ok) return false;
  const rows = (await res.json()) as unknown[];
  return rows.length > 0;
}

// ---- Human recordings: stored privately (the workspace blocks public buckets),
// streamed to learners here with the service role.

const RECORDINGS_BUCKET = "recordings";

/** "vocabulary/<id>-<time>.mp3": one folder, one file name, nothing that climbs out of the bucket. */
function isSafeRecordingPath(path: string): boolean {
  return /^[a-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(path) && !path.includes("..");
}

async function readRecording(path: string): Promise<Response> {
  const cfg = storageConfig();
  if (!cfg) return jsonResponse({ error: "Storage not configured" }, 500);
  const res = await fetch(`${cfg.url}/storage/v1/object/${RECORDINGS_BUCKET}/${path}`, {
    headers: { Authorization: `Bearer ${cfg.serviceKey}`, apikey: cfg.serviceKey },
  });
  if (!res.ok) return jsonResponse({ error: "Recording not found" }, 404);
  return new Response(await res.arrayBuffer(), {
    headers: {
      ...corsHeaders,
      "Content-Type": res.headers.get("content-type") || "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// ---- Providers

type GenerateResult =
  | ({ ok: true } & Clip)
  | { ok: false; status: number; details: string; retryAfterSeconds?: number };

/** YarnGPT bills per character and refuses anything under 20 (422 INPUT_TOO_SHORT). */
const YARNGPT_MIN_CHARS = 20;

/**
 * What YarnGPT counts toward its minimum: letters, digits and spaces (it reported
 * "Nne m" as 5 and "Ụlọ akwụkwọ" as 11), not punctuation.
 */
function chargeableLength(text: string): number {
  return text.replace(/[^\p{L}\p{N}\s]/gu, "").length;
}

/**
 * Text below YarnGPT's minimum is said more than once so it is long enough:
 * a single word inside a carrier phrase ("Okwu a bụ ala. Ala." — "This word is
 * ala. Ala."), a short phrase simply repeated ("Ọ dị mma! Ọ dị mma!"). The cache
 * key stays the original text.
 */
function padForYarnGPT(text: string): string {
  if (chargeableLength(text) >= YARNGPT_MIN_CHARS) return text;
  const core = text.trim().replace(/[.!?…]+$/, "");
  if (!chargeableLength(core)) return text;
  const isWord = !/\s/.test(core);
  const unit = isWord ? `${core}.` : /[.!?…]$/.test(text.trim()) ? text.trim() : `${core}.`;
  let padded = isWord ? `Okwu a bụ ${unit}` : unit;
  while (chargeableLength(padded) < YARNGPT_MIN_CHARS) padded += ` ${unit}`;
  return padded;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Short back-offs are waited out here; a longer one (YarnGPT's daily quota) is reported back. */
const MAX_RETRY_WAIT_MS = 20000;

/**
 * Seconds YarnGPT asks us to wait after a 429: the Retry-After header, or
 * error.details.retry_after_seconds in the body (its daily quota answers that way).
 */
function retryAfterSeconds(res: Response, body: string): number | null {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header;
  try {
    const seconds = (JSON.parse(body) as { error?: { details?: { retry_after_seconds?: unknown } } }).error
      ?.details?.retry_after_seconds;
    return typeof seconds === "number" && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

async function generateYarnGPT(
  rawText: string,
  voice: string,
  outputFormat: string
): Promise<GenerateResult> {
  const apiKey = secret("YARNGPT_API_KEY");
  if (!apiKey) return { ok: false, status: 500, details: "YARNGPT_API_KEY not set" };
  const text = padForYarnGPT(rawText);

  // The API queues a job and answers with a job_id; the clip is fetched once ready.
  // Replaying the same Idempotency-Key returns the original job instead of billing twice.
  const idempotencyKey = await cacheKey(["idempotency", "yarngpt", voice, outputFormat, text]);

  // On a short 429 wait and resend; the Idempotency-Key makes a resend safe.
  let queued: Response;
  for (let attempt = 1; ; attempt++) {
    queued = await fetch("https://yarngpt.ai/api/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      // YarnGPT rejects unknown fields (response_format included) with a 422.
      body: JSON.stringify({ text, voice, output_format: outputFormat }),
    });
    if (queued.status !== 429) break;
    const details = await queued.text();
    const waitSeconds = retryAfterSeconds(queued, details);
    const waitMs = waitSeconds === null ? 2000 * attempt : waitSeconds * 1000;
    if (attempt === 3 || waitMs > MAX_RETRY_WAIT_MS) {
      return { ok: false, status: 429, details, retryAfterSeconds: waitSeconds ?? undefined };
    }
    await sleep(waitMs);
  }
  if (!queued.ok) return { ok: false, status: queued.status, details: await queued.text() };

  const job = (await queued.json()) as { job_id?: string };
  if (!job.job_id) return { ok: false, status: 502, details: "YarnGPT returned no job_id" };

  // There is no webhook: poll until the clip is ready. Short lines finish in seconds.
  // The job is already paid for, so a 429 while polling means wait longer, not give up.
  const deadline = Date.now() + 45000;
  let wait = 800;
  while (Date.now() < deadline) {
    await sleep(wait);
    wait = Math.min(Math.round(wait * 1.6), 3000);

    const statusRes = await fetch(`https://yarngpt.ai/api/v1/status/${job.job_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (statusRes.status === 429) {
      const details = await statusRes.text();
      const waitSeconds = retryAfterSeconds(statusRes, details);
      if (waitSeconds !== null && waitSeconds * 1000 > MAX_RETRY_WAIT_MS) {
        return { ok: false, status: 429, details, retryAfterSeconds: waitSeconds };
      }
      wait = Math.max(wait, waitSeconds === null ? 4000 : waitSeconds * 1000);
      continue;
    }
    if (!statusRes.ok) return { ok: false, status: statusRes.status, details: await statusRes.text() };

    const status = (await statusRes.json()) as {
      status?: string;
      audio_url?: string;
      error_message?: string;
      user_message?: string;
    };

    if (status.status === "completed" && status.audio_url) {
      const clip = await fetch(status.audio_url);
      if (!clip.ok) return { ok: false, status: clip.status, details: "YarnGPT clip download failed" };
      const type = clip.headers.get("content-type") || "";
      const audio = await clip.arrayBuffer();
      // A JSON error page must never be cached as if it were audio.
      if (!audio.byteLength || type.includes("json") || type.startsWith("text/")) {
        return { ok: false, status: 502, details: `YarnGPT clip was not audio (${type || "unknown"})` };
      }
      return { ok: true, audio, contentType: audioType(type) };
    }

    if (status.status === "failed" || status.status === "error") {
      return {
        ok: false,
        status: 502,
        details: status.error_message || status.user_message || "YarnGPT job failed",
      };
    }
  }

  return { ok: false, status: 504, details: "YarnGPT job did not finish in time" };
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

    const { text, voice = "idera", responseFormat = "mp3", regenerate = false, check = false, recording } =
      await req.json();

    // Play an uploaded human recording.
    if (typeof recording === "string") {
      if (!isSafeRecordingPath(recording)) return jsonResponse({ error: "Invalid recording path" }, 400);
      return await readRecording(recording);
    }

    // Admin "Regenerate": skip stored clips and overwrite them with a fresh one.
    if (regenerate === true && !(await isAdmin(req))) {
      return jsonResponse({ error: "Only admins can regenerate audio" }, 403);
    }
    const useCache = regenerate !== true;

    if (!text || typeof text !== "string") {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    if (text.length > 2000) {
      return jsonResponse({ error: "Text exceeds 2000 character limit" }, 400);
    }

    const safeText = (text.length > 500 ? text.slice(0, 500) : text).trim().normalize("NFC");

    // YarnGPT voice names are lowercase (e.g. "idera"); older clients may still send "Idera".
    const allowedVoices = ["chinenye", "nonso", "idera", "adaora"];
    const requestedVoice = String(voice ?? "").toLowerCase();
    const yarnVoice = allowedVoices.includes(requestedVoice) ? requestedVoice : "idera";

    const elevenVoice = secret("ELEVENLABS_VOICE_ID");
    const elevenModel = secret("ELEVENLABS_TTS_MODEL") || "eleven_v3";
    const allowedFormats = ["mp3", "wav", "opus", "flac"];
    const outFormat = allowedFormats.includes(responseFormat) ? responseFormat : "mp3";
    const keys: Record<TtsProvider, Promise<string>> = {
      elevenlabs: cacheKey(["elevenlabs", elevenVoice, elevenModel, safeText]),
      yarngpt: cacheKey(["yarngpt", yarnVoice, outFormat, safeText]),
    };

    const order = generationOrder();

    // "Is this clip stored?" for the admin audio tool: answers without generating
    // anything, so checking never spends credits.
    if (check === true) {
      const candidates: TtsProvider[] = elevenVoice && !order.includes("elevenlabs") ? ["elevenlabs", ...order] : order;
      for (const provider of candidates) {
        if (await readCache(await keys[provider])) return jsonResponse({ stored: true, provider }, 200);
      }
      return jsonResponse({ stored: false }, 200);
    }

    // After switching back to YarnGPT (e.g. credits used up), audio already made
    // with ElevenLabs keeps being served.
    if (useCache && !order.includes("elevenlabs") && elevenVoice) {
      const cached = await readCache(await keys.elevenlabs);
      if (cached) return audioResponse(cached, "hit", "elevenlabs");
    }

    // Each provider in turn: its cached clip, else generate. A YarnGPT clip cached
    // earlier never blocks generating the preferred ElevenLabs one.
    const attempts: { provider: TtsProvider; status: number; details: string; retryAfterSeconds?: number }[] = [];
    for (const provider of order) {
      const cached = useCache ? await readCache(await keys[provider]) : null;
      if (cached) return audioResponse(cached, "hit", provider);

      console.log(`Generating TTS (${provider}) for: "${safeText.slice(0, 80)}..."`);
      const result =
        provider === "elevenlabs"
          ? await generateElevenLabs(safeText, elevenVoice, elevenModel)
          : await generateYarnGPT(safeText, yarnVoice, outFormat);

      if (result.ok) {
        const clip = { audio: result.audio, contentType: result.contentType };
        await writeCache(await keys[provider], clip);
        return audioResponse(clip, "miss", provider);
      }
      console.error(`${provider} TTS error:`, result.status, result.details);
      attempts.push({
        provider,
        status: result.status,
        details: result.details.slice(0, 800),
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    // 502, not the provider's own status: a provider's 401 means a bad provider key,
    // not that the learner is signed out. `configured` says which secrets exist
    // (never their values) so a failure can be diagnosed from the browser.
    // Every provider said "too many requests": the admin tool waits and retries, or
    // stops and shows when to try again if the wait is long (YarnGPT's daily quota).
    const rateLimited = attempts.length > 0 && attempts.every((a) => a.status === 429);
    // The soonest any provider will take requests again; unknown if one didn't say.
    const waits = attempts.map((a) => a.retryAfterSeconds);
    const soonest = waits.every((w) => w !== undefined) ? Math.min(...(waits as number[])) : undefined;
    return jsonResponse(
      {
        error: "TTS generation failed",
        rateLimited,
        retryAfterSeconds: rateLimited ? soonest : undefined,
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
