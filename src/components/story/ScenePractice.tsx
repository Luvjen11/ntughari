import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";

interface Word {
  id: string;
  igbo_word: string;
  english_translation: string;
  example_sentence_igbo: string | null;
}

interface ScenePracticeProps {
  words: Word[];
  onComplete: () => void;
  onSkip: () => void;
}

export function ScenePractice({ words, onComplete, onSkip }: ScenePracticeProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Pick a random word for fill-the-gap
  const practiceWord = useMemo(() => {
    if (words.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }, [words]);

  if (!practiceWord) {
    return null;
  }

  // Create a simple fill-the-gap: "What is ___ in Igbo?"
  const prompt = `What is "${practiceWord.english_translation}" in Igbo?`;
  const correctAnswer = practiceWord.igbo_word.toLowerCase().trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userAnswerNormalized = userAnswer.toLowerCase().trim();
    const correct = userAnswerNormalized === correctAnswer;
    setIsCorrect(correct);
    setHasSubmitted(true);
  };

  const handleContinue = () => {
    onComplete();
  };

  return (
    <Card className="border-2 border-border shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground text-center">
          Quick practice
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          One question. No pressure.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-lg text-foreground">{prompt}</p>
        </div>

        {!hasSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="text-center text-lg border-2"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                type="submit"
                disabled={!userAnswer.trim()}
                className="flex-1 border-2"
              >
                Check
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {isCorrect ? (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-semibold text-lg">Nice!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <XCircle className="h-5 w-5" />
                  <span>Not quite</span>
                </div>
                <p className="text-center text-foreground">
                  The answer was:{" "}
                  <span className="font-bold text-primary">
                    {practiceWord.igbo_word}
                  </span>
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  It's okay — this is how we learn.
                </p>
              </div>
            )}

            <Button onClick={handleContinue} className="w-full border-2">
              Continue →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
