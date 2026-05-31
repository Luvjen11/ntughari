import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, X } from "lucide-react";
import { IgboCharacterPad } from "./IgboCharacterPad";
import { gradeIgboSentence, type SentenceGradeResult } from "@/lib/gradeIgboSentence";

interface SpeakingDrillCardProps {
  targetWord: string;
  englishPrompt: string;
  referenceIgbo: string | null;
  onAnswer: (scorePercent: number) => void;
}

function renderFeedback(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function SpeakingDrillCard({
  targetWord,
  englishPrompt,
  referenceIgbo,
  onAnswer,
}: SpeakingDrillCardProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState<SentenceGradeResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const result = gradeIgboSentence(userAnswer, targetWord, referenceIgbo, englishPrompt);
    setGrade(result);
    setSubmitted(true);
  };

  const handleNext = () => {
    onAnswer(grade?.scorePercent ?? 0);
    setUserAnswer("");
    setSubmitted(false);
    setGrade(null);
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
      input.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  const isStrong = (grade?.scorePercent ?? 0) >= 75;
  const feedbackStyles = isStrong
    ? "bg-primary/10 border-primary"
    : (grade?.scorePercent ?? 0) >= 50
      ? "bg-amber-500/10 border-amber-500"
      : "bg-accent/10 border-accent";

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground mb-1">Use this word in Igbo:</p>
        <p className="text-2xl font-bold text-primary mb-1">{targetWord}</p>
        <p className="text-lg font-medium mb-4">&ldquo;{englishPrompt}&rdquo;</p>

        <div className="space-y-4">
          <Input
            ref={inputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your Igbo sentence..."
            disabled={submitted}
            onKeyDown={(e) => e.key === "Enter" && !submitted && userAnswer.trim() && handleSubmit()}
            className="border-2"
          />

          <IgboCharacterPad onCharacterClick={insertCharacter} disabled={submitted} />

          {submitted && grade && (
            <div className={`p-4 rounded-lg border-2 ${feedbackStyles}`}>
              <div className="flex items-center gap-2 mb-2">
                {isStrong ? (
                  <>
                    <Check className="h-5 w-5 text-primary" />
                    <span className="font-medium text-primary">{renderFeedback(grade.feedbackTitle)}</span>
                  </>
                ) : (grade.scorePercent ?? 0) >= 50 ? (
                  <>
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {renderFeedback(grade.feedbackTitle)}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-accent" />
                    <span className="font-medium text-accent">{renderFeedback(grade.feedbackTitle)}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                {(["wordChoice", "spelling", "diacritics", "structure"] as const).map((key) => {
                  const val = grade.aspects[key];
                  if (val === "unknown") return null;
                  const label =
                    key === "wordChoice"
                      ? "Word choice"
                      : key === "spelling"
                        ? "Spelling"
                        : key === "diacritics"
                          ? "Diacritics"
                          : "Structure";
                  const color =
                    val === "good"
                      ? "bg-primary/20 text-primary"
                      : val === "partial"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-muted text-muted-foreground";
                  return (
                    <span key={key} className={`px-2 py-0.5 rounded border ${color}`}>
                      {label}: {val}
                    </span>
                  );
                })}
              </div>

              {grade.feedbackLines.map((line, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-1">
                  {renderFeedback(line)}
                </p>
              ))}

              {grade.correctedSentence && !isStrong && (
                <p className="text-sm mt-2">
                  Model sentence:{" "}
                  <span className="font-medium text-foreground">{grade.correctedSentence}</span>
                </p>
              )}

              <p className="text-sm text-muted-foreground mt-2">{grade.scorePercent}% for this prompt</p>
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
