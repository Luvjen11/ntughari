import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function generateRuleBasedReply(userText: string): string {
  const lower = userText.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("ndewo")) {
    return "Ndewo! Ka ọ dị? Olee otú ị dị?";
  }
  if (lower.includes("how are you") || lower.includes("ka ọ dị")) {
    return "Adị m mma, na-egọzie! Ị dịkwa?";
  }
  if (lower.includes("thank") || lower.includes("na-egwu") || lower.includes("daalụ")) {
    return "Nọ n'ụlọ! Ị na-eme nke ọma!";
  }
  if (lower.includes("what") || lower.includes("kedu")) {
    return "Kedụ ihe ị chọrọ ịmụta taa?";
  }
  return "Ọ dị mma! Gbalịa ọzọ — ị na-aga n'ihu.";
}

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { userText, conversationHistory = [], level = "beginner" } = await req.json();

    if (!userText || typeof userText !== "string") {
      return jsonResponse({ error: "userText is required" }, 400);
    }

    const llmApiKey = Deno.env.get("LLM_API_KEY");
    if (!llmApiKey) {
      const reply = generateRuleBasedReply(userText);
      return jsonResponse({
        reply,
        explanation: "Rule-based tutor (set LLM_API_KEY for AI replies).",
        fullReply: reply,
      });
    }

    const systemPrompt = `You are a friendly Igbo language tutor for ${level} learners.
Respond in this exact format:
Igbo: [1-2 simple Igbo sentences]
English: [English translation]

Rules:
- Keep Igbo simple and encouraging
- Gently correct mistakes
- Stay on topic`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: userText },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API error:", response.status, errorText);
      const reply = generateRuleBasedReply(userText);
      return jsonResponse({
        reply,
        explanation: "AI temporarily unavailable — here's a practice reply.",
        fullReply: reply,
      });
    }

    const data = await response.json();
    const fullReply = data.choices?.[0]?.message?.content ?? "";
    const { reply, explanation } = parseIgboEnglish(fullReply);

    return jsonResponse({ reply, explanation, fullReply });
  } catch (error) {
    console.error("AI Tutor error:", error);
    return jsonResponse(
      { error: "Internal server error", message: (error as Error).message },
      500
    );
  }
});
