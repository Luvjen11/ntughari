import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSavedWords } from "@/hooks/useSavedWords";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { PracticeCard } from "@/components/practice/PracticeCard";
import { PracticeResult } from "@/components/practice/PracticeResult";
import { usePracticeSession } from "@/hooks/usePracticeSession";
import { Link } from "react-router-dom";

interface VocabWord {
  id: string;
  igbo_word: string;
  english_translation: string;
  example_sentence_igbo: string | null;
  example_sentence_english: string | null;
}

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

export default function FillGapPractice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const useMyWords = searchParams.get("source") === "my-words";
  const { savedWords } = useSavedWords();
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const { currentIndex, score, totalQuestions, isComplete, recordAnswer, saveSession, reset } = usePracticeSession("fill_gap");

  const { data: allVocabulary, isLoading: loadingAll } = useQuery({
    queryKey: ["vocabulary-fill-gap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, igbo_word, english_translation, example_sentence_igbo, example_sentence_english")
        .not("example_sentence_igbo", "is", null);
      if (error) throw error;
      return data as VocabWord[];
    },
    enabled: !useMyWords,
  });

  const { data: savedVocabulary, isLoading: loadingSaved } = useQuery({
    queryKey: ["vocabulary-fill-gap-saved", savedWords],
    queryFn: async () => {
      if (savedWords.length === 0) return [] as VocabWord[];
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, igbo_word, english_translation, example_sentence_igbo, example_sentence_english")
        .in("id", savedWords)
        .not("example_sentence_igbo", "is", null);
      if (error) throw error;
      return (data ?? []) as VocabWord[];
    },
    enabled: useMyWords && savedWords.length > 0,
  });

  const vocabulary = useMyWords ? (savedVocabulary ?? []) : (allVocabulary ?? []);
  const isLoading = useMyWords ? loadingSaved : loadingAll;

  useEffect(() => {
    if (vocabulary.length > 0) {
      const shuffled = shuffleArray([...vocabulary]);
      const selected = shuffled.slice(0, totalQuestions);
      const gapQuestions: GapQuestion[] = selected.map((word) => {
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
      setQuestions(gapQuestions);
    }
  }, [vocabulary, totalQuestions]);

  const handleRetry = () => {
    reset();
    if (vocabulary.length > 0) {
      const shuffled = shuffleArray([...vocabulary]);
      const selected = shuffled.slice(0, totalQuestions);
      const gapQuestions: GapQuestion[] = selected.map((word) => {
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
      setQuestions(gapQuestions);
    }
  };

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
            {useMyWords
              ? "Not enough saved words with example sentences. Save words that have examples from Vocabulary, then try again."
              : "Not enough vocabulary with example sentences. Please add more words with examples first."}
          </p>
          {useMyWords && (
            <p className="text-muted-foreground mb-4">
              <Link to="/my-words" className="font-semibold text-primary hover:underline">View My Words</Link>
              {" · "}
              <Link to="/vocabulary" className="font-semibold text-primary hover:underline">Vocabulary</Link>
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

        <h1 className="text-2xl font-bold mb-6">Fill the Gap</h1>

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
                prompt={`Fill in the blank: "${currentQuestion.sentence}"`}
                correctAnswer={currentQuestion.answer}
                hint={currentQuestion.hint}
                fullSentence={currentQuestion.sentence.replace("_____", currentQuestion.answer)}
                highlightWord={currentQuestion.answer}
                onAnswer={(correct) => recordAnswer(currentQuestion.id, correct)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
