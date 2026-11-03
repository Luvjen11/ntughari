import { supabase } from "@/integrations/supabase/client";
import { forgetClip, RECORDING_PREFIX } from "@/hooks/useTTS";
import { userFunctionAuthHeaders } from "@/lib/supabaseFunctions";
import { DEFAULT_YARNGPT_VOICE } from "@/lib/ttsConstants";
import { splitForTTS } from "@/lib/ttsUtils";

export type SpokenKind = "word" | "sentence";

/**
 * Make fresh generated audio for `text` and overwrite the stored clip (admins only;
 * spends credits once). Uses the same chunks as playback so learners get the new clip.
 */
export async function regenerateClip(text: string, kind: SpokenKind): Promise<void> {
  const chunks = kind === "sentence" ? splitForTTS(text) : [text.trim().normalize("NFC")];
  for (const chunk of chunks.filter(Boolean)) {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`, {
      method: "POST",
      headers: await userFunctionAuthHeaders(true),
      body: JSON.stringify({ text: chunk, voice: DEFAULT_YARNGPT_VOICE, responseFormat: "mp3", regenerate: true }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(res.status === 403 ? "Only admins can regenerate audio." : `Regenerate failed (${res.status}): ${body.slice(0, 160)}`);
    }
    await res.arrayBuffer();
    forgetClip(chunk);
  }
}

/**
 * Upload a human recording to the private "recordings" bucket. Returns the value to
 * save as the item's audio_url ("recording:<path>"); learners hear it through tts.
 */
export async function uploadRecording(file: File, folder: string, itemId: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp3";
  const path = `${folder}/${itemId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("recordings")
    .upload(path, file, { contentType: file.type || "audio/mpeg", upsert: true });
  if (error) throw error;
  return `${RECORDING_PREFIX}${path}`;
}
