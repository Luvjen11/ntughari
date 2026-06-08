import { useCallback, useState, useEffect, useRef } from "react";
import { getWords } from "@/lib/igboApi";
import { DEFAULT_YARNGPT_VOICE, type YarnGPTVoice } from "@/lib/ttsConstants";
import { supabaseFunctionHeaders } from "@/lib/supabaseFunctions";
import { looksLikeIgbo, splitForTTS } from "@/lib/ttsUtils";

interface TTSOptions {
  rate?: number;
}

interface SpeakSentenceOptions {
  voice?: YarnGPTVoice;
  rate?: number;
}

export interface IgboAudioOptions {
  recordedUrl?: string | null;
  voice?: YarnGPTVoice;
}

/** Skip YarnGPT for single letters — API often 500s; Igbo API works better for words */
const MIN_YARNGPT_LENGTH = 3;

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const igboAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const isPlayingIgboRef = useRef(false);
  const isPlayingYarnGPTRef = useRef(false);
  const speakGenerationRef = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) setVoices(availableVoices);
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
    return availableVoices.find((v) => v.lang.startsWith("en")) ?? availableVoices[0];
  }, []);

  const speak = useCallback(
    (text: string, options?: TTSOptions) => {
      if (!("speechSynthesis" in window)) return;

      cleanupAudio();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.85;
      utterance.lang = "en-US";

      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      const selectedVoice = getEnglishVoice(currentVoices);
      if (selectedVoice) utterance.voice = selectedVoice;

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

  const playAudioUrlAndWait = useCallback(
    (audioUrl: string, source: "recorded" | "igbo" | "yarngpt"): Promise<boolean> =>
      new Promise((resolve) => {
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
          resolve(true);
        };
        audio.onerror = () => {
          cleanupAudio();
          setIsSpeaking(false);
          resolve(false);
        };
        audio.play().catch(() => {
          cleanupAudio();
          setIsSpeaking(false);
          resolve(false);
        });
      }),
    [cleanupAudio]
  );

  const fetchYarnGPTAudio = useCallback(async (text: string, voice: YarnGPTVoice): Promise<string | null> => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_YARNGPT_LENGTH) return null;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/tts`, {
        method: "POST",
        headers: supabaseFunctionHeaders(),
        body: JSON.stringify({ text: trimmed, voice, responseFormat: "mp3" }),
      });

      if (!response.ok) {
        console.warn("YarnGPT TTS request failed:", response.status);
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("audio")) {
        console.warn("YarnGPT TTS returned non-audio response");
        return null;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioBlobUrlRef.current = audioUrl;
      return audioUrl;
    } catch (err) {
      console.warn("YarnGPT TTS fetch error:", err);
      return null;
    }
  }, []);

  const fetchIgboApiAudio = useCallback(async (text: string): Promise<string | null> => {
    const trimmed = text.trim().normalize("NFC");
    if (!trimmed) return null;

    const { words, error } = await getWords({ keyword: trimmed, strict: trimmed.length <= 12 });
    if (error || !words?.length) return null;

    const exact = words.find(
      (w) => w.word.toLowerCase() === trimmed.toLowerCase() && w.pronunciation
    );
    if (exact?.pronunciation) return exact.pronunciation;

    const first = words.find((w) => w.pronunciation);
    return first?.pronunciation ?? null;
  }, []);

  const speakIgboWord = useCallback(
    async (text: string, options?: IgboAudioOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;
      cleanupAudio();
      window.speechSynthesis?.cancel();

      const tryYarnGPT = async () => {
        if (trimmed.length < MIN_YARNGPT_LENGTH) return false;
        const url = await fetchYarnGPTAudio(trimmed, voice);
        if (!url) return false;
        playAudioUrl(url, "yarngpt", () => undefined);
        return true;
      };

      const tryIgboApi = async () => {
        const url = await fetchIgboApiAudio(trimmed);
        if (!url) return false;
        playAudioUrl(url, "igbo", () => {
          void tryYarnGPT();
        });
        return true;
      };

      if (options?.recordedUrl) {
        playAudioUrl(options.recordedUrl, "recorded", () => {
          void tryIgboApi();
        });
        return;
      }

      const gotApi = await tryIgboApi();
      if (!gotApi) {
        await tryYarnGPT();
      }
    },
    [cleanupAudio, playAudioUrl, fetchIgboApiAudio, fetchYarnGPTAudio]
  );

  const speakIgbo = useCallback((text: string) => speakIgboWord(text), [speakIgboWord]);

  /** Igbo phrases/sentences — chunked YarnGPT, then Igbo API, never English for Igbo text */
  const speakSentence = useCallback(
    async (text: string, options?: SpeakSentenceOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      if (!looksLikeIgbo(trimmed)) {
        speak(trimmed, { rate: options?.rate });
        return;
      }

      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;
      const generation = ++speakGenerationRef.current;

      cleanupAudio();
      window.speechSynthesis?.cancel();

      const chunks = splitForTTS(trimmed);
      let anyPlayed = false;

      for (const chunk of chunks) {
        if (generation !== speakGenerationRef.current) return;

        const url = await fetchYarnGPTAudio(chunk, voice);
        if (url) {
          const ok = await playAudioUrlAndWait(url, "yarngpt");
          if (ok) {
            anyPlayed = true;
            continue;
          }
        }

        const apiUrl = await fetchIgboApiAudio(chunk);
        if (apiUrl) {
          const ok = await playAudioUrlAndWait(apiUrl, "igbo");
          if (ok) anyPlayed = true;
        }
      }

      if (!anyPlayed && generation === speakGenerationRef.current) {
        await speakIgboWord(trimmed, { voice });
      }
    },
    [
      speak,
      cleanupAudio,
      fetchYarnGPTAudio,
      fetchIgboApiAudio,
      playAudioUrlAndWait,
      speakIgboWord,
    ]
  );

  /** Story narration: English → browser TTS; Igbo → chunked YarnGPT */
  const speakNarration = useCallback(
    async (text: string, options?: SpeakSentenceOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      if (!looksLikeIgbo(trimmed)) {
        speak(trimmed, { rate: options?.rate ?? 0.85 });
        return;
      }

      await speakSentence(trimmed, options);
    },
    [speak, speakSentence]
  );

  const stop = useCallback(() => {
    speakGenerationRef.current += 1;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setIsSpeaking(false);
  }, [cleanupAudio]);

  return {
    speak,
    speakIgbo,
    speakIgboWord,
    speakSentence,
    speakNarration,
    stop,
    isSpeaking,
  };
}
