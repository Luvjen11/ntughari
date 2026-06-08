/** Auth headers for Supabase Edge Functions from the browser */
export function supabaseFunctionAuthHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

/** JSON requests to Edge Functions */
export function supabaseFunctionHeaders(): Record<string, string> {
  return {
    ...supabaseFunctionAuthHeaders(),
    "Content-Type": "application/json",
  };
}

/** Vocabulary columns safe before/after audio_url migration (select * omits unknown cols) */
export const VOCAB_LIST_COLUMNS =
  "id, igbo_word, english_translation, example_sentence_igbo, example_sentence_english, cultural_note, dialect";

export const VOCAB_PRACTICE_COLUMNS =
  "id, english_translation, igbo_word, example_sentence_igbo, example_sentence_english";

export const VOCAB_PRACTICE_COLUMNS_BASIC = "id, english_translation, igbo_word";

/** After migration, audio_url is included automatically via select("*") */
export type VocabRowWithOptionalAudio = {
  id: string;
  igbo_word: string;
  english_translation: string;
  example_sentence_igbo?: string | null;
  example_sentence_english?: string | null;
  cultural_note?: string | null;
  dialect?: string | null;
  audio_url?: string | null;
};
