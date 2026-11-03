import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatCompletion, hasLlmProvider, type ChatMessage } from "../_shared/llm.ts";
import { getSignedInUserId } from "../_shared/auth.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface TutorReply {
  igbo: string;
  english: string;
  correction?: string | null;
  correctionNote?: string | null;
  newWord?: { igbo: string; english: string } | null;
}

/** Whole-word match that works with Igbo letters (\b is ASCII-only in JS). */
function hasPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((p) => new RegExp(`(^|[^\\p{L}])${p}(?=$|[^\\p{L}])`, "u").test(text));
}

// Fixed phrases shown when no LLM is reachable — keep these reviewed by a native speaker.
function generateRuleBasedReply(userText: string): TutorReply {
  const lower = userText.toLowerCase().normalize("NFC");
  if (hasPhrase(lower, ["how are you", "kedu", "kedụ", "ka ọ dị", "ka o di"])) {
    return {
      igbo: "Adị m mma, daalụ! Gị kwanụ?",
      english: "I'm fine, thank you! And you?",
    };
  }
  if (hasPhrase(lower, ["hello", "hi", "hey", "ndewo", "nnọọ", "nnoo"])) {
    return {
      igbo: "Ndewo! Kedu ka ị mere?",
      english: "Hello! How are you?",
    };
  }
  if (hasPhrase(lower, ["thank you", "thanks", "daalụ", "dalu", "daalu"])) {
    return {
      igbo: "Ọ dịghị nsogbu! Ị na-eme nke ọma.",
      english: "No problem! You're doing well.",
    };
  }
  if (hasPhrase(lower, ["what", "gịnị", "gini"])) {
    return {
      igbo: "Gịnị ka ị chọrọ ịmụta taa?",
      english: "What would you like to learn today?",
    };
  }
  return {
    igbo: "Ọ dị mma! Gbalịa ọzọ — ị na-aga n'ihu.",
    english: "That's good! Try again — you're making progress.",
  };
}

/** Legacy fallback when the model doesn't return valid JSON. */
function parseIgboEnglish(fullReply: string): { reply: string; explanation: string } {
  const igboMatch = fullReply.match(/Igbo:\s*(.+?)(?=English:|$)/is);
  const englishMatch = fullReply.match(/English:\s*(.+?)(?=Igbo:|$)/is);
  if (igboMatch || englishMatch) {
    return {
      reply: igboMatch ? igboMatch[1].trim() : fullReply.trim(),
      explanation: englishMatch ? englishMatch[1].trim() : "",
    };
  }
  return { reply: fullReply.trim(), explanation: "" };
}

function parseTutorJson(raw: string): TutorReply | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const igbo = typeof parsed.igbo === "string" ? parsed.igbo.trim() : "";
    if (!igbo) return null;
    const newWord =
      parsed.newWord && typeof parsed.newWord === "object" &&
      typeof (parsed.newWord as Record<string, unknown>).igbo === "string" &&
      typeof (parsed.newWord as Record<string, unknown>).english === "string"
        ? {
            igbo: ((parsed.newWord as Record<string, string>).igbo ?? "").trim(),
            english: ((parsed.newWord as Record<string, string>).english ?? "").trim(),
          }
        : null;
    return {
      igbo,
      english: typeof parsed.english === "string" ? parsed.english.trim() : "",
      correction: typeof parsed.correction === "string" ? parsed.correction.trim() || null : null,
      correctionNote:
        typeof parsed.correctionNote === "string" ? parsed.correctionNote.trim() || null : null,
      newWord: newWord && newWord.igbo ? newWord : null,
    };
  } catch {
    return null;
  }
}

const LEVEL_GUIDE: Record<string, string> = {
  beginner:
    "Beginner: reply with 1-2 short, simple sentences using common everyday words. Always end with an easy question they can answer with words they likely know.",
  intermediate:
    "Intermediate: reply with 2-3 sentences. Introduce connectors (ma, kama, n'ihi na) and past/future tenses. End with a question that stretches them slightly.",
  advanced:
    "Advanced: reply with 3-4 natural sentences. Use richer vocabulary; an occasional proverb (ilu) with its meaning is welcome. Discuss topics with depth.",
};

