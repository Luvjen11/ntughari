import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUp, Keyboard, Loader2, Mic, Settings2, Square, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IgboCharacterPad } from "@/components/practice/IgboCharacterPad";
import { AudioStateIcon } from "@/components/AudioStateIcon";
import { audioStateFor } from "@/lib/audioState";
import { useIgboInsert } from "@/hooks/useIgboInsert";
import { useTTS } from "@/hooks/useTTS";
import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { userFunctionAuthHeaders } from "@/lib/supabaseFunctions";
import { DEFAULT_YARNGPT_VOICE } from "@/lib/ttsConstants";
import { toast } from "sonner";

export type TutorLevel = "beginner" | "intermediate" | "advanced";

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
  level: TutorLevel;
  onLevelChange: (level: TutorLevel) => void;
}

const LEVELS: { value: TutorLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GREETING: Message = {
  role: "assistant",
  text: "Ndewo! M bụ onye nkuzi Igbo gị. Ka anyị kparịta ụka!",
  igbo: "Ndewo! M bụ onye nkuzi Igbo gị. Ka anyị kparịta ụka!",
  english: "Hello! I'm your Igbo tutor. Let's have a conversation!",
};

/** Openers for an empty chat; tapping one sends it. */
const STARTERS = [
  { igbo: "Kedu?", english: "How are you?" },
  { igbo: "Gwa m maka nri Igbo", english: "Tell me about Igbo food" },
  { igbo: "Ka anyị kparịta ụka maka ezinụlọ", english: "Let's talk about family" },
  { igbo: "How do I say “I'm hungry”?", english: "Ask in English" },
];

const AUTO_SPEAK_KEY = "tutorAutoSpeak";
const AUTO_SEND_KEY = "tutorAutoSend";

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // storage blocked: the setting lasts for this visit only
  }
}

/** The tutor's glowing avatar; it breathes while thinking and swirls while speaking. */
function TutorOrb({ state, size = 32 }: { state: "idle" | "thinking" | "speaking"; size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      <span
        className={`absolute inset-0 rounded-full blur-[6px] opacity-80 bg-[conic-gradient(from_0deg,hsl(var(--primary)),hsl(var(--secondary)),hsl(var(--primary)))] ${
          state === "speaking" ? "animate-[spin_3s_linear_infinite]" : state === "thinking" ? "animate-pulse" : ""
        }`}
      />
      <span className="absolute inset-[3px] rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(0_0%_100%/0.9),hsl(var(--primary))_45%,hsl(var(--secondary)))]" />
    </span>
  );
}

