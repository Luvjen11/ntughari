import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Keyboard, Loader2, Mic, MicOff, Trash2, Volume2 } from "lucide-react";
import { IgboCharacterPad } from "@/components/practice/IgboCharacterPad";
import { useIgboInsert } from "@/hooks/useIgboInsert";
import { useTTS } from "@/hooks/useTTS";
import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { userFunctionAuthHeaders } from "@/lib/supabaseFunctions";
import { DEFAULT_YARNGPT_VOICE } from "@/lib/ttsConstants";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  text: string;
  igbo?: string;
  english?: string;
  correction?: string | null;
  correctionNote?: string | null;
  newWord?: { igbo: string; english: string } | null;
  /** Local error/notice bubbles are never sent back to the tutor as history */
  isLocal?: boolean;
}

interface AiConversationProps {
  level?: "beginner" | "intermediate" | "advanced";
}

const GREETING: Message = {
  role: "assistant",
  text: "Ndewo! M bụ onye nkuzi Igbo gị. Ka anyị kparịta ụka!",
  igbo: "Ndewo! M bụ onye nkuzi Igbo gị. Ka anyị kparịta ụka!",
  english: "Hello! I'm your Igbo tutor. Let's have a conversation!",
};

export function AiConversation({ level = "beginner" }: AiConversationProps) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [showCharPad, setShowCharPad] = useState(false);
  /** Set when the server answered with canned replies instead of the AI tutor */
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const { ref: textareaRef, insert: insertCharacter } = useIgboInsert<HTMLTextAreaElement>(
    userInput,
    setUserInput
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const wasRecordingRef = useRef(false);
  const lastAutoSentRef = useRef("");

  const { speakSentence, isSpeaking } = useTTS();
  const {
    isRecording,
    isTranscribing,
    transcript,
    error: captureError,
    toggleRecording,
    clearTranscript,
  } = useSpeechCapture();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (transcript) setUserInput(transcript);
  }, [transcript]);

  const speakIgboReply = useCallback(
    (igbo: string) => {
      if (!igbo || lastSpokenRef.current === igbo) return;
      lastSpokenRef.current = igbo;
      void speakSentence(igbo, { voice: DEFAULT_YARNGPT_VOICE });
    },
    [speakSentence]
  );

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const userText = (textOverride ?? userInput).trim();
      if (!userText || loading) return;

      setUserInput("");
      clearTranscript();
      setLoading(true);

      const userMessage: Message = { role: "user", text: userText };
      setMessages((prev) => [...prev, userMessage]);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        toast.error("Supabase URL not configured");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/ai-tutor`, {
          method: "POST",
          headers: await userFunctionAuthHeaders(true),
          body: JSON.stringify({
            userText,
            // Prior turns only — the server appends userText itself. Send the clean
            // Igbo reply (not the raw formatted blob) as assistant history.
            conversationHistory: messages
              .filter((m) => !m.isLocal)
              .slice(-16)
              .map((m) => ({
                role: m.role,
                content: m.role === "assistant" ? (m.igbo ?? m.text) : m.text,
              })),
            level,
          }),
        });

        if (response.status === 401) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: "Biko, banye n'akaụntụ gị ka anyị kparịta ụka.",
              igbo: "Biko, banye n'akaụntụ gị ka anyị kparịta ụka.",
              english: "Please sign in to your account so we can chat.",
              isLocal: true,
            },
          ]);
          return;
        }

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Tutor error ${response.status}: ${errBody.slice(0, 120)}`);
        }

        const data = (await response.json()) as {
          reply?: string;
          explanation?: string;
          fullReply?: string;
          correction?: string | null;
          correctionNote?: string | null;
          newWord?: { igbo: string; english: string } | null;
          source?: string;
        };

        setFallbackNotice(
          data.source && data.source !== "ai"
            ? "The AI tutor is unavailable right now, so you're getting simple practice replies."
            : null
        );

        const igbo = data.reply?.trim() ?? "";
        const english = data.explanation?.trim() ?? "";

        const assistantMessage: Message = {
          role: "assistant",
          text: igbo || (data.fullReply ?? ""),
          igbo: igbo || data.fullReply,
          english,
          correction: data.correction ?? null,
          correctionNote: data.correctionNote ?? null,
          newWord: data.newWord ?? null,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (assistantMessage.igbo) {
          setTimeout(() => speakIgboReply(assistantMessage.igbo!), 400);
        }
      } catch (error) {
        console.error("Conversation error:", error);
        toast.error("Couldn't reach the tutor. Try again.");
        const errorMessage: Message = {
          role: "assistant",
          text: "Ndo! E nwere nsogbu. Gbalịa ọzọ.",
          igbo: "Ndo! E nwere nsogbu. Gbalịa ọzọ.",
          english: "Sorry! Something went wrong. Try again.",
          isLocal: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [userInput, loading, messages, level, clearTranscript, speakIgboReply]
  );

  useEffect(() => {
    const finishedRecording = wasRecordingRef.current && !isRecording && !isTranscribing;
    wasRecordingRef.current = isRecording;

    if (
      autoSend &&
      finishedRecording &&
      transcript.trim() &&
      !loading &&
      transcript !== lastAutoSentRef.current
    ) {
      const t = setTimeout(() => {
        lastAutoSentRef.current = transcript;
        void sendMessage(transcript);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [autoSend, transcript, isRecording, isTranscribing, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <Card className="border-2 border-foreground shadow-brutal flex flex-col h-[min(640px,80vh)]">
      <CardHeader className="pb-3 border-b-2 border-foreground/10">
        <CardTitle className="font-display text-xl">Igbo Conversation Tutor</CardTitle>
        <p className="text-sm text-muted-foreground">Level: {level}</p>
        {fallbackNotice && (
          <p className="text-xs mt-1 px-2 py-1 rounded border border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200">
            {fallbackNotice}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 p-4 gap-3">
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg border-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground border-foreground"
                    : "bg-card border-foreground/30"
                }`}
              >
                {message.role === "assistant" ? (
                  <>
                    <p className="font-semibold text-lg mb-1">{message.igbo ?? message.text}</p>
                    {message.english && (
                      <p className="text-sm text-muted-foreground">{message.english}</p>
                    )}
                    {message.correction && (
                      <div className="mt-2 p-2 rounded border border-amber-500/50 bg-amber-500/10">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">
                          ✏️ Better: <span className="font-medium">{message.correction}</span>
                        </p>
                        {message.correctionNote && (
                          <p className="text-xs text-muted-foreground">{message.correctionNote}</p>
                        )}
                      </div>
                    )}
                    {message.newWord?.igbo && (
                      <p className="mt-2 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                          New word: {message.newWord.igbo} — {message.newWord.english}
                        </span>
                      </p>
                    )}
                    {message.igbo && index === messages.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 border-2"
                        disabled={isSpeaking}
                        onClick={() => speakIgboReply(message.igbo!)}
                      >
                        <Volume2 className="h-4 w-4 mr-1" />
                        Listen again
                      </Button>
                    )}
                  </>
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted border-2 border-foreground/20 p-3 rounded-lg flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground text-sm">Na-eche… (Thinking…)</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t-2 border-foreground/10 pt-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={toggleRecording}
                disabled={loading || isTranscribing}
                className="border-2"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4 mr-1" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1" />
                    {isTranscribing ? "Transcribing…" : "Record"}
                  </>
                )}
              </Button>
              {isRecording && (
                <span className="text-sm text-destructive font-medium self-center animate-pulse">
                  Recording… tap Stop when finished
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={showCharPad ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowCharPad((v) => !v)}
                className="border-2"
                title="Igbo characters"
              >
                <Keyboard className="h-4 w-4 mr-1" />
                ị ọ ṅ
              </Button>
              <Switch id="auto-send" checked={autoSend} onCheckedChange={setAutoSend} />
              <Label htmlFor="auto-send" className="text-xs cursor-pointer">
                Auto-send
              </Label>
            </div>
          </div>

          {captureError && <p className="text-xs text-muted-foreground">{captureError}</p>}

          {showCharPad && (
            <IgboCharacterPad onCharacterClick={insertCharacter} disabled={loading} compact />
          )}

          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or tap Record, speak your full message, then tap Stop…"
            className="w-full p-3 border-2 border-foreground rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[72px] bg-background"
            rows={2}
            disabled={loading}
          />

          <div className="flex gap-2">
            <Button
              onClick={() => void sendMessage()}
              disabled={loading || !userInput.trim()}
              className="flex-1 border-2 border-foreground"
            >
              {loading ? "Sending…" : "Send"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMessages([GREETING]);
                lastSpokenRef.current = null;
              }}
              className="border-2"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
