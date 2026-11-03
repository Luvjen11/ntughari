import { Loader2, Volume2 } from "lucide-react";
import type { AudioState } from "@/lib/audioState";

/** Speaker icon that becomes a spinner while audio loads and pulses while it plays. */
export function AudioStateIcon({ state, size = 18 }: { state: AudioState; size?: number }) {
  if (state === "loading") return <Loader2 size={size} className="animate-spin" aria-label="Loading audio" />;
  return <Volume2 size={size} className={state === "playing" ? "animate-pulse" : undefined} />;
}
