import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Mic, MicOff, Sparkles, Volume2, X } from "lucide-react";
import { gradeIgboSentence, type SentenceGradeResult } from "@/lib/gradeIgboSentence";
import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { useTTS } from "@/hooks/useTTS";

interface SpeakingDrillCardProps {
  targetWord: string;
  englishPrompt: string;
  referenceIgbo: string | null;
  recordedUrl?: string | null;
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
  recordedUrl,
  onAnswer,
}: SpeakingDrillCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState<SentenceGradeResult | null>(null);
  const { speakIgboWord, speakSentence, isSpeaking } = useTTS();
  const {
    isRecording,
    isTranscribing,
    transcript,
    error: captureError,
    toggleRecording,
    clearTranscript,
  } = useSpeechCapture();

  const handleSubmit = () => {
    if (transcript.trim()) {
      const result = gradeIgboSentence(transcript, targetWord, referenceIgbo, englishPrompt);
      setGrade(result);
      setSubmitted(true);
      return;
    }
    setSubmitted(true);
    setGrade({
      scorePercent: 70,
      feedbackTitle: "Self-check",
      feedbackLines: [
        "Listen to the model, then mark how you did.",
        referenceIgbo
          ? `Model: **${referenceIgbo}**`
          : `Try using **${targetWord}** in your sentence.`,
      ],
      aspects: {
        wordChoice: "unknown",
        spelling: "unknown",
        diacritics: "unknown",
        structure: "unknown",
      },
      correctedSentence: referenceIgbo,
    });
  };

  const handleSelfCheckGotIt = () => {
    onAnswer(85);
    setSubmitted(false);
    setGrade(null);
    clearTranscript();
  };

  const handleNext = () => {
    onAnswer(grade?.scorePercent ?? 0);
    setSubmitted(false);
    setGrade(null);
    clearTranscript();
  };

  const playModel = () => {
    if (referenceIgbo) {
      void speakSentence(referenceIgbo);
    } else {
      void speakIgboWord(targetWord, { recordedUrl });
    }
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
        <p className="text-sm text-muted-foreground mb-1">Say a sentence in Igbo using:</p>
        <p className="text-2xl font-bold text-primary mb-1">{targetWord}</p>
        <p className="text-lg font-medium mb-4">&ldquo;{englishPrompt}&rdquo;</p>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              onClick={toggleRecording}
              disabled={submitted || isTranscribing}
              className="border-2 flex-1 min-w-[140px]"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {isTranscribing ? "Transcribing…" : "Tap to speak"}
                </>
              )}
            </Button>
            {(referenceIgbo || targetWord) && (
              <Button
                type="button"
                variant="outline"
                onClick={playModel}
                disabled={isSpeaking || submitted}
                className="border-2"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Hear model
              </Button>
            )}
          </div>

          {isRecording && (
            <p className="text-sm text-destructive font-medium animate-pulse">Listening…</p>
          )}

          {captureError && !submitted && (
            <p className="text-sm text-muted-foreground">{captureError}</p>
          )}

          {transcript && !submitted && (
            <div className="rounded-lg border-2 border-foreground/20 bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">What we heard:</p>
              <p className="font-medium">{transcript}</p>
            </div>
          )}

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

              {transcript.trim() &&
                (["wordChoice", "spelling", "diacritics", "structure"] as const).map((key) => {
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
                    <span key={key} className={`inline-block mr-2 mb-2 px-2 py-0.5 rounded border text-xs ${color}`}>
                      {label}: {val}
                    </span>
                  );
                })}

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
            <div className="space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={isRecording || isTranscribing}
                className="w-full"
              >
                {transcript.trim() ? "Check my answer" : "Compare without transcript"}
              </Button>
              {!transcript.trim() && (
                <p className="text-xs text-center text-muted-foreground">
                  No transcript? Use compare to hear the model and mark yourself.
                </p>
              )}
            </div>
          ) : !transcript.trim() && submitted ? (
            <div className="flex gap-2">
              <Button onClick={handleSelfCheckGotIt} className="flex-1">
                I said it well
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setGrade(null);
                }}
                className="flex-1 border-2"
              >
                Try again
              </Button>
            </div>
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