export function AiConversation({ level, onLevelChange }: AiConversationProps) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSend, setAutoSend] = useState(() => readFlag(AUTO_SEND_KEY, false));
  const [autoSpeak, setAutoSpeak] = useState(() => readFlag(AUTO_SPEAK_KEY, true));
  const [showCharPad, setShowCharPad] = useState(false);
  /** Set when the server answered with canned replies instead of the AI tutor */
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const { ref: textareaRef, insert: insertCharacter } = useIgboInsert<HTMLTextAreaElement>(
    userInput,
    setUserInput
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasRecordingRef = useRef(false);
  const lastAutoSentRef = useRef("");

  const tts = useTTS();
  const { speakSentence, stop: stopSpeaking } = tts;
  const {
    isRecording,
    isTranscribing,
    transcript,
    error: captureError,
    toggleRecording,
    clearTranscript,
  } = useSpeechCapture();

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (transcript) setUserInput(transcript);
  }, [transcript]);

  // Grow the composer with its text, up to about six lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [userInput, textareaRef]);

  const speakReply = useCallback(
    (igbo: string) => void speakSentence(igbo, { voice: DEFAULT_YARNGPT_VOICE, igbo: true }),
    [speakSentence]
  );

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const userText = (textOverride ?? userInput).trim();
      if (!userText || loading) return;

      setUserInput("");
      clearTranscript();
      setShowCharPad(false);
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
        if (autoSpeak && assistantMessage.igbo) speakReply(assistantMessage.igbo);
      } catch (error) {
        console.error("Conversation error:", error);
        toast.error("Couldn't reach the tutor. Try again.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Ndo! E nwere nsogbu. Gbalịa ọzọ.",
            igbo: "Ndo! E nwere nsogbu. Gbalịa ọzọ.",
            english: "Sorry! Something went wrong. Try again.",
            isLocal: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [userInput, loading, messages, level, clearTranscript, autoSpeak, speakReply]
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

  const clearChat = () => {
    stopSpeaking();
    setMessages([GREETING]);
    setFallbackNotice(null);
  };

  const lastAssistantIgbo = [...messages].reverse().find((m) => m.role === "assistant")?.igbo ?? "";
  const orbState = loading
    ? "thinking"
    : tts.isSpeaking && tts.activeText === lastAssistantIgbo.trim()
      ? "speaking"
      : "idle";
  const freshChat = messages.length === 1;

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-background">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[46rem] max-w-[140%] h-[26rem] rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute -bottom-48 -right-24 w-[30rem] h-[24rem] rounded-full bg-secondary/30 blur-[120px]" />
        <div className="absolute -bottom-40 -left-32 w-[26rem] h-[20rem] rounded-full bg-primary/15 blur-[110px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-foreground/10 bg-background/60 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">
          <Link to="/practice" className="p-2 -ml-2 rounded-full hover:bg-muted" aria-label="Back to Practice Hub">
            <ArrowLeft size={18} />
          </Link>
          <TutorOrb state={orbState} size={28} />
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold leading-tight">Nkuzi · Igbo tutor</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {loading ? "Na-eche… (thinking)" : orbState === "speaking" ? "Speaking…" : "Talk or type in Igbo"}
            </p>
          </div>

          <div className="hidden sm:flex rounded-full bg-muted/70 p-1" role="group" aria-label="Level">
            {LEVELS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLevelChange(option.value)}
                aria-pressed={level === option.value}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  level === option.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="p-2 rounded-full hover:bg-muted" aria-label="Chat settings">
                <Settings2 size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4">
              <div className="sm:hidden space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Level</p>
                <div className="flex rounded-full bg-muted p-1">
                  {LEVELS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onLevelChange(option.value)}
                      aria-pressed={level === option.value}
                      className={`flex-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        level === option.value ? "bg-background shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <Label htmlFor="auto-speak" className="text-sm leading-snug">
                  Speak replies aloud
                  <span className="block text-xs text-muted-foreground font-normal">
                    Uses voice credits. Off: tap Listen when you want to hear one.
                  </span>
                </Label>
                <Switch
                  id="auto-speak"
                  checked={autoSpeak}
                  onCheckedChange={(v) => {
                    setAutoSpeak(v);
                    writeFlag(AUTO_SPEAK_KEY, v);
                    if (!v) stopSpeaking();
                  }}
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <Label htmlFor="auto-send" className="text-sm leading-snug">
                  Send when I stop recording
                  <span className="block text-xs text-muted-foreground font-normal">
                    Off: check the transcript before sending.
                  </span>
                </Label>
                <Switch
                  id="auto-send"
                  checked={autoSend}
                  onCheckedChange={(v) => {
                    setAutoSend(v);
                    writeFlag(AUTO_SEND_KEY, v);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={clearChat}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-foreground/15 py-2 text-sm hover:bg-muted"
              >
                <Trash2 size={14} /> Start a new chat
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
          {fallbackNotice && (
            <p className="text-xs px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200">
              {fallbackNotice}
            </p>
          )}

          {messages.map((message, index) =>
            message.role === "assistant" ? (
              <div key={index} className="flex gap-3 animate-slide-up">
                <TutorOrb state={index === messages.length - 1 ? orbState : "idle"} size={28} />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <p className="font-display text-lg leading-relaxed">{message.igbo ?? message.text}</p>
                  {message.english && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{message.english}</p>
                  )}
                  {message.correction && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                      <p className="text-sm">
                        <span className="font-semibold text-amber-700 dark:text-amber-300">Better: </span>
                        <span className="font-medium">{message.correction}</span>
                      </p>
                      {message.correctionNote && (
                        <p className="text-xs text-muted-foreground mt-0.5">{message.correctionNote}</p>
                      )}
                    </div>
                  )}
                  {message.newWord?.igbo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs">
                      <span className="text-muted-foreground">New word</span>
                      <span className="font-semibold">{message.newWord.igbo}</span>
                      <span className="text-muted-foreground">· {message.newWord.english}</span>
                    </span>
                  )}
                  {message.igbo && !message.isLocal && (
                    <div>
                      <button
                        type="button"
                        onClick={() => speakReply(message.igbo!)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <AudioStateIcon state={audioStateFor(message.igbo, tts)} size={14} />
                        Listen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={index} className="flex justify-end animate-slide-up">
                <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-gradient-to-br from-primary/90 to-secondary/80 px-4 py-2.5 text-primary-foreground shadow-[0_8px_30px_-12px_hsl(var(--primary))] whitespace-pre-wrap">
                  {message.text}
                </p>
              </div>
            )
          )}

          {loading && (
            <div className="flex gap-3 items-center">
              <TutorOrb state="thinking" size={28} />
              <span className="flex gap-1" aria-label="The tutor is thinking">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </div>
          )}

          {freshChat && !loading && (
            <div className="grid gap-2 sm:grid-cols-2 pt-2">
              {STARTERS.map((s) => (
                <button
                  key={s.igbo}
                  type="button"
                  onClick={() => void sendMessage(s.igbo)}
                  className="text-left rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur px-4 py-3 hover:border-primary/60 hover:shadow-[0_0_24px_-8px_hsl(var(--primary))] transition-all"
                >
                  <span className="block font-medium">{s.igbo}</span>
                  <span className="block text-xs text-muted-foreground">{s.english}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="relative z-10 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto max-w-3xl px-4 space-y-2">
          {(isRecording || isTranscribing || captureError) && (
            <p className={`text-xs px-1 ${captureError && !isRecording ? "text-muted-foreground" : "text-foreground"}`} aria-live="polite">
              {isRecording ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Listening… speak your whole message, then tap stop.
                </span>
              ) : isTranscribing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> Writing down what you said…
                </span>
              ) : (
                captureError
              )}
            </p>
          )}

          {showCharPad && (
            <div className="rounded-2xl border border-foreground/10 bg-card/80 backdrop-blur p-2">
              <IgboCharacterPad onCharacterClick={insertCharacter} disabled={loading} compact />
            </div>
          )}

          <div
            className={`flex items-end gap-2 rounded-[28px] border bg-card/80 backdrop-blur-md p-2 pl-3 transition-shadow ${
              isRecording
                ? "border-secondary shadow-[0_0_0_4px_hsl(var(--secondary)/0.25),0_10px_50px_-10px_hsl(var(--secondary))]"
                : "border-foreground/10 shadow-[0_10px_50px_-14px_hsl(var(--primary)/0.8)] focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.25),0_10px_50px_-10px_hsl(var(--primary))]"
            }`}
          >
            <button
              type="button"
              onClick={() => setShowCharPad((v) => !v)}
              className={`mb-1 h-9 shrink-0 rounded-full px-2.5 text-sm font-semibold transition-colors ${
                showCharPad ? "bg-primary/20" : "hover:bg-muted text-muted-foreground"
              }`}
              aria-pressed={showCharPad}
              title="Igbo letters and tone marks"
            >
              <Keyboard size={16} className="inline -mt-0.5 mr-1" />ị
            </button>

            <textarea
              id="tutor-message"
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening…" : "Kwuo ihe… (type or tap the mic)"}
              aria-label="Your message"
              className="flex-1 min-w-0 resize-none bg-transparent py-2 text-base leading-relaxed focus:outline-none placeholder:text-muted-foreground max-h-[168px]"
              rows={1}
              disabled={loading}
            />

            <button
              type="button"
              onClick={toggleRecording}
              disabled={loading || isTranscribing}
              aria-label={isRecording ? "Stop recording" : "Record your message"}
              className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                isRecording
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-muted hover:bg-secondary/60"
              }`}
            >
              {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || !userInput.trim()}
              aria-label="Send"
              className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-foreground text-background transition-opacity disabled:opacity-30"
            >
              <ArrowUp size={18} />
            </button>
          </div>
          <p className="text-[11px] text-center text-muted-foreground">
            The tutor can make mistakes with tone marks. Check new words with a fluent speaker.
          </p>
        </div>
      </div>
    </div>
  );
}