function buildSystemPrompt(level: string): string {
  const guide = LEVEL_GUIDE[level] ?? LEVEL_GUIDE.beginner;
  return `You are Nne Ngozi, a warm and experienced Igbo language tutor having a natural back-and-forth conversation with a learner. Your goal is for them to USE Igbo, not just read about it.

Respond with ONLY a JSON object in this exact shape (no markdown, no extra keys):
{
  "igbo": "your conversational reply in Igbo",
  "english": "natural English translation of your reply",
  "correction": "the learner's last message rewritten in fully correct Igbo with all diacritics, or null if it was already correct or was in English",
  "correctionNote": "one short, encouraging English sentence explaining the most important fix, or null",
  "newWord": {"igbo": "one useful new word you used in your reply", "english": "its meaning"} or null
}

Language rules:
- Use Standard Igbo (Ọnwụ orthography) with FULL diacritics on every Igbo word you write: dotted vowels ị ọ ụ and ṅ everywhere they belong.
- Add tone marks where they distinguish meaning (e.g. ákwà cloth, àkwá egg, àkwà bed, ákwá cry).
- ${guide}
- Understand the learner generously even when they type without diacritics — never scold about diacritics, just model the correct form in "correction".
- If the learner writes in English, still reply in Igbo (with the English translation) and gently invite them to try Igbo.
- Introduce at most ONE new word per reply and put it in "newWord".
- Keep the conversation flowing around the learner's topic. Never lecture in long paragraphs.`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    if (!(await getSignedInUserId(req))) {
      return jsonResponse({ error: "Sign in to use this feature", code: "auth_required" }, 401);
    }

    const { userText, conversationHistory = [], level = "beginner" } = await req.json();

    if (!userText || typeof userText !== "string") {
      return jsonResponse({ error: "userText is required" }, 400);
    }

    if (!hasLlmProvider()) {
      const fallback = generateRuleBasedReply(userText);
      return jsonResponse({
        reply: fallback.igbo,
        explanation: fallback.english,
        fullReply: `Igbo: ${fallback.igbo}\nEnglish: ${fallback.english}`,
        source: "rule-based",
      });
    }

    const history: ChatMessage[] = conversationHistory
      .slice(-16)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const result = await chatCompletion({
      system: buildSystemPrompt(typeof level === "string" ? level : "beginner"),
      messages: [...history, { role: "user", content: userText }],
      maxTokens: 600,
      temperature: 0.7, // OpenAI only; ignored for Claude
      jsonMode: true,
    });

    if (!result.ok) {
      console.error("LLM API error:", result.status, result.error);
      const fallback = generateRuleBasedReply(userText);
      return jsonResponse({
        reply: fallback.igbo,
        explanation: fallback.english,
        fullReply: `Igbo: ${fallback.igbo}\nEnglish: ${fallback.english}`,
        source: "rule-based-fallback",
        llmError: result.error.slice(0, 200),
      });
    }

    const structured = parseTutorJson(result.text);

    if (structured) {
      return jsonResponse({
        reply: structured.igbo,
        explanation: structured.english,
        correction: structured.correction ?? null,
        correctionNote: structured.correctionNote ?? null,
        newWord: structured.newWord ?? null,
        fullReply: structured.igbo,
        source: "ai",
        llmProvider: result.provider,
        llmModel: result.model,
      });
    }

    // Model ignored JSON instructions — salvage with the legacy label parser.
    const { reply, explanation } = parseIgboEnglish(result.text);
    return jsonResponse({
      reply,
      explanation,
      correction: null,
      correctionNote: null,
      newWord: null,
      fullReply: result.text,
      source: "ai",
      llmProvider: result.provider,
      llmModel: result.model,
    });
  } catch (error) {
    console.error("AI Tutor error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
