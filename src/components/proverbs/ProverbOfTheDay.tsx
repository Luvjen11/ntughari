import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AudioStateIcon } from "@/components/AudioStateIcon";
import { useProverbs } from "@/hooks/useProverbs";
import { proverbOfTheDay, themeLabel } from "@/lib/proverbs";
import { useSpeakProverb } from "@/hooks/useSpeakProverb";

interface ProverbOfTheDayProps {
  /** Show the link through to the full proverbs page (off on that page itself). */
  showLink?: boolean;
}

export function ProverbOfTheDay({ showLink = true }: ProverbOfTheDayProps) {
  const { data: proverbs } = useProverbs();
  const { speakProverb, audioState } = useSpeakProverb();
  const today = proverbOfTheDay(proverbs ?? []);

  if (!today) return null;

  return (
    <section
      aria-labelledby="proverb-of-the-day"
      className="brutal-card bg-secondary p-6 md:p-8 space-y-4 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="proverb-of-the-day"
          className="font-display text-xs font-bold uppercase tracking-widest"
        >
          Ilu taa · Proverb of the day
        </h2>
        <span className="text-xs font-display font-semibold px-2 py-1 rounded-full border-2 border-foreground bg-card">
          {themeLabel(today.theme)}
        </span>
      </div>

      <p className="font-display text-2xl md:text-3xl font-bold leading-tight text-balance">
        {today.igbo_first} {today.igbo_second}
      </p>
      <p className="italic">{today.literal_translation}</p>
      <p className="text-foreground/80">{today.meaning}</p>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={() => speakProverb(today)}
          className="brutal-button bg-card flex items-center gap-2 disabled:opacity-60"
        >
          <AudioStateIcon state={audioState(today)} />
          Listen
        </button>
        {showLink && (
          <Link to="/proverbs" className="brutal-button bg-primary flex items-center gap-2">
            More proverbs
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </section>
  );
}
