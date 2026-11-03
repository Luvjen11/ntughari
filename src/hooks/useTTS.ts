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
  /** Skip the diacritics check: the caller knows the text is Igbo (e.g. "Onye kwe, chi ya ekwe"). */
  igbo?: boolean;
}

export interface IgboAudioOptions {
  recordedUrl?: string | null;
  voice?: YarnGPTVoice;
}

// ---- Shared across every component for the whole visit ----------------------
// Generated clips cost credits, so each one is fetched once per visit and replayed
// from memory. (The tts function also stores clips, so a new visit is free too.)

const MAX_CACHED_CLIPS = 200;
const clipUrls = new Map<string, string>();
const clipRequests = new Map<string, Promise<string | null>>();
const igboApiLookups = new Map<string, string | null>();

function rememberClip(key: string, url: string) {
  clipUrls.set(key, url);
  if (clipUrls.size > MAX_CACHED_CLIPS) {
    const [oldestKey, oldestUrl] = clipUrls.entries().next().value as [string, string];
    clipUrls.delete(oldestKey);
    URL.revokeObjectURL(oldestUrl);
  }
}

/** Generated Igbo speech for `text` as an object URL, or null if no provider could make it. */
async function fetchClipUrl(text: string, voice: YarnGPTVoice): Promise<string | null> {
  const trimmed = text.trim().normalize("NFC");
  if (!trimmed) return null;
  const key = `${voice}\u0000${trimmed}`;

  const cached = clipUrls.get(key);
  if (cached) {
    // Re-insert so the most recently played clips are the last to be evicted.
    clipUrls.delete(key);
    clipUrls.set(key, cached);
    return cached;
  }
  const pending = clipRequests.get(key);
  if (pending) return pending;

  const request = (async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return null;
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/tts`, {
        method: "POST",
        headers: supabaseFunctionHeaders(),
        body: JSON.stringify({ text: trimmed, voice, responseFormat: "mp3" }),
      });
      if (!response.ok) {
        // The tts function explains which providers it tried and why they failed.
        const detail = await response.text().catch(() => "");
        console.warn("TTS request failed:", response.status, detail.slice(0, 500));
        return null;
      }
      if (!(response.headers.get("content-type") ?? "").includes("audio")) {
        console.warn("TTS returned a non-audio response");
        return null;
      }
      const url = URL.createObjectURL(await response.blob());
      rememberClip(key, url);
      return url;
    } catch (err) {
      console.warn("TTS fetch error:", err);
      return null;
    }
  })().finally(() => clipRequests.delete(key));

  clipRequests.set(key, request);
  return request;
}

/** A human recording of a word from the Igbo API dictionary, remembered per visit. */
async function fetchIgboApiUrl(text: string): Promise<string | null> {
  const trimmed = text.trim().normalize("NFC");
  if (!trimmed) return null;
  // The Igbo API is a dictionary: it has recordings of words and short phrases,
  // and rejects whole sentences (400), so don't ask it for those.
  if (trimmed.split(/\s+/).length > 3) return null;
  if (igboApiLookups.has(trimmed)) return igboApiLookups.get(trimmed) ?? null;

  const { words, error } = await getWords({ keyword: trimmed, strict: trimmed.length <= 12 });
  let url: string | null = null;
  if (!error && words?.length) {
    const exact = words.find((w) => w.word.toLowerCase() === trimmed.toLowerCase() && w.pronunciation);
    url = exact?.pronunciation ?? words.find((w) => w.pronunciation)?.pronunciation ?? null;
  }
  igboApiLookups.set(trimmed, url);
  return url;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  /** True from a tap until the first sound plays: show a spinner. */
  const [isLoading, setIsLoading] = useState(false);
  /** The text currently loading or playing, so each button can tell if it is the active one. */
  const [activeText, setActiveText] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settleRef = useRef<((played: boolean) => void) | null>(null);
  const playingAudioRef = useRef(false);
  const generationRef = useRef(0);

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

  // Browser speech (English) has no end event we can always trust; poll it.
  useEffect(() => {
    const interval = setInterval(() => {
      if (playingAudioRef.current) return;
      if ("speechSynthesis" in window) setIsSpeaking(window.speechSynthesis.speaking);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  /** Stop whatever audio element is playing and release anyone waiting on it. */
  const haltAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    playingAudioRef.current = false;
    settleRef.current?.(false);
    settleRef.current = null;
  }, []);

  useEffect(() => haltAudio, [haltAudio]);

  /** Start a new request; anything still running from an older one is abandoned. */
  const begin = useCallback(
    (text: string) => {
      const generation = ++generationRef.current;
      haltAudio();
      window.speechSynthesis?.cancel();
      setActiveText(text);
      setIsLoading(true);
      return generation;
    },
    [haltAudio]
  );

  const finish = useCallback((generation: number) => {
    if (generation !== generationRef.current) return;
    playingAudioRef.current = false;
    setIsSpeaking(false);
    setIsLoading(false);
    setActiveText(null);
  }, []);

  /** Play one URL to the end. Resolves false if it could not play or was stopped. */
  const playAndWait = useCallback(
    (url: string, generation: number): Promise<boolean> =>
      new Promise((resolve) => {
        if (generation !== generationRef.current) return resolve(false);
        const audio = new Audio(url);
        audioRef.current = audio;
        settleRef.current = resolve;
        const settle = (played: boolean) => {
          if (settleRef.current === resolve) settleRef.current = null;
          if (audioRef.current === audio) audioRef.current = null;
          playingAudioRef.current = false;
          resolve(played);
        };
        audio.onplaying = () => {
          playingAudioRef.current = true;
          setIsLoading(false);
          setIsSpeaking(true);
        };
        audio.onended = () => settle(true);
        audio.onerror = () => settle(false);
        audio.play().catch(() => settle(false));
      }),
    []
  );

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

  /** English text through the browser's own voice (free, instant). */
  const speak = useCallback(
    (text: string, options?: TTSOptions) => {
      if (!("speechSynthesis" in window)) return;
      generationRef.current += 1;
      haltAudio();
      window.speechSynthesis.cancel();
      setIsLoading(false);
      setActiveText(null);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.85;
      utterance.lang = "en-US";
      const selectedVoice = getEnglishVoice(voices.length > 0 ? voices : window.speechSynthesis.getVoices());
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [voices, getEnglishVoice, haltAudio]
  );

  /**
   * A single Igbo word or letter sound: a human recording first (the item's own,
   * then the Igbo API dictionary), generated speech only if neither exists.
   */
  const speakIgboWord = useCallback(
    async (text: string, options?: IgboAudioOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;
      const generation = begin(trimmed);
      const stale = () => generation !== generationRef.current;

      if (options?.recordedUrl && (await playAndWait(options.recordedUrl, generation))) return finish(generation);
      if (stale()) return;

      const dictionaryUrl = await fetchIgboApiUrl(trimmed);
      if (stale()) return;
      if (dictionaryUrl && (await playAndWait(dictionaryUrl, generation))) return finish(generation);
      if (stale()) return;

      const clipUrl = await fetchClipUrl(trimmed, voice);
      if (stale()) return;
      if (clipUrl) await playAndWait(clipUrl, generation);
      finish(generation);
    },
    [begin, finish, playAndWait]
  );

  const speakIgbo = useCallback((text: string) => speakIgboWord(text), [speakIgboWord]);

  /** Igbo phrases and sentences: generated speech chunk by chunk, never an English voice. */
  const speakSentence = useCallback(
    async (text: string, options?: SpeakSentenceOptions) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      if (!options?.igbo && !looksLikeIgbo(trimmed)) {
        speak(trimmed, { rate: options?.rate });
        return;
      }

      const voice = options?.voice ?? DEFAULT_YARNGPT_VOICE;
      const generation = begin(trimmed);
      const stale = () => generation !== generationRef.current;
      const chunks = splitForTTS(trimmed);
      let anyPlayed = false;

      // Ask for the first chunk now and each next chunk while the current one plays.
      let nextClip = fetchClipUrl(chunks[0], voice);
      for (let i = 0; i < chunks.length; i++) {
        const clipUrl = await nextClip;
        if (stale()) return;
        if (i + 1 < chunks.length) nextClip = fetchClipUrl(chunks[i + 1], voice);
        if (clipUrl && (await playAndWait(clipUrl, generation))) anyPlayed = true;
        if (stale()) return;
      }

      // Nothing could be generated: a short phrase may still have a dictionary recording.
      // (Never re-request generated speech here: that would bill the same text twice.)
      if (!anyPlayed) {
        const dictionaryUrl = await fetchIgboApiUrl(trimmed);
        if (stale()) return;
        if (dictionaryUrl) await playAndWait(dictionaryUrl, generation);
      }
      finish(generation);
    },
    [speak, begin, finish, playAndWait]
  );

  /** Story narration: English → browser voice; Igbo → generated speech */
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

  /** Fetch a sentence's audio ahead of time without playing it. */
  const prefetchSentence = useCallback((text: string, voice: YarnGPTVoice = DEFAULT_YARNGPT_VOICE) => {
    for (const chunk of splitForTTS(text.trim())) void fetchClipUrl(chunk, voice);
  }, []);

  /** Look up a word's free dictionary recording ahead of time (never generates paid audio). */
  const prefetchDictionary = useCallback((text: string) => {
    void fetchIgboApiUrl(text);
  }, []);

  const stop = useCallback(() => {
    const generation = ++generationRef.current;
    haltAudio();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    finish(generation);
  }, [haltAudio, finish]);

  return {
    speak,
    speakIgbo,
    speakIgboWord,
    speakSentence,
    speakNarration,
    prefetchSentence,
    prefetchDictionary,
    stop,
    isSpeaking,
    isLoading,
    activeText,
  };
}
