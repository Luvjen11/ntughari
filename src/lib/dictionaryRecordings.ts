import { getWords } from "@/lib/igboApi";

function normalizeWord(text: string): string {
  return text.trim().normalize("NFC").toLowerCase();
}

/**
 * The Igbo API dictionary's human recording for exactly this word, or null.
 * Only an exact match counts, so a word never gets a different word's voice.
 */
export async function findDictionaryRecording(word: string): Promise<{ url: string | null; error?: string }> {
  const target = normalizeWord(word);
  if (!target) return { url: null };
  const { words, error } = await getWords({ keyword: word.trim(), strict: true });
  if (error) return { url: null, error };
  const match = words.find((w) => normalizeWord(w.word) === target && w.pronunciation);
  return { url: match?.pronunciation ?? null };
}
