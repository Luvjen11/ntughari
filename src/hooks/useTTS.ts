import { useCallback, useState, useEffect, useRef } from "react";
import { getWords } from "@/lib/igboApi";
import { DEFAULT_YARNGPT_VOICE, type YarnGPTVoice } from "@/lib/ttsConstants";
import { supabaseFunctionHeaders } from "@/lib/supabaseFunctions";

interface TTSOptions {
  rate?: number;
}

interface SpeakSentenceOptions {
  voice?: YarnGPTVoice;
  rate?: number;
}

export interface IgboAudioOptions {
  /** Human-recorded pronunciation URL — highest priority */
  recordedUrl?: string | null;
  voice?: YarnGPTVoice;
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

    return availableVoices[0];
  }, []);

  /** Browser English TTS — for English text only, never for Igbo */
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
    (audioUrl: string, source: "recorded" | "igbo" | "yarngpt", onError: () => void) => {
      const audio = new Audio(audioUrl);
      igboAudioRef.current = audio;

      if (source === "igbo" || source === "recorded") {
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

  const fetchYarnGPTAudio = useCallback(async (text: string, voice: YarnGPTVoice): Promise<string | null> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    const response = await fetch(`${supabaseUrl}/functions/v1/tts`, {
      method: "POST",
      headers: supabaseFunctionHeaders(),
      body: JSON.stringify({ text, voice, responseFormat: "mp3" }),
    });

    if (!response.ok) return null;

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    audioBlobUrlRef.current = audioUrl;
    return audioUrl;
  }, []);

  const fetchIgboApiAudio = useCallback(async (text: string): Promise<string | null> => {
    const { words, error } = await getWords({ keyword: text });
    if (error || !words?.length) return null;
    const first = words.find((w) => w.pronunciation);
    return first?.pronunciation ?? null;
  }, []);

  /**
   * Play Igbo audio with priority: human recording → Igbo API → YarnGPT.
   * Never falls back to English browser voice for Igbo text.
   */
  const speakIgboWord = useCallback(
    async (text: string, options?: IgboAudioOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;

      cleanupAudio();
      window.speechSynthesis?.cancel();

      const tryYarnGPT = async () => {
        try {
          const url = await fetchYarnGPTAudio(trimmed, voice);
          if (url) {
            playAudioUrl(url, "yarngpt", () => {
              console.warn("YarnGPT playback failed for:", trimmed);
            });
            return true;
          }
        } catch {
          /* fall through */
        }
        return false;
      };

      const tryIgboApi = async () => {
        const url = await fetchIgboApiAudio(trimmed);
        if (url) {
          playAudioUrl(url, "igbo", () => tryYarnGPT());
          return true;
        }
        return false;
      };

      if (options?.recordedUrl) {
        playAudioUrl(options.recordedUrl, "recorded", () => tryIgboApi());
        return;
      }

      const gotApi = await tryIgboApi();
      if (!gotApi) {
        await tryYarnGPT();
      }
    },
    [cleanupAudio, playAudioUrl, fetchIgboApiAudio, fetchYarnGPTAudio]
  );

  /** @deprecated Prefer speakIgboWord with optional recordedUrl */
  const speakIgbo = useCallback(
    (text: string) => speakIgboWord(text),
    [speakIgboWord]
  );

  /** Full sentences — YarnGPT → Igbo API word lookup → silent (no English for Igbo) */
  const speakSentence = useCallback(
    async (text: string, options?: SpeakSentenceOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;

      cleanupAudio();
      window.speechSynthesis?.cancel();

      const gotYarn = await fetchYarnGPTAudio(trimmed, voice);
      if (gotYarn) {
        playAudioUrl(gotYarn, "yarngpt", () => speakIgboWord(trimmed, { voice }));
        return;
      }

      await speakIgboWord(trimmed, { voice });
    },
    [cleanupAudio, fetchYarnGPTAudio, playAudioUrl, speakIgboWord]
  );

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setIsSpeaking(false);
  }, [cleanupAudio]);

  return { speak, speakIgbo, speakIgboWord, speakSentence, stop, isSpeaking };
}
