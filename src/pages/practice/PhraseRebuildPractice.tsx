import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Check, X, RotateCcw } from "lucide-react";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { PracticeResult } from "@/components/practice/PracticeResult";
import { usePracticeSession } from "@/hooks/usePracticeSession";

interface Phrase {
  id: string;
  igbo_phrase: string;
  english_translation: string;
}

interface PhrasePart {
  id: string;
  phrase_id: string;
  igbo_word: string;
  order_index: number;
}

interface RebuildQuestion {
  id: string;
  english: string;
  correctOrder: string[];
  shuffledParts: string[];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function PhraseRebuildPractice() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<RebuildQuestion[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const { currentIndex, score, totalQuestions, isComplete, recordAnswer, saveSession, reset } = usePracticeSession("phrase_rebuild");

  const { data: phrases, isLoading: phrasesLoading } = useQuery({
    queryKey: ["phrases-practice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phrases")
        .select("id, igbo_phrase, english_translation");
      if (error) throw error;
      return data as Phrase[];
    },
  });

  const { data: phraseParts, isLoading: partsLoading } = useQuery({
    queryKey: ["phrase-parts-practice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phrase_parts")
        .select("id, phrase_id, igbo_word, order_index")
        .order("order_index");
      if (error) throw error;
      return data as PhrasePart[];
    },
  });

  useEffect(() => {
    if (phrases && phraseParts && phrases.length > 0) {
      const phrasesWithParts = phrases.filter((phrase) =>
        phraseParts.some((part) => part.phrase_id === phrase.id)
      );

      const shuffled = shuffleArray(phrasesWithParts);
      const selected = shuffled.slice(0, Math.min(totalQuestions, shuffled.length));

      const rebuildQuestions: RebuildQuestion[] = selected.map((phrase) => {
        const parts = phraseParts
          .filter((p) => p.phrase_id === phrase.id)
          .sort((a, b) => a.order_index - b.order_index);
        
        const correctOrder = parts.map((p) => p.igbo_word);
        const shuffledParts = shuffleArray(correctOrder);

        return {
          id: phrase.id,
          english: phrase.english_translation,
          correctOrder,
          shuffledParts,
        };
      });

      setQuestions(rebuildQuestions);
    }
  }, [phrases, phraseParts, totalQuestions]);

  useEffect(() => {
    if (questions[currentIndex]) {
      setAvailableParts([...questions[currentIndex].shuffledParts]);
      setSelectedParts([]);
      setSubmitted(false);
      setIsCorrect(false);
    }
  }, [currentIndex, questions]);

  const addPart = (part: string, index: number) => {
    setSelectedParts([...selectedParts, part]);
    setAvailableParts(availableParts.filter((_, i) => i !== index));
  };

  const removePart = (part: string, index: number) => {
    setAvailableParts([...availableParts, part]);
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    const currentQuestion = questions[currentIndex];
    const correct = selectedParts.join(" ") === currentQuestion.correctOrder.join(" ");
    setIsCorrect(correct);
    setSubmitted(true);
  };

  const handleNext = () => {
    recordAnswer(questions[currentIndex].id, isCorrect);
  };

  const handleReset = () => {
    if (questions[currentIndex]) {
      setAvailableParts([...questions[currentIndex].shuffledParts]);
      setSelectedParts([]);
    }
  };

  const handleRetry = () => {
    reset();
    if (phrases && phraseParts) {
      const phrasesWithParts = phrases.filter((phrase) =>
        phraseParts.some((part) => part.phrase_id === phrase.id)
      );

      const shuffled = shuffleArray(phrasesWithParts);
      const selected = shuffled.slice(0, Math.min(totalQuestions, shuffled.length));

      const rebuildQuestions: RebuildQuestion[] = selected.map((phrase) => {
        const parts = phraseParts
          .filter((p) => p.phrase_id === phrase.id)
          .sort((a, b) => a.order_index - b.order_index);
        
        const correctOrder = parts.map((p) => p.igbo_word);
        const shuffledParts = shuffleArray(correctOrder);

        return {
          id: phrase.id,
          english: phrase.english_translation,
          correctOrder,
          shuffledParts,
        };
      });

      setQuestions(rebuildQuestions);
    }
  };

  const isLoading = phrasesLoading || partsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const phrasesWithParts = phrases?.filter((phrase) =>
    phraseParts?.some((part) => part.phrase_id === phrase.id)
  ) || [];

  if (phrasesWithParts.length < 1) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">
            Not enough phrases with breakdowns to practice. Please add more phrases first.
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

        <h1 className="text-2xl font-bold mb-6">Phrase Rebuild</h1>

        {isComplete ? (
          <PracticeResult
            score={score}
            total={Math.min(totalQuestions, phrasesWithParts.length)}
            onRetry={handleRetry}
            onSave={saveSession}
          />
        ) : currentQuestion ? (
          <>
            <PracticeProgress current={currentIndex} total={Math.min(totalQuestions, phrasesWithParts.length)} />
            
            <Card className="border-2 border-border">
              <CardContent className="p-6">
                <p className="text-lg font-medium mb-2">Build the Igbo phrase for:</p>
                <p className="text-xl text-primary mb-6">"{currentQuestion.english}"</p>

                {/* Selected parts area */}
                <div className="min-h-[60px] p-4 mb-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
                  <div className="flex flex-wrap gap-2">
                    {selectedParts.map((part, index) => (
                      <Button
                        key={`selected-${index}`}
                        variant="secondary"
                        size="sm"
                        onClick={() => !submitted && removePart(part, index)}
                        disabled={submitted}
                        className="border-2"
                      >
                        {part}
                      </Button>
                    ))}
                    {selectedParts.length === 0 && (
                      <span className="text-muted-foreground text-sm">
                        Click words below to build the phrase
                      </span>
                    )}
                  </div>
                </div>

                {/* Available parts */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {availableParts.map((part, index) => (
                    <Button
                      key={`available-${index}`}
                      variant="outline"
                      size="sm"
                      onClick={() => addPart(part, index)}
                      disabled={submitted}
                      className="border-2"
                    >
                      {part}
                    </Button>
                  ))}
                </div>

                {submitted && (
                  <div className={`p-4 rounded-lg border-2 mb-4 ${isCorrect ? "bg-primary/10 border-primary" : "bg-accent/10 border-accent"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <>
                          <Check className="h-5 w-5 text-primary" />
                          <span className="font-medium text-primary">Correct!</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-accent" />
                          <span className="font-medium text-accent">Not quite</span>
                        </>
                      )}
                    </div>
                    {!isCorrect && (
                      <p className="text-sm text-muted-foreground">
                        The correct order is: <span className="font-medium text-foreground">{currentQuestion.correctOrder.join(" ")}</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      It's okay to be wrong — that's how we learn!
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  {!submitted ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={selectedParts.length === 0}
                        className="border-2"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button
                        onClick={handleCheck}
                        disabled={availableParts.length > 0}
                        className="flex-1"
                      >
                        Check Answer
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleNext} className="w-full">
                      Continue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
