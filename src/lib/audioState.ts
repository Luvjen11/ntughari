export type AudioState = "idle" | "loading" | "playing";

/** Which state a listen button is in, given the shared useTTS status and the text it plays. */
export function audioStateFor(
  text: string,
  tts: { activeText: string | null; isLoading: boolean; isSpeaking: boolean }
): AudioState {
  if (tts.activeText !== text.trim()) return "idle";
  if (tts.isLoading) return "loading";
  return tts.isSpeaking ? "playing" : "idle";
}
