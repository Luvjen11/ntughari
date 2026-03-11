import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { IgboCharacterPad } from "./IgboCharacterPad";

interface PracticeCardProps {
  prompt: string;
  correctAnswer: string;
  hint?: string;
  /** Full sentence for fill-the-gap: show after submit with correct word highlighted */
  fullSentence?: string;
  /** Word to highlight in fullSentence (e.g. the filled-in answer) */
  highlightWord?: string;
  onAnswer: (correct: boolean) => void;
}

export function PracticeCard({ prompt, correctAnswer, hint, fullSentence, highlightWord, onAnswer }: PracticeCardProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const correct = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    setIsCorrect(correct);
    setSubmitted(true);
  };

  const handleNext = () => {
    onAnswer(isCorrect);
    setUserAnswer("");
    setSubmitted(false);
    setIsCorrect(false);
  };

  const insertCharacter = (char: string) => {
    const input = inputRef.current;
    if (!input) return;
    
    const start = input.selectionStart ?? userAnswer.length;
    const end = input.selectionEnd ?? userAnswer.length;
    const newValue = userAnswer.slice(0, start) + char + userAnswer.slice(end);
    
    setUserAnswer(newValue);
    
    // Restore focus and cursor position after state update
    setTimeout(() => {
      input.focus();
      const newPos = start + char.length;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

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
          
          {submitted && (
            <div className={`p-4 rounded-lg border-2 ${isCorrect ? "bg-primary/10 border-primary" : "bg-accent/10 border-accent"}`}>
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
                  The answer is: <span className="font-medium text-foreground">{correctAnswer}</span>
                </p>
              )}
              {fullSentence && highlightWord && submitted && (
                <p className="text-sm mt-2">
                  Full sentence:{" "}
                  {fullSentence.split(highlightWord).map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && <mark className="bg-primary/30 font-medium rounded px-0.5">{highlightWord}</mark>}
                    </span>
                  ))}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2 italic">
                It's okay to be wrong — that's how we learn!
              </p>
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
