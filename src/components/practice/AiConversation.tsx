import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUp, Keyboard, Loader2, Mic, PanelLeft, Settings2, Square, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChatHistory } from "@/components/practice/ChatHistory";
import { useTutorChats, type SavedTutorMessage, type TutorChat } from "@/hooks/useTutorChats";
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
export type TutorPersona = "gentle" | "aunty" | "strict";

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

/** Who the learner talks to. The server has the matching personality prompts. */
const PERSONAS: Record<TutorPersona, { label: string; name: string; blurb: string; greeting: { igbo: string; english: string } }> = {
  gentle: {
    label: "Gentle",
    name: "Nne Ngozi",
    blurb: "Warm and patient",
    greeting: {
      igbo: "Ndewo! M bụ Nne Ngozi, onye nkuzi Igbo gị. Ka anyị kparịta ụka!",
      english: "Hello! I'm Nne Ngozi, your Igbo tutor. Let's have a conversation!",
    },
  },
  aunty: {
    label: "Aunty",
    name: "Aunty Chioma",
    blurb: "Dramatic tough love, family-friendly",
    greeting: {
      igbo: "Ewo! Nwa m, ị bịala! Taa, anyị agaghị asụ Bekee. Kwuo Igbo! Kedu ka ị mere?",
      english: "Ewo! My child, you've come! Today we're not speaking English. Speak Igbo! How are you?",
    },
  },
  strict: {
    label: "Strict",
    name: "Mazi Okoro",
    blurb: "Blunt, sarcastic, no English allowed",
    greeting: {
      igbo: "Ị sị na ị na-aghọta Igbo? Ọ dị mma. Malite ikwu ya ugbu a! Kedu?",
      english: "You say you understand Igbo? Fine. Start speaking it now! How are you?",
    },
  },
};

function greetingFor(persona: TutorPersona): Message {
  const { igbo, english } = PERSONAS[persona].greeting;
  return { role: "assistant", text: igbo, igbo, english, isLocal: true };
}

/** Openers for an empty chat; tapping one sends it. */
const STARTERS = [
  { igbo: "Kedu?", english: "How are you?" },
  { igbo: "Gwa m maka nri Igbo", english: "Tell me about Igbo food" },
  { igbo: "Ka anyị kparịta ụka maka ezinụlọ", english: "Let's talk about family" },
  { igbo: "How do I say “I'm hungry”?", english: "Ask in English" },
];

const AUTO_SPEAK_KEY = "tutorAutoSpeak";
const AUTO_SEND_KEY = "tutorAutoSend";
const HISTORY_OPEN_KEY = "tutorHistoryOpen";
const PERSONA_KEY = "tutorPersona";

/** A saved turn as the chat screen shows it. */
function fromSaved(m: SavedTutorMessage): Message {
  return m.role === "assistant"
    ? {
        role: "assistant",
        text: m.text,
        igbo: m.text,
        english: m.english ?? undefined,
        correction: m.correction,
        correctionNote: m.correctionNote,
        newWord: m.newWord,
      }
    : { role: "user", text: m.text };
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked: the setting lasts for this visit only
  }
}

function readPersona(): TutorPersona {
  try {
    const stored = localStorage.getItem(PERSONA_KEY);
    if (stored === "gentle" || stored === "aunty" || stored === "strict") return stored;
  } catch {
    // storage blocked
  }
  return "gentle";
}

/** The glow used only while the tutor is speaking. */
const SPEAKING_GLOW = "shadow-[0_0_0_3px_hsl(var(--primary)),0_0_28px_6px_hsl(var(--primary)/0.7)]";

/** The tutor's avatar: a plain disc that glows and pulses only while speaking. */
function TutorAvatar({ speaking, persona }: { speaking: boolean; persona: TutorPersona }) {
  return (
    <span
      aria-hidden
      className={`grid place-items-center shrink-0 w-9 h-9 rounded-full border-2 border-foreground font-display font-bold text-sm transition-shadow duration-300 ${
        persona === "strict" ? "bg-secondary" : "bg-primary"
      } ${speaking ? `${SPEAKING_GLOW} animate-pulse` : ""}`}
    >
      {PERSONAS[persona].name.split(" ").pop()?.charAt(0)}
    </span>
  );
}

