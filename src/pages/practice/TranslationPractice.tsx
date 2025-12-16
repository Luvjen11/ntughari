import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { PracticeCard } from "@/components/practice/PracticeCard";
import { PracticeResult } from "@/components/practice/PracticeResult";
import { usePracticeSession } from "@/hooks/usePracticeSession";

interface VocabWord {
  id: string;
  english_translation: string;
  igbo_word: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function TranslationPractice() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<VocabWord[]>([]);
  const { currentIndex, score, totalQuestions, isComplete, recordAnswer, saveSession, reset } = usePracticeSession("translation");

  const { data: vocabulary, isLoading } = useQuery({
    queryKey: ["vocabulary-practice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, english_translation, igbo_word");
      if (error) throw error;
      return data as VocabWord[];
    },
  });

  useEffect(() => {
    if (vocabulary && vocabulary.length > 0) {
      const shuffled = shuffleArray(vocabulary);
      setQuestions(shuffled.slice(0, totalQuestions));
    }
  }, [vocabulary, totalQuestions]);

  const handleRetry = () => {
    reset();
    if (vocabulary) {
      const shuffled = shuffleArray(vocabulary);
      setQuestions(shuffled.slice(0, totalQuestions));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vocabulary || vocabulary.length < totalQuestions) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            Not enough vocabulary words to practice. Please add more words first.
          </p>
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

        <h1 className="text-2xl font-bold mb-6">English → Igbo Translation</h1>

        {isComplete ? (
          <PracticeResult
            score={score}
            total={totalQuestions}
            onRetry={handleRetry}
            onSave={saveSession}
          />
        ) : (
          <>
            <PracticeProgress current={currentIndex} total={totalQuestions} />
            {currentQuestion && (
              <PracticeCard
                prompt={`What is "${currentQuestion.english_translation}" in Igbo?`}
                correctAnswer={currentQuestion.igbo_word}
                onAnswer={(correct) => recordAnswer(currentQuestion.id, correct)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
