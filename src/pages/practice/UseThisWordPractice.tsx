import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { SpeakingDrillCard } from "@/components/practice/SpeakingDrillCard";
import { PracticeResult } from "@/components/practice/PracticeResult";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { usePracticeVocabulary } from "@/hooks/usePracticeVocabulary";
import { useTTS } from "@/hooks/useTTS";
import { generateSpeakingDrills, type SpeakingDrill } from "@/lib/speakingDrill";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function UseThisWordPractice() {
  const navigate = useNavigate();
  const { vocabulary, isLoading, source } = usePracticeVocabulary({ includeExamples: true });
  const { speakIgboWord, isSpeaking } = useTTS();
  const [focusWord, setFocusWord] = useState<(typeof vocabulary)[0] | null>(null);
  const [drills, setDrills] = useState<SpeakingDrill[]>([]);
  const { currentIndex, score, maxScore, totalQuestions, isComplete, recordAnswer, saveSession, reset } =
    usePracticeSession("use_this_word");

  useEffect(() => {
    if (vocabulary.length > 0 && !focusWord) {
      const shuffled = shuffleArray([...vocabulary]);
      const word = shuffled[0];
      setFocusWord(word);
      setDrills(generateSpeakingDrills(word, totalQuestions));
    }
  }, [vocabulary, focusWord, totalQuestions]);

  const handleRetry = () => {
    reset();
    if (vocabulary.length > 0) {
      const shuffled = shuffleArray([...vocabulary]);
      const word = shuffled[0];
      setFocusWord(word);
      setDrills(generateSpeakingDrills(word, totalQuestions));
    }
  };

  const sourceLabel = useMemo(() => {
    if (source === "my-words") return "saved words";
    if (source === "category") return "this category";
    return "vocabulary";
  }, [source]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (vocabulary.length < 1) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            Add vocabulary words to start the speaking drill.
          </p>
          <Button onClick={() => navigate("/practice")}>Back to Practice Hub</Button>
        </div>
      </div>
    );
  }

  const currentDrill = drills[currentIndex];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/practice")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Practice Hub
        </Button>

        <h1 className="text-2xl font-bold mb-1">Use This Word</h1>
        <p className="text-sm text-muted-foreground mb-4 capitalize">
          Daily speaking drill from {sourceLabel} — tap the mic and answer in Igbo out loud
        </p>

        {focusWord && !isComplete && (
          <div className="mb-6 brutal-card bg-secondary/30 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Today&apos;s word</p>
              <p className="text-2xl font-bold">{focusWord.igbo_word}</p>
              <p className="text-muted-foreground text-sm">{focusWord.english_translation}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={isSpeaking}
              onClick={() =>
                speakIgboWord(focusWord.igbo_word, {
                  recordedUrl: focusWord.audio_url,
                })
              }
              className="border-2 shrink-0"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        )}

        {isComplete ? (
          <PracticeResult
            score={score}
            maxScore={maxScore}
            total={totalQuestions}
            onRetry={handleRetry}
            onSave={saveSession}
          />
        ) : (
          <>
            <PracticeProgress current={currentIndex} total={totalQuestions} />
            {currentDrill && focusWord && (
              <SpeakingDrillCard
                targetWord={focusWord.igbo_word}
                englishPrompt={currentDrill.englishPrompt}
                glossHint={currentDrill.glossHint}
                referenceIgbo={currentDrill.referenceIgbo}
                recordedUrl={focusWord.audio_url}
                onAnswer={(scorePercent) => recordAnswer(currentDrill.id, scorePercent)}
              />
            )}
          </>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{" "}
          <Link to="/practice/my-words" className="text-primary font-semibold hover:underline">
            Review My Words
          </Link>
        </p>
      </div>
    </div>
  );
}
