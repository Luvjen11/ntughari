import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mic, MicOff, Trash2, Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { supabaseFunctionHeaders } from "@/lib/supabaseFunctions";
import { DEFAULT_YARNGPT_VOICE } from "@/lib/ttsConstants";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  text: string;
  igbo?: string;
  english?: string;
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
          headers: supabaseFunctionHeaders(),
          body: JSON.stringify({
            userText,
            conversationHistory: [...messages, userMessage].slice(-10).map((m) => ({
              role: m.role,
              content: m.text,
            })),
            level,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Tutor error ${response.status}: ${errBody.slice(0, 120)}`);
        }

        const data = (await response.json()) as {
          reply?: string;
          explanation?: string;
          fullReply?: string;
        };

        const igbo = data.reply?.trim() ?? "";
        const english = data.explanation?.trim() ?? "";

        const assistantMessage: Message = {
          role: "assistant",
          text: data.fullReply ?? igbo,
          igbo: igbo || data.fullReply,
          english,
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
          text: "Ntụrụndụ! E nwere nsogbu. Gbalịa ọzọ.",
          igbo: "Ntụrụndụ! E nwere nsogbu. Gbalịa ọzọ.",
          english: "Sorry! Something went wrong. Try again.",
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
              <Switch id="auto-send" checked={autoSend} onCheckedChange={setAutoSend} />
              <Label htmlFor="auto-send" className="text-xs cursor-pointer">
                Auto-send
              </Label>
            </div>
          </div>

          {captureError && <p className="text-xs text-muted-foreground">{captureError}</p>}

          <textarea
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
