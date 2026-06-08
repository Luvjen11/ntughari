export type LlmProvider = "anthropic" | "openai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
}

export interface ChatCompletionOptions {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Request JSON object output (OpenAI json_mode; Anthropic via prompt). */
  jsonMode?: boolean;
}

export type ChatCompletionResult =
  | { ok: true; text: string; provider: LlmProvider; model: string }
  | { ok: false; error: string; status?: number };

const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function isAnthropicKey(key: string): boolean {
  return key.startsWith("sk-ant-");
}

/** OpenAI key for chat + Whisper. Skips LLM_API_KEY when it is an Anthropic key. */
export function getOpenAiKey(): string | null {
  const dedicated = Deno.env.get("OPENAI_API_KEY");
  if (dedicated?.trim()) return dedicated.trim();

  const legacy = Deno.env.get("LLM_API_KEY")?.trim();
  if (legacy && !isAnthropicKey(legacy)) return legacy;

  return null;
}

export function hasLlmProvider(): boolean {
  return !!(Deno.env.get("ANTHROPIC_API_KEY")?.trim() || getOpenAiKey());
}

/** Pick provider from env: LLM_PROVIDER=anthropic|openai|auto (default auto). */
export function resolveLlmConfig(): LlmConfig | null {
  const forced = Deno.env.get("LLM_PROVIDER")?.toLowerCase().trim();
  const customModel = Deno.env.get("LLM_MODEL")?.trim();

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim() || null;
  const openaiKey = getOpenAiKey();

  if (forced === "anthropic" && anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: customModel || DEFAULT_ANTHROPIC_MODEL,
    };
  }

  if (forced === "openai" && openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: customModel || DEFAULT_OPENAI_MODEL,
    };
  }

  // auto: prefer Anthropic when both are set (cheaper for solo testing)
  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      model: customModel || DEFAULT_ANTHROPIC_MODEL,
    };
  }

  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      model: customModel || DEFAULT_OPENAI_MODEL,
    };
  }

  return null;
}

/** Strip markdown code fences so Claude JSON responses still parse. */
export function extractTextContent(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function chatAnthropic(
  config: LlmConfig,
  opts: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const system =
    opts.jsonMode && !opts.system.toLowerCase().includes("json")
      ? `${opts.system}\n\nRespond with ONLY valid JSON. No markdown fences.`
      : opts.system;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.5,
      system,
      messages: opts.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, error: errorText, status: response.status };
  }

  const data = await response.json();
  const text =
    data.content?.find((block: { type: string; text?: string }) => block.type === "text")?.text ??
    "";

  return {
    ok: true,
    text: extractTextContent(text),
    provider: "anthropic",
    model: config.model,
  };
}

async function chatOpenAi(
  config: LlmConfig,
  opts: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: opts.maxTokens ?? 400,
    temperature: opts.temperature ?? 0.5,
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, error: errorText, status: response.status };
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  return {
    ok: true,
    text: extractTextContent(text),
    provider: "openai",
    model: config.model,
  };
}

export async function chatCompletion(opts: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const config = resolveLlmConfig();
  if (!config) {
    return { ok: false, error: "No LLM API key configured" };
  }

  if (config.provider === "anthropic") {
    return chatAnthropic(config, opts);
  }
  return chatOpenAi(config, opts);
}
