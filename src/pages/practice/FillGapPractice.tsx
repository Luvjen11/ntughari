import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { PracticeCard } from "@/components/practice/PracticeCard";
import { PracticeResult } from "@/components/practice/PracticeResult";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { usePracticeVocabulary } from "@/hooks/usePracticeVocabulary";

interface GapQuestion {
  id: string;
  sentence: string;
  answer: string;
  hint: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildGapQuestions(vocabulary: ReturnType<typeof usePracticeVocabulary>["vocabulary"], count: number): GapQuestion[] {
  const shuffled = shuffleArray([...vocabulary]);
  return shuffled.slice(0, count).map((word) => {
    const sentence = word.example_sentence_igbo || "";
    const gappedSentence = sentence.replace(
      new RegExp(word.igbo_word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      "_____"
    );
    return {
      id: word.id,
      sentence: gappedSentence,
      answer: word.igbo_word,
      hint: word.english_translation,
    };
  });
}

export default function FillGapPractice() {
  const navigate = useNavigate();
  const { vocabulary, isLoading, source } = usePracticeVocabulary({ includeExamples: true });
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const { currentIndex, score, maxScore, totalQuestions, isComplete, recordAnswer, saveSession, reset } =
    usePracticeSession("fill_gap");

  useEffect(() => {
    if (vocabulary.length > 0) {
      setQuestions(buildGapQuestions(vocabulary, totalQuestions));
    }
  }, [vocabulary, totalQuestions]);

  const handleRetry = () => {
    reset();
    if (vocabulary.length > 0) {
      setQuestions(buildGapQuestions(vocabulary, totalQuestions));
    }
  };

  const sourceLabel =
    source === "my-words"
      ? "saved words"
      : source === "category"
        ? "this category"
        : "vocabulary";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (vocabulary.length < totalQuestions) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            {source === "my-words"
              ? "Not enough saved words with example sentences. Save words that have examples from Vocabulary, then try again."
              : source === "category"
                ? "Not enough words with example sentences in this category. Try another category or all vocabulary."
                : "Not enough vocabulary with example sentences. Please add more words with examples first."}
          </p>
          {source === "my-words" && (
            <p className="text-muted-foreground mb-4">
              <Link to="/practice/my-words" className="font-semibold text-primary hover:underline">
                View My Words
              </Link>
              {" · "}
              <Link to="/vocabulary" className="font-semibold text-primary hover:underline">
                Vocabulary
              </Link>
            </p>
          )}
          <Button onClick={() => navigate("/practice")}>Back to Practice Hub</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/practice")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Practice Hub
        </Button>

        <h1 className="text-2xl font-bold mb-2">Fill the Gap</h1>
        <p className="text-sm text-muted-foreground mb-6 capitalize">Practicing from {sourceLabel}</p>

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
            {currentQuestion && (
              <PracticeCard
                prompt={`Fill in the blank: "${currentQuestion.sentence}"`}
                correctAnswer={currentQuestion.answer}
                hint={currentQuestion.hint}
                fullSentence={currentQuestion.sentence.replace("_____", currentQuestion.answer)}
                highlightWord={currentQuestion.answer}
                graded
                onAnswer={(scorePercent) => recordAnswer(currentQuestion.id, scorePercent)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
