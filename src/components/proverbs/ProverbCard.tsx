import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AudioStateIcon } from "@/components/AudioStateIcon";
import { useSpeakProverb } from "@/hooks/useSpeakProverb";
import { themeLabel, type Proverb } from "@/lib/proverbs";

interface ProverbCardProps {
  proverb: Proverb;
  defaultOpen?: boolean;
}

export function ProverbCard({ proverb, defaultOpen = false }: ProverbCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { speakProverb, audioState } = useSpeakProverb();

  return (
    <article className="brutal-card bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <span className="inline-block text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
            {themeLabel(proverb.theme)}
          </span>
          <p className="font-display text-xl font-bold leading-snug">
            {proverb.igbo_first} <span className="text-primary">{proverb.igbo_second}</span>
          </p>
          <p className="text-muted-foreground italic">{proverb.literal_translation}</p>
        </div>
        <button
          type="button"
          onClick={() => speakProverb(proverb)}
          className="brutal-button bg-primary p-2 shrink-0 disabled:opacity-60"
          aria-label="Listen to this proverb"
        >
          <AudioStateIcon state={audioState(proverb)} size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-display font-semibold hover:text-primary"
        aria-expanded={open}
      >
        {open ? "Hide meaning" : "What it means"}
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-2 border-t-2 border-foreground/10 pt-3">
          <p>{proverb.meaning}</p>
          {proverb.usage_note && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">When it's used: </span>
              {proverb.usage_note}
            </p>
          )}
          {proverb.dialect && (
            <p className="text-xs text-muted-foreground">Dialect: {proverb.dialect}</p>
          )}
          {proverb.source && (
            <p className="text-xs text-muted-foreground">Source: {proverb.source}</p>
          )}
        </div>
      )}
    </article>
  );
}
