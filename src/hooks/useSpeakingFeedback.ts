import { useMutation } from "@tanstack/react-query";
import { supabaseFunctionHeaders } from "@/lib/supabaseFunctions";
import type { SentenceGradeResult } from "@/lib/gradeIgboSentence";
import { gradeIgboSentence } from "@/lib/gradeIgboSentence";

export interface SpeakingFeedbackRequest {
  userSentence: string;
  targetWord: string;
  englishPrompt: string;
  referenceIgbo: string | null;
  glossHint?: string;
}

export interface SpeakingFeedbackResult extends SentenceGradeResult {
  source?: "ai" | "rule-based" | "rule-based-fallback" | "local";
}

async function fetchSpeakingFeedback(
  input: SpeakingFeedbackRequest
): Promise<SpeakingFeedbackResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/speaking-feedback`, {
    method: "POST",
    headers: supabaseFunctionHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Feedback request failed (${response.status})`
    );
  }

  const data = (await response.json()) as SpeakingFeedbackResult;
  return {
    scorePercent: data.scorePercent ?? 0,
    feedbackTitle: data.feedbackTitle ?? "Feedback on your sentence",
    feedbackLines: Array.isArray(data.feedbackLines) ? data.feedbackLines : [],
    correctedSentence: data.correctedSentence ?? undefined,
    aspects: data.aspects ?? {
      wordChoice: "unknown",
      spelling: "unknown",
      diacritics: "unknown",
      structure: "unknown",
    },
    source: data.source,
  };
}

export function useSpeakingFeedback() {
  return useMutation({
    mutationFn: async (input: SpeakingFeedbackRequest): Promise<SpeakingFeedbackResult> => {
      try {
        return await fetchSpeakingFeedback(input);
      } catch {
        const local = gradeIgboSentence(
          input.userSentence,
          input.targetWord,
          input.referenceIgbo,
          input.englishPrompt
        );
        return { ...local, source: "local" };
      }
    },
  });
}