export function AiConversation({ level, onLevelChange }: AiConversationProps) {
  const [persona, setPersona] = useState<TutorPersona>(readPersona);
  const [messages, setMessages] = useState<Message[]>(() => [greetingFor(readPersona())]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSend, setAutoSend] = useState(() => readFlag(AUTO_SEND_KEY, false));
  const [autoSpeak, setAutoSpeak] = useState(() => readFlag(AUTO_SPEAK_KEY, true));
  const [showCharPad, setShowCharPad] = useState(false);
  /** Set when the server answered with canned replies instead of the AI tutor */
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  /** The saved conversation this screen belongs to; null until the first reply is saved. */
  const [chatId, setChatId] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(() => readFlag(HISTORY_OPEN_KEY, true));
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const history = useTutorChats();
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

  /** True while this text is the one being spoken aloud. */
  const isSpeakingText = (text: string | undefined) =>
    !!text && tts.isSpeaking && tts.activeText === text.trim();

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
            persona,
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

        // Save the turn (text only). A new conversation gets its row on its first reply.
        if (history.signedIn) {
          const id = chatId ?? (await history.createChat(userText, level));
          if (id) {
            if (!chatId) setChatId(id);
            void history.saveMessages(id, [
              { role: "user", text: userText },
              {
                role: "assistant",
                text: assistantMessage.igbo ?? assistantMessage.text,
                english: assistantMessage.english,
                correction: assistantMessage.correction,
                correctionNote: assistantMessage.correctionNote,
                newWord: assistantMessage.newWord,
              },
            ]);
          }
        }
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
    [userInput, loading, messages, level, persona, clearTranscript, autoSpeak, speakReply, history, chatId]
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

  const newChat = (withPersona: TutorPersona = persona) => {
    stopSpeaking();
    setMessages([greetingFor(withPersona)]);
    setChatId(null);
    setFallbackNotice(null);
    setUserInput("");
    setMobileHistoryOpen(false);
  };

  const openChat = async (chat: TutorChat) => {
    setMobileHistoryOpen(false);
    if (chat.id === chatId) return;
    stopSpeaking();
    setOpeningChat(true);
    try {
      const saved = await history.loadMessages(chat.id);
      setMessages([greetingFor(persona), ...saved.map(fromSaved)]);
      setChatId(chat.id);
      setFallbackNotice(null);
      const savedLevel = chat.level as TutorLevel;
      if (savedLevel !== level && LEVELS.some((l) => l.value === savedLevel)) onLevelChange(savedLevel);
    } catch {
      toast.error("Couldn't open that chat. Try again.");
    } finally {
      setOpeningChat(false);
    }
  };

  const deleteChat = async (chat: TutorChat) => {
    try {
      await history.deleteChat(chat.id);
      if (chat.id === chatId) newChat();
    } catch {
      toast.error("Couldn't delete that chat.");
    }
  };

  /** Changing level starts a fresh conversation at that level; the current one stays saved. */
  const changeLevel = (next: TutorLevel) => {
    if (next === level) return;
    onLevelChange(next);
    newChat();
  };

  /** A new personality starts a fresh conversation with its own greeting. */
  const changePersona = (next: TutorPersona) => {
    if (next === persona) return;
    setPersona(next);
    writeSetting(PERSONA_KEY, next);
    newChat(next);
  };

  const toggleHistory = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const next = !historyOpen;
      setHistoryOpen(next);
      writeSetting(HISTORY_OPEN_KEY, String(next));
    } else {
      setMobileHistoryOpen(true);
    }
  };

  const historyPanel = (
    <ChatHistory
      signedIn={history.signedIn}
      chats={history.chats}
      loading={history.loadingChats}
      activeChatId={chatId}
      onNewChat={() => newChat()}
      onOpenChat={(chat) => void openChat(chat)}
      onDeleteChat={(chat) => void deleteChat(chat)}
    />
  );

  const freshChat = messages.length === 1;
  const tutorSpeaking = messages.some((m) => m.role === "assistant" && isSpeakingText(m.igbo));
  const current = PERSONAS[persona];

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Past chats: a sidebar on wide screens, a drawer on phones */}
      {historyOpen && (
        <aside className="hidden lg:block w-72 shrink-0 border-r-3 border-foreground bg-card">{historyPanel}</aside>
      )}
      <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="left" className="w-[85%] max-w-xs p-0 pt-10 bg-card">
          <SheetTitle className="sr-only">Your chats</SheetTitle>
          {historyPanel}
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 min-w-0 flex-col">
        {/* Header */}
        <header className="border-b-3 border-foreground bg-background">
          <div className="mx-auto max-w-3xl px-4 py-2 flex flex-wrap items-center gap-2">
            <Link
              to="/practice"
              className="p-2 -ml-2 rounded-lg border-2 border-transparent hover:border-foreground hover:bg-muted"
              aria-label="Back to Practice Hub"
            >
              <ArrowLeft size={18} />
            </Link>
            <button
              type="button"
              onClick={toggleHistory}
              className="p-2 rounded-lg border-2 border-transparent hover:border-foreground hover:bg-muted"
              aria-label="Show or hide your chats"
            >
              <PanelLeft size={18} />
            </button>
            <TutorAvatar speaking={tutorSpeaking} persona={persona} />
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold leading-tight truncate">{current.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {loading ? "Na-eche… (thinking)" : tutorSpeaking ? "Speaking…" : current.blurb}
              </p>
            </div>

            <div className="flex gap-1" role="group" aria-label="Tutor personality">
              {(Object.keys(PERSONAS) as TutorPersona[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => changePersona(p)}
                  aria-pressed={persona === p}
                  title={PERSONAS[p].blurb}
                  className={`px-2.5 py-1 rounded-lg border-2 font-display text-xs font-semibold transition-all ${
                    persona === p
                      ? "bg-primary border-foreground shadow-brutal-sm"
                      : "border-transparent hover:border-foreground hover:bg-muted"
                  }`}
                >
                  {PERSONAS[p].label}
                </button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg border-2 border-transparent hover:border-foreground hover:bg-muted"
                  aria-label="Chat settings"
                >
                  <Settings2 size={18} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-4 border-2 border-foreground shadow-brutal">
                <div className="space-y-2">
                  <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Level</p>
                  <div className="flex gap-1">
                    {LEVELS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => changeLevel(option.value)}
                        aria-pressed={level === option.value}
                        className={`flex-1 px-2 py-1 rounded-lg border-2 text-xs font-display font-semibold ${
                          level === option.value ? "bg-primary border-foreground" : "border-foreground/20 hover:bg-muted"
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
                      writeSetting(AUTO_SPEAK_KEY, String(v));
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
                      writeSetting(AUTO_SEND_KEY, String(v));
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => newChat()}
                  className="brutal-button bg-card w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Trash2 size={14} /> Start a new chat
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
            {openingChat && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Opening chat…
              </p>
            )}
            {fallbackNotice && (
              <p className="text-sm px-3 py-2 rounded-lg border-2 border-amber-500 bg-amber-500/10">{fallbackNotice}</p>
            )}

            {messages.map((message, index) => {
              if (message.role === "user") {
                return (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[85%] rounded-xl border-2 border-foreground bg-primary px-4 py-2.5 text-primary-foreground shadow-brutal-sm whitespace-pre-wrap">
                      {message.text}
                    </p>
                  </div>
                );
              }
              const speaking = isSpeakingText(message.igbo);
              return (
                <div key={index} className="flex gap-3">
                  <TutorAvatar speaking={speaking} persona={persona} />
                  <div
                    className={`min-w-0 flex-1 rounded-xl border-2 border-foreground bg-card p-4 space-y-2 transition-shadow duration-300 ${
                      speaking ? SPEAKING_GLOW : "shadow-brutal-sm"
                    }`}
                  >
                    <p className="font-display text-lg font-semibold leading-relaxed">{message.igbo ?? message.text}</p>
                    {message.english && <p className="text-sm text-muted-foreground leading-relaxed">{message.english}</p>}
                    {message.correction && (
                      <div className="rounded-lg border-2 border-amber-500 bg-amber-500/10 px-3 py-2">
                        <p className="text-sm">
                          <span className="font-display font-bold">Better: </span>
                          <span className="font-medium">{message.correction}</span>
                        </p>
                        {message.correctionNote && (
                          <p className="text-xs text-muted-foreground mt-0.5">{message.correctionNote}</p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {message.newWord?.igbo && (
                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-foreground bg-secondary px-3 py-0.5 text-xs">
                          <span className="font-display font-bold">New word:</span>
                          <span className="font-semibold">{message.newWord.igbo}</span>
                          <span>· {message.newWord.english}</span>
                        </span>
                      )}
                      {message.igbo && (
                        <button
                          type="button"
                          onClick={() => speakReply(message.igbo!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground bg-background px-2.5 py-0.5 text-xs font-display font-semibold shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <AudioStateIcon state={audioStateFor(message.igbo, tts)} size={14} />
                          Listen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 items-center">
                <TutorAvatar speaking={false} persona={persona} />
                <span className="flex gap-1" aria-label="The tutor is thinking">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2.5 h-2.5 rounded-full border-2 border-foreground bg-primary animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              </div>
            )}

            {freshChat && !loading && (
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                {STARTERS.map((s) => (
                  <button
                    key={s.igbo}
                    type="button"
                    onClick={() => void sendMessage(s.igbo)}
                    className="brutal-card bg-card text-left px-4 py-3"
                  >
                    <span className="block font-display font-semibold">{s.igbo}</span>
                    <span className="block text-xs text-muted-foreground">{s.english}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t-3 border-foreground bg-background pb-[max(10px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-3xl px-4 space-y-2">
            {(isRecording || isTranscribing || captureError) && (
              <p className="text-xs px-1" aria-live="polite">
                {isRecording ? (
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    Listening… speak your whole message, then tap stop.
                  </span>
                ) : isTranscribing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Writing down what you said…
                  </span>
                ) : (
                  <span className="text-muted-foreground">{captureError}</span>
                )}
              </p>
            )}

            {showCharPad && (
              <div className="rounded-xl border-2 border-foreground bg-card p-2">
                <IgboCharacterPad onCharacterClick={insertCharacter} disabled={loading} compact />
              </div>
            )}

            <div
              className={`flex items-end gap-2 rounded-xl border-2 bg-card p-2 shadow-brutal ${
                isRecording ? "border-destructive" : "border-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => setShowCharPad((v) => !v)}
                className={`mb-0.5 h-10 shrink-0 rounded-lg border-2 px-2.5 text-sm font-display font-semibold ${
                  showCharPad ? "bg-secondary border-foreground" : "border-transparent hover:border-foreground hover:bg-muted"
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
                className={`brutal-button shrink-0 h-10 w-10 !p-0 flex items-center justify-center disabled:opacity-50 ${
                  isRecording ? "bg-destructive text-destructive-foreground" : "bg-secondary"
                }`}
              >
                {isTranscribing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isRecording ? (
                  <Square size={16} fill="currentColor" />
                ) : (
                  <Mic size={18} />
                )}
              </button>

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={loading || !userInput.trim()}
                aria-label="Send"
                className="brutal-button shrink-0 h-10 w-10 !p-0 flex items-center justify-center bg-primary disabled:opacity-40"
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
    </div>
  );
}
