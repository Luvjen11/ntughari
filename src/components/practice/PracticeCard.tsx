import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, X } from "lucide-react";
import { IgboCharacterPad } from "./IgboCharacterPad";
import { gradeIgboAnswer, type IgboGradeResult } from "@/lib/gradeIgboAnswer";

interface PracticeCardProps {
  prompt: string;
  correctAnswer: string;
  hint?: string;
  /** Full sentence for fill-the-gap: show after submit with correct word highlighted */
  fullSentence?: string;
  /** Word to highlight in fullSentence (e.g. the filled-in answer) */
  highlightWord?: string;
  /** Use partial-credit Igbo grading instead of exact match */
  graded?: boolean;
  onAnswer: (scorePercent: number) => void;
}

export function PracticeCard({
  prompt,
  correctAnswer,
  hint,
  fullSentence,
  highlightWord,
  graded = false,
  onAnswer,
}: PracticeCardProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState<IgboGradeResult | null>(null);
  const [isExactMatch, setIsExactMatch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (graded) {
      const result = gradeIgboAnswer(userAnswer, correctAnswer);
      setGrade(result);
      setIsExactMatch(result.tier === "exact");
    } else {
      const exact = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      setIsExactMatch(exact);
      setGrade(
        exact
          ? { tier: "exact", scorePercent: 100, feedbackTitle: "Correct!", showCorrectAnswer: false }
          : { tier: "wrong", scorePercent: 0, feedbackTitle: "Not quite", showCorrectAnswer: true }
      );
    }
    setSubmitted(true);
  };

  const handleNext = () => {
    onAnswer(grade?.scorePercent ?? 0);
    setUserAnswer("");
    setSubmitted(false);
    setGrade(null);
    setIsExactMatch(false);
  };

  const insertCharacter = (char: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? userAnswer.length;
    const end = input.selectionEnd ?? userAnswer.length;
    const newValue = userAnswer.slice(0, start) + char + userAnswer.slice(end);

    setUserAnswer(newValue);

    setTimeout(() => {
      input.focus();
      const newPos = start + char.length;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const feedbackStyles = isExactMatch
    ? "bg-primary/10 border-primary"
    : grade?.tier === "missing_diacritics"
      ? "bg-amber-500/10 border-amber-500"
      : grade?.tier === "close"
        ? "bg-blue-500/10 border-blue-500"
        : "bg-accent/10 border-accent";

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-6">
        <p className="text-lg font-medium mb-4">{prompt}</p>
        {hint && (
          <p className="text-sm text-muted-foreground mb-4">Hint: {hint}</p>
        )}

        <div className="space-y-4">
          <Input
            ref={inputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={submitted}
            onKeyDown={(e) => e.key === "Enter" && !submitted && handleSubmit()}
            className="border-2"
          />

          <IgboCharacterPad
            onCharacterClick={insertCharacter}
            disabled={submitted}
          />

          {submitted && grade && (
            <div className={`p-4 rounded-lg border-2 ${feedbackStyles}`}>
              <div className="flex items-center gap-2 mb-2">
                {isExactMatch ? (
                  <>
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-medium text-primary">{grade.feedbackTitle}</span>
                  </>
                ) : grade.tier === "missing_diacritics" ? (
                  <>
                    <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {grade.feedbackTitle}
                    </span>
                  </>
                ) : grade.tier === "close" ? (
                  <>
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      {grade.feedbackTitle}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-accent" />
                    <span className="font-medium text-accent">{grade.feedbackTitle}</span>
                  </>
                )}
              </div>
              {grade.showCorrectAnswer && (
                <p className="text-sm text-muted-foreground">
                  {grade.tier === "missing_diacritics" ? (
                    <>
                      The correct spelling is:{" "}
                      <span className="font-medium text-foreground">{correctAnswer}</span>
                    </>
                  ) : (
                    <>
                      The answer is:{" "}
                      <span className="font-medium text-foreground">{correctAnswer}</span>
                    </>
                  )}
                </p>
              )}
              {graded && grade.scorePercent < 100 && grade.scorePercent > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Partial credit: {grade.scorePercent}%
                </p>
              )}
              {fullSentence && highlightWord && submitted && (
                <p className="text-sm mt-2">
                  Full sentence:{" "}
                  {fullSentence.split(highlightWord).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <mark className="bg-primary/30 font-medium rounded px-0.5">{highlightWord}</mark>
                      )}
                    </span>
                  ))}
                </p>
              )}
              {!isExactMatch && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  It's okay to be wrong — that's how we learn!
                </p>
              )}
            </div>
          )}

          {!submitted ? (
            <Button onClick={handleSubmit} disabled={!userAnswer.trim()} className="w-full">
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNext} className="w-full">
              Continue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
