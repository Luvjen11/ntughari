import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Mic, MicOff, Sparkles, Volume2, X } from "lucide-react";
import type { SentenceGradeResult } from "@/lib/gradeIgboSentence";
import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { useSpeakingFeedback } from "@/hooks/useSpeakingFeedback";
import { useTTS } from "@/hooks/useTTS";

interface SpeakingDrillCardProps {
  targetWord: string;
  englishPrompt: string;
  glossHint?: string;
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
  glossHint,
  referenceIgbo,
  recordedUrl,
  onAnswer,
}: SpeakingDrillCardProps) {
  const [submitted, setSubmitted] = useState(false);
  const [grade, setGrade] = useState<SentenceGradeResult | null>(null);
  const [feedbackSource, setFeedbackSource] = useState<string | null>(null);
  const { speakIgboWord, speakSentence, isSpeaking } = useTTS();
  const speakingFeedback = useSpeakingFeedback();
  const {
    isRecording,
    isTranscribing,
    transcript,
    setTranscript,
    error: captureError,
    toggleRecording,
    clearTranscript,
  } = useSpeechCapture();

  const isGrading = speakingFeedback.isPending;

  const handleSubmit = async () => {
    if (transcript.trim()) {
      setSubmitted(true);
      setGrade(null);
      setFeedbackSource(null);
      try {
        const result = await speakingFeedback.mutateAsync({
          userSentence: transcript.trim(),
          targetWord,
          englishPrompt,
          referenceIgbo,
          glossHint,
        });
        setGrade(result);
        setFeedbackSource(result.source ?? null);
      } catch {
        setSubmitted(false);
      }
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
    setFeedbackSource("self-check");
  };

  const handleSelfCheckGotIt = () => {
    onAnswer(85);
    setSubmitted(false);
    setGrade(null);
    setFeedbackSource(null);
    clearTranscript();
  };

  const handleNext = () => {
    onAnswer(grade?.scorePercent ?? 0);
    setSubmitted(false);
    setGrade(null);
    setFeedbackSource(null);
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
        <p className="text-sm text-muted-foreground mb-2">Say this in Igbo:</p>
        <p className="text-lg font-medium leading-relaxed mb-3">{englishPrompt}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Use <span className="font-bold text-primary">{targetWord}</span>
          {glossHint ? ` (${glossHint})` : ""}
        </p>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              onClick={toggleRecording}
              disabled={submitted || isTranscribing || isGrading}
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
                disabled={isSpeaking || submitted || isGrading}
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
            <div className="rounded-lg border-2 border-foreground/20 bg-muted p-3 space-y-2">
              <p className="text-xs text-muted-foreground">What we heard — fix any mistakes before checking:</p>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-[72px] border-2 bg-background"
              />
            </div>
          )}

          {isGrading && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-foreground/20 bg-muted p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">Coach is reviewing your sentence…</p>
            </div>
          )}

          {submitted && grade && !isGrading && (
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

              {transcript.trim() && (
                <p className="text-sm mb-3 pb-3 border-b border-foreground/10">
                  <span className="text-muted-foreground">You said: </span>
                  <span className="font-medium">{transcript.trim()}</span>
                </p>
              )}

              {grade.feedbackLines.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                    Coach feedback
                  </p>
                  <ul className="space-y-1.5">
                    {grade.feedbackLines.map((line, i) => (
                      <li key={i} className="text-sm leading-relaxed flex gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>{renderFeedback(line)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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

              {grade.correctedSentence && !isStrong && (
                <p className="text-sm mt-2 pt-2 border-t border-foreground/10">
                  <span className="text-muted-foreground">Suggested sentence: </span>
                  <span className="font-medium text-foreground">{grade.correctedSentence}</span>
                </p>
              )}

              <p className="text-sm text-muted-foreground mt-2">
                {grade.scorePercent}% for this prompt
                {feedbackSource === "ai" && " · AI coach"}
              </p>
            </div>
          )}

          {!submitted ? (
            <div className="space-y-2">
              <Button
                onClick={() => void handleSubmit()}
                disabled={isRecording || isTranscribing || isGrading}
                className="w-full"
              >
                {transcript.trim() ? "Check my answer" : "Compare without transcript"}
              </Button>
              {transcript.trim() && (
                <p className="text-xs text-center text-muted-foreground">
                  Your sentence will be reviewed by the Igbo coach for specific feedback.
                </p>
              )}
              {!transcript.trim() && (
                <p className="text-xs text-center text-muted-foreground">
                  No transcript? Use compare to hear the model and mark yourself.
                </p>
              )}
            </div>
          ) : !transcript.trim() && submitted && grade ? (
            <div className="flex gap-2">
              <Button onClick={handleSelfCheckGotIt} className="flex-1">
                I said it well
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setGrade(null);
                  setFeedbackSource(null);
                }}
                className="flex-1 border-2"
              >
                Try again
              </Button>
            </div>
          ) : submitted && grade && !isGrading ? (
            <Button onClick={handleNext} className="w-full">
              Continue
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
