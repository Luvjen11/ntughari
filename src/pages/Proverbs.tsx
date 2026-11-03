import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { useProverbs } from "@/hooks/useProverbs";
import { ProverbCard } from "@/components/proverbs/ProverbCard";
import { ProverbOfTheDay } from "@/components/proverbs/ProverbOfTheDay";
import { PROVERB_THEMES, THEME_LABELS, type ProverbTheme } from "@/lib/proverbs";

export default function Proverbs() {
  const { data: proverbs, isLoading } = useProverbs();
  const [theme, setTheme] = useState<ProverbTheme | "all">("all");

  const visible = useMemo(
    () => (proverbs ?? []).filter((p) => theme === "all" || p.theme === theme),
    [proverbs, theme]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        <header className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Ilu · Proverbs</h1>
          <p className="text-muted-foreground max-w-prose">
            Proverbs carry Igbo wisdom in a few words. Elders use them to advise, to settle
            arguments, and to say a hard thing gently. Learn what each one says, what it
            means, and when people use it.
          </p>
        </header>

        <ProverbOfTheDay showLink={false} />

        <Link
          to="/practice/finish-the-proverb"
          className="brutal-card bg-card p-4 flex items-center gap-3 hover:border-primary"
        >
          <span className="w-10 h-10 rounded-lg border-2 border-foreground bg-primary flex items-center justify-center shrink-0">
            <Brain size={20} />
          </span>
          <span>
            <span className="block font-display font-bold">Finish the proverb</span>
            <span className="block text-sm text-muted-foreground">
              Hear the opening, then pick how it ends.
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by theme">
          {(["all", ...PROVERB_THEMES] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={`px-3 py-1.5 rounded-full border-2 border-foreground font-display text-sm font-semibold transition-colors ${
                theme === t ? "bg-primary shadow-brutal-sm" : "bg-card hover:bg-muted"
              }`}
            >
              {t === "all" ? "All" : `${THEME_LABELS[t].label} · ${THEME_LABELS[t].igbo}`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="brutal-card bg-muted p-8 animate-pulse">
            <p className="font-display font-bold">Loading proverbs…</p>
          </div>
        ) : visible.length > 0 ? (
          <div className="space-y-4">
            {visible.map((p) => (
              <ProverbCard key={p.id} proverb={p} />
            ))}
          </div>
        ) : (
          <div className="brutal-card bg-muted p-8 text-center">
            <p className="font-display text-xl font-bold mb-2">No proverbs here yet</p>
            <p className="text-muted-foreground">
              {theme === "all"
                ? "Proverbs are being prepared. Check back soon."
                : "Try another theme."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
