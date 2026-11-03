/** Vowels (and syllabic m, n) are said as they are; other letters are recited with -a (b → ba, gb → gba). */
const SAID_ALONE = new Set(["a", "e", "i", "ị", "o", "ọ", "u", "ụ"]);

/** How a letter of the Igbo alphabet is recited: "ba", "cha", "gba", "ṅa"; vowels as themselves. */
export function letterSound(character: string): string {
  const lower = character.trim().normalize("NFC").toLowerCase();
  if (!lower) return "";
  return SAID_ALONE.has(lower) ? lower : `${lower}a`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Generated speech needs at least this many characters. */
const MIN_SPOKEN_LENGTH = 20;

/**
 * What to say when a letter is tapped: its sound, an example word, and the sound
 * again — "Ba, dị ka ọba. Ba." ("Ba, as in ọba. Ba."). Repeats the sound until the
 * text is long enough for the speech service. Shared with the admin audio tool so
 * pre-generated clips match what learners request.
 */
export function letterPhrase(character: string, exampleWord?: string | null): string {
  const sound = capitalize(letterSound(character));
  if (!sound) return "";
  let phrase = exampleWord?.trim() ? `${sound}, dị ka ${exampleWord.trim()}. ${sound}.` : `${sound}.`;
  while (phrase.length < MIN_SPOKEN_LENGTH) phrase = `${sound}. ${phrase}`;
  return phrase.normalize("NFC");
}
