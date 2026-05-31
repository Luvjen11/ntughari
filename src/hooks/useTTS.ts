import { useCallback, useState, useEffect, useRef } from "react";
import { getWords } from "@/lib/igboApi";
import { DEFAULT_YARNGPT_VOICE, type YarnGPTVoice } from "@/lib/ttsConstants";

interface TTSOptions {
  rate?: number;
}

interface SpeakSentenceOptions {
  voice?: YarnGPTVoice;
  rate?: number;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const igboAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const isPlayingIgboRef = useRef(false);
  const isPlayingYarnGPTRef = useRef(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const checkSpeaking = () => {
      if (isPlayingIgboRef.current || isPlayingYarnGPTRef.current) return;
      if ("speechSynthesis" in window) {
        setIsSpeaking(window.speechSynthesis.speaking);
      }
    };

    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  const cleanupAudio = useCallback(() => {
    if (igboAudioRef.current) {
      igboAudioRef.current.pause();
      igboAudioRef.current.currentTime = 0;
      igboAudioRef.current = null;
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    isPlayingIgboRef.current = false;
    isPlayingYarnGPTRef.current = false;
  }, []);

  const getEnglishVoice = useCallback((availableVoices: SpeechSynthesisVoice[]) => {
    if (availableVoices.length === 0) return null;

    const googleEnglish = availableVoices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")
    );
    if (googleEnglish) return googleEnglish;

    const usUkEnglish = availableVoices.find((v) => v.lang === "en-US" || v.lang === "en-GB");
    if (usUkEnglish) return usUkEnglish;

    const anyEnglish = availableVoices.find((v) => v.lang.startsWith("en"));
    if (anyEnglish) return anyEnglish;

    console.warn("No English voice found, using default voice");
    return availableVoices[0];
  }, []);

  const speak = useCallback(
    (text: string, options?: TTSOptions) => {
      if (!("speechSynthesis" in window)) {
        console.warn("Text-to-speech not supported in this browser");
        return;
      }

      cleanupAudio();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = "en-US";

      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const selectedVoice = getEnglishVoice(currentVoices);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [voices, getEnglishVoice, cleanupAudio]
  );

  const playAudioUrl = useCallback(
    (audioUrl: string, source: "igbo" | "yarngpt", onError: () => void) => {
      const audio = new Audio(audioUrl);
      igboAudioRef.current = audio;

      if (source === "igbo") {
        isPlayingIgboRef.current = true;
      } else {
        isPlayingYarnGPTRef.current = true;
      }
      setIsSpeaking(true);

      audio.onended = () => {
        cleanupAudio();
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        cleanupAudio();
        setIsSpeaking(false);
        onError();
      };

      audio.play().catch(() => {
        cleanupAudio();
        setIsSpeaking(false);
        onError();
      });
    },
    [cleanupAudio]
  );

  const speakIgbo = useCallback(
    async (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      cleanupAudio();
      window.speechSynthesis?.cancel();

      const { words, error } = await getWords({ keyword: trimmed });
      if (error || !words?.length) {
        speak(trimmed);
        return;
      }

      const first = words.find((w) => w.pronunciation);
      if (!first?.pronunciation) {
        speak(trimmed);
        return;
      }

      playAudioUrl(first.pronunciation, "igbo", () => speak(trimmed));
    },
    [speak, cleanupAudio, playAudioUrl]
  );

  const speakSentence = useCallback(
    async (text: string, options?: SpeakSentenceOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;

      cleanupAudio();
      window.speechSynthesis?.cancel();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase not configured, falling back to Igbo API TTS");
        speakIgbo(trimmed);
        return;
      }

      const ttsFunctionUrl = `${supabaseUrl}/functions/v1/tts`;

      try {
        const response = await fetch(ttsFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            text: trimmed,
            voice,
            responseFormat: "mp3",
          }),
        });

        if (!response.ok) {
          console.warn("YarnGPT TTS unavailable, falling back to Igbo API:", response.status);
          speakIgbo(trimmed);
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioBlobUrlRef.current = audioUrl;

        playAudioUrl(audioUrl, "yarngpt", () => speakIgbo(trimmed));
      } catch (error) {
        console.warn("YarnGPT TTS fetch error, falling back to Igbo API:", error);
        speakIgbo(trimmed);
      }
    },
    [speakIgbo, cleanupAudio, playAudioUrl]
  );

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setIsSpeaking(false);
  }, [cleanupAudio]);

  return { speak, speakIgbo, speakSentence, stop, isSpeaking };
}
