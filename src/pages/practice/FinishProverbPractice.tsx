import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { AudioStateIcon } from "@/components/AudioStateIcon";
import { audioStateFor } from "@/lib/audioState";
import { Button } from "@/components/ui/button";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { PracticeResult } from "@/components/practice/PracticeResult";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { useProverbs } from "@/hooks/useProverbs";
import { useSpeakProverb } from "@/hooks/useSpeakProverb";
import type { Proverb } from "@/lib/proverbs";

const OPTIONS_PER_QUESTION = 4;

interface ProverbQuestion {
  proverb: Proverb;
  options: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Each question offers the true ending plus endings borrowed from other proverbs. */
function buildQuestions(proverbs: Proverb[], count: number): ProverbQuestion[] {
  return shuffle(proverbs)
    .slice(0, count)
    .map((proverb) => {
      const distractors = shuffle(
        proverbs.filter((p) => p.id !== proverb.id && p.igbo_second !== proverb.igbo_second)
      )
        .slice(0, OPTIONS_PER_QUESTION - 1)
        .map((p) => p.igbo_second);
      return { proverb, options: shuffle([proverb.igbo_second, ...distractors]) };
    });
}

export default function FinishProverbPractice() {
  const navigate = useNavigate();
  const { data: proverbs, isLoading } = useProverbs();
  const { speakProverb, audioState, speakSentence, tts } = useSpeakProverb();
  const [questions, setQuestions] = useState<ProverbQuestion[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const { currentIndex, score, maxScore, totalQuestions, isComplete, recordAnswer, saveSession, reset } =
    usePracticeSession("finish_proverb");

  const enough = (proverbs?.length ?? 0) >= Math.max(totalQuestions, OPTIONS_PER_QUESTION);

  useEffect(() => {
    if (proverbs && enough) setQuestions(buildQuestions(proverbs, totalQuestions));
  }, [proverbs, enough, totalQuestions]);

  const current = questions[currentIndex];

  const playOpening = useCallback(() => {
    if (current) void speakSentence(current.proverb.igbo_first, { igbo: true });
  }, [current, speakSentence]);

  const handleNext = () => {
    if (!current || chosen === null) return;
    recordAnswer(current.proverb.id, chosen === current.proverb.igbo_second ? 100 : 0);
    setChosen(null);
  };

  const handleRetry = () => {
    reset();
    setChosen(null);
    if (proverbs) setQuestions(buildQuestions(proverbs, totalQuestions));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enough) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <p className="text-muted-foreground">
            There aren't enough proverbs yet for this practice. It needs at least{" "}
            {Math.max(totalQuestions, OPTIONS_PER_QUESTION)}.
          </p>
          <Button onClick={() => navigate("/proverbs")}>Browse proverbs</Button>
        </div>
      </div>
    );
  }

  const answered = chosen !== null;
  const correct = answered && chosen === current?.proverb.igbo_second;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/practice")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Practice Hub
        </Button>

        <h1 className="text-2xl font-bold mb-2">Finish the Proverb</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Read or listen to the opening, then choose how the proverb ends.{" "}
          <Link to="/proverbs" className="font-semibold text-primary hover:underline">
            Browse all proverbs
          </Link>
        </p>

        {isComplete ? (
          <PracticeResult
            score={score}
            maxScore={maxScore}
            total={totalQuestions}
            onRetry={handleRetry}
            onSave={saveSession}
          />
        ) : (
          current && (
            <>
              <PracticeProgress current={currentIndex} total={totalQuestions} />
              <div className="brutal-card bg-card p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-2xl font-bold leading-snug">
                    {current.proverb.igbo_first} <span className="text-muted-foreground">…</span>
                  </p>
                  <button
                    type="button"
                    onClick={playOpening}
                    className="brutal-button bg-primary p-2 shrink-0 disabled:opacity-60"
                    aria-label="Listen to the opening"
                  >
                    <AudioStateIcon state={audioStateFor(current.proverb.igbo_first, tts)} size={20} />
                  </button>
                </div>

                <div className="grid gap-3" role="group" aria-label="Choose the ending">
                  {current.options.map((option) => {
                    const isAnswer = option === current.proverb.igbo_second;
                    const isPicked = option === chosen;
                    const state = !answered
                      ? "bg-card hover:bg-muted"
                      : isAnswer
                        ? "bg-green-200 dark:bg-green-900/60"
                        : isPicked
                          ? "bg-secondary"
                          : "bg-card opacity-60";
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={answered}
                        onClick={() => setChosen(option)}
                        className={`text-left p-4 rounded-lg border-2 border-foreground font-display font-semibold flex items-center justify-between gap-3 ${state}`}
                      >
                        <span>{option}</span>
                        {answered && isAnswer && <Check size={20} className="shrink-0" />}
                        {answered && isPicked && !isAnswer && <X size={20} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <div className="space-y-3 border-t-2 border-foreground/10 pt-4">
                    <p className="font-display font-bold">
                      {correct ? "Ọ dị mma! That's right." : "Not quite. Here's the whole proverb:"}
                    </p>
                    <p className="font-display text-lg">
                      {current.proverb.igbo_first} {current.proverb.igbo_second}
                    </p>
                    <p className="italic text-muted-foreground">{current.proverb.literal_translation}</p>
                    <p>{current.proverb.meaning}</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => speakProverb(current.proverb)}
                        className="brutal-button bg-card flex items-center gap-2 disabled:opacity-60"
                      >
                        <AudioStateIcon state={audioState(current.proverb)} />
                        Listen
                      </button>
                      <button type="button" onClick={handleNext} className="brutal-button bg-primary flex-1">
                        {currentIndex + 1 >= totalQuestions ? "See results" : "Next proverb"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
