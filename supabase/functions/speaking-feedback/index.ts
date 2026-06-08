import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion, hasLlmProvider } from "../_shared/llm.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AspectRating = "good" | "partial" | "missing" | "unknown";

interface SpeakingFeedback {
  scorePercent: number;
  feedbackTitle: string;
  feedbackLines: string[];
  correctedSentence?: string | null;
  aspects: {
    wordChoice: AspectRating;
    spelling: AspectRating;
    diacritics: AspectRating;
    structure: AspectRating;
  };
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeAspect(value: unknown): AspectRating {
  if (value === "good" || value === "partial" || value === "missing" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function parseFeedback(raw: string): SpeakingFeedback | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SpeakingFeedback>;
    if (!parsed || typeof parsed !== "object") return null;

    const feedbackLines = Array.isArray(parsed.feedbackLines)
      ? parsed.feedbackLines.filter((l): l is string => typeof l === "string").slice(0, 6)
      : [];

    return {
      scorePercent: clampScore(Number(parsed.scorePercent) || 0),
      feedbackTitle:
        typeof parsed.feedbackTitle === "string" && parsed.feedbackTitle.trim()
          ? parsed.feedbackTitle.trim()
          : "Feedback on your sentence",
      feedbackLines,
      correctedSentence:
        typeof parsed.correctedSentence === "string" && parsed.correctedSentence.trim()
          ? parsed.correctedSentence.trim()
          : null,
      aspects: {
        wordChoice: normalizeAspect(parsed.aspects?.wordChoice),
        spelling: normalizeAspect(parsed.aspects?.spelling),
        diacritics: normalizeAspect(parsed.aspects?.diacritics),
        structure: normalizeAspect(parsed.aspects?.structure),
      },
    };
  } catch {
    return null;
  }
}

function ruleBasedFeedback(
  userSentence: string,
  targetWord: string,
  englishPrompt: string,
  referenceIgbo: string | null
): SpeakingFeedback {
  const user = userSentence.trim();
  const target = targetWord.trim();
  const userLower = user.toLowerCase();
  const targetLower = target.toLowerCase().normalize("NFC");

  const hasWord =
    userLower.includes(targetLower) ||
    userLower.normalize("NFC").includes(
      targetLower.replace(/[ịọụ]/g, (c) => {
        const map: Record<string, string> = { ị: "i", ọ: "o", ụ: "u" };
        return map[c] ?? c;
      })
    );

  if (!user) {
    return {
      scorePercent: 0,
      feedbackTitle: "Try speaking a full sentence",
      feedbackLines: [`Respond to: "${englishPrompt}" using **${target}**.`],
      aspects: {
        wordChoice: "missing",
        spelling: "unknown",
        diacritics: "unknown",
        structure: "unknown",
      },
    };
  }

  if (!hasWord) {
    return {
      scorePercent: 12,
      feedbackTitle: `Include ${target} in your sentence`,
      feedbackLines: [
        `The prompt was: "${englishPrompt}".`,
        referenceIgbo
          ? `One natural way to say it: ${referenceIgbo}`
          : `Build a sentence around the word **${target}**.`,
      ],
      correctedSentence: referenceIgbo,
      aspects: {
        wordChoice: "missing",
        spelling: "unknown",
        diacritics: "unknown",
        structure: "unknown",
      },
    };
  }

  const wordCount = user.split(/\s+/).filter(Boolean).length;
  const lines = [
    `You used **${target}** — good!`,
    wordCount < 3
      ? "Try stretching into a fuller sentence next time, not just the word alone."
      : "Your sentence has a clear structure to build on.",
  ];
  if (referenceIgbo) {
    lines.push(`Compare with the model: ${referenceIgbo}`);
  }

  return {
    scorePercent: wordCount >= 3 ? 72 : 58,
    feedbackTitle: "Good word choice — keep polishing",
    feedbackLines: lines,
    correctedSentence: referenceIgbo,
    aspects: {
      wordChoice: "good",
      spelling: "partial",
      diacritics: "partial",
      structure: wordCount >= 3 ? "partial" : "missing",
    },
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = await req.json();
    const userSentence = typeof body.userSentence === "string" ? body.userSentence.trim() : "";
    const targetWord = typeof body.targetWord === "string" ? body.targetWord.trim() : "";
    const englishPrompt = typeof body.englishPrompt === "string" ? body.englishPrompt.trim() : "";
    const referenceIgbo =
      typeof body.referenceIgbo === "string" && body.referenceIgbo.trim()
        ? body.referenceIgbo.trim()
        : null;
    const glossHint = typeof body.glossHint === "string" ? body.glossHint.trim() : "";

    if (!userSentence || !targetWord || !englishPrompt) {
      return jsonResponse(
        { error: "userSentence, targetWord, and englishPrompt are required" },
        400
      );
    }

    if (!hasLlmProvider()) {
      const feedback = ruleBasedFeedback(userSentence, targetWord, englishPrompt, referenceIgbo);
      return jsonResponse({ ...feedback, source: "rule-based" });
    }

    const systemPrompt = `You are a warm, shame-free Igbo speaking coach for heritage learners.
The learner spoke a sentence (shown as a transcript). Give specific feedback on THEIR sentence.

Respond with ONLY valid JSON (no markdown fences):
{
  "scorePercent": <integer 0-100>,
  "feedbackTitle": "<short encouraging headline>",
  "feedbackLines": ["<2-4 specific comments about what they wrote>"],
  "correctedSentence": "<improved Igbo sentence with diacritics, or null if theirs was excellent>",
  "aspects": {
    "wordChoice": "good|partial|missing|unknown",
    "spelling": "good|partial|missing|unknown",
    "diacritics": "good|partial|missing|unknown",
    "structure": "good|partial|missing|unknown"
  }
}

Scoring guide:
- 90-100: natural, correct use of target word, good Igbo structure
- 75-89: correct idea and word, minor tone/spelling/word-order fixes
- 55-74: used target word but meaning or structure needs work
- below 55: missing target word or sentence does not address the prompt

Feedback rules:
- Reference what they actually wrote (quote or paraphrase their Igbo)
- Explain meaning, tone marks (ị ọ ụ), word order, or natural phrasing
- Be encouraging; never harsh
- correctedSentence: only when it helps; use proper Igbo diacritics`;

    const userPrompt = `English prompt: ${englishPrompt}
Target Igbo word (must appear): ${targetWord}
${glossHint ? `English gloss: ${glossHint}` : ""}
${referenceIgbo ? `Model answer: ${referenceIgbo}` : "Model answer: (none provided)"}

Learner's transcribed Igbo sentence:
${userSentence}`;

    const result = await chatCompletion({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 400,
      temperature: 0.4,
      jsonMode: true,
    });

    if (!result.ok) {
      console.error("LLM error:", result.status, result.error);
      const feedback = ruleBasedFeedback(userSentence, targetWord, englishPrompt, referenceIgbo);
      return jsonResponse({ ...feedback, source: "rule-based-fallback" });
    }

    const feedback = parseFeedback(result.text);

    if (!feedback) {
      const fallback = ruleBasedFeedback(userSentence, targetWord, englishPrompt, referenceIgbo);
      return jsonResponse({ ...fallback, source: "rule-based-fallback" });
    }

    return jsonResponse({
      ...feedback,
      source: "ai",
      llmProvider: result.provider,
      llmModel: result.model,
    });
  } catch (error) {
    console.error("Speaking feedback error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
