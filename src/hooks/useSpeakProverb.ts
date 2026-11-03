import { useTTS } from "@/hooks/useTTS";
import { audioStateFor, type AudioState } from "@/lib/audioState";
import { proverbText, type Proverb } from "@/lib/proverbs";

/** Play a proverb: a human recording when we have one, otherwise generated Igbo speech. */
export function useSpeakProverb() {
  const tts = useTTS();
  const speakProverb = (p: Proverb) => {
    const text = proverbText(p);
    if (p.audio_url) void tts.speakIgboWord(text, { recordedUrl: p.audio_url });
    else void tts.speakSentence(text, { igbo: true });
  };
  const audioState = (p: Proverb): AudioState => audioStateFor(proverbText(p), tts);
  return { speakProverb, audioState, speakSentence: tts.speakSentence, tts };
}
