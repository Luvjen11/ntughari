import { useTTS } from "@/hooks/useTTS";
import { proverbText, type Proverb } from "@/lib/proverbs";

/** Play a proverb: a human recording when we have one, otherwise generated Igbo speech. */
export function useSpeakProverb() {
  const { speakIgboWord, speakSentence, isSpeaking } = useTTS();
  const speakProverb = (p: Proverb) => {
    const text = proverbText(p);
    if (p.audio_url) void speakIgboWord(text, { recordedUrl: p.audio_url });
    else void speakSentence(text, { igbo: true });
  };
  return { speakProverb, isSpeaking };
}
