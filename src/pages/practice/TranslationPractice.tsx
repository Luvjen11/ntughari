import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWordById, type IgboApiWord } from "@/lib/igboApi";
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
  english_translation: string;
  igbo_word: string;
}

function firstDef(w: IgboApiWord): string {
  const d = w.definitions;
  if (!Array.isArray(d) || d.length === 0) return "";
  const first = d[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && Array.isArray((first as { definitions?: string[] }).definitions))
    return (first as { definitions: string[] }).definitions[0] ?? "";
  return "";
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
  const [searchParams] = useSearchParams();
  const useMyWords = searchParams.get("source") === "my-words";
  const { savedWords, savedApiWordIds } = useSavedWords();
  const [questions, setQuestions] = useState<VocabWord[]>([]);
  const { currentIndex, score, totalQuestions, isComplete, recordAnswer, saveSession, reset } = usePracticeSession("translation");

  const { data: allVocabulary, isLoading: loadingAll } = useQuery({
    queryKey: ["vocabulary-practice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, english_translation, igbo_word");
      if (error) throw error;
      return data as VocabWord[];
    },
    enabled: !useMyWords,
  });

  const { data: savedVocabRows, isLoading: loadingSavedVocab } = useQuery({
    queryKey: ["vocabulary-practice-saved", savedWords],
    queryFn: async () => {
      if (savedWords.length === 0) return [] as VocabWord[];
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, english_translation, igbo_word")
        .in("id", savedWords);
      if (error) throw error;
      return (data ?? []) as VocabWord[];
    },
    enabled: useMyWords && savedWords.length > 0,
  });

  const { data: apiWords, isLoading: loadingApi } = useQuery({
    queryKey: ["vocabulary-practice-api", savedApiWordIds],
    queryFn: async () => {
      if (savedApiWordIds.length === 0) return [] as IgboApiWord[];
      const results = await Promise.all(savedApiWordIds.map((id) => getWordById(id)));
      return results
        .filter((r): r is { word: IgboApiWord } => r.word != null)
        .map((r) => r.word);
    },
    enabled: useMyWords && savedApiWordIds.length > 0,
  });

  const vocabulary = useMemo(
    () =>
      useMyWords
        ? [
            ...(savedVocabRows ?? []),
            ...(apiWords ?? []).map((w) => ({
              id: `api-${w.id}`,
              english_translation: firstDef(w) || w.word,
              igbo_word: w.word,
            })),
          ]
        : allVocabulary ?? [],
    [useMyWords, savedVocabRows, apiWords, allVocabulary]
  );

  const isLoading = useMyWords ? (loadingSavedVocab || loadingApi) : loadingAll;

  useEffect(() => {
    if (vocabulary.length > 0) {
      const shuffled = shuffleArray([...vocabulary]);
      setQuestions(shuffled.slice(0, totalQuestions));
    }
  }, [vocabulary, totalQuestions]);

  const handleRetry = () => {
    reset();
    if (vocabulary.length > 0) {
      const shuffled = shuffleArray([...vocabulary]);
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

  if (vocabulary.length < totalQuestions) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            {useMyWords
              ? "Not enough saved words to practice. Save at least 5 words from Vocabulary or the Dictionary, then try again."
              : "Not enough vocabulary words to practice. Please add more words first."}
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
