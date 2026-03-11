import { useCallback, useState, useEffect, useRef } from "react";
import { getWords } from "@/lib/igboApi";

interface TTSOptions {
  rate?: number;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const igboAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingIgboRef = useRef(false);

  // Load voices (they load asynchronously in some browsers)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

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

  // Update speaking state periodically for English TTS; Igbo playback uses Audio events
  useEffect(() => {
    const checkSpeaking = () => {
      if (isPlayingIgboRef.current) return;
      if ('speechSynthesis' in window) {
        setIsSpeaking(window.speechSynthesis.speaking);
      }
    };

    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  const getEnglishVoice = useCallback((availableVoices: SpeechSynthesisVoice[]) => {
    if (availableVoices.length === 0) return null;

    // Priority 1: Google English voice
    const googleEnglish = availableVoices.find(v => 
      v.lang.startsWith('en') && v.name.toLowerCase().includes('google')
    );
    if (googleEnglish) return googleEnglish;

    // Priority 2: Any US or UK English voice
    const usUkEnglish = availableVoices.find(v => 
      v.lang === 'en-US' || v.lang === 'en-GB'
    );
    if (usUkEnglish) return usUkEnglish;

    // Priority 3: Any English voice
    const anyEnglish = availableVoices.find(v => v.lang.startsWith('en'));
    if (anyEnglish) return anyEnglish;

    // Fallback with warning
    console.warn('No English voice found, using default voice');
    return availableVoices[0];
  }, []);

  const speak = useCallback((text: string, options?: TTSOptions) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-speech not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.8; // Slower for learning
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US'; // Explicitly set language as backup

    // Get the best available English voice
    const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const selectedVoice = getEnglishVoice(currentVoices);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voices, getEnglishVoice]);

  const speakIgbo = useCallback(async (text: string) => {
    const trimmed = text?.trim();
    if (!trimmed) return;

    // Cancel any current playback
    window.speechSynthesis?.cancel();
    if (igboAudioRef.current) {
      igboAudioRef.current.pause();
      igboAudioRef.current.currentTime = 0;
      igboAudioRef.current = null;
    }
    isPlayingIgboRef.current = false;

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

    const audio = new Audio(first.pronunciation);
    igboAudioRef.current = audio;
    isPlayingIgboRef.current = true;
    setIsSpeaking(true);

    audio.onended = () => {
      isPlayingIgboRef.current = false;
      igboAudioRef.current = null;
      setIsSpeaking(false);
    };
    audio.onerror = () => {
      isPlayingIgboRef.current = false;
      igboAudioRef.current = null;
      setIsSpeaking(false);
      speak(trimmed);
    };

    audio.play().catch(() => {
      isPlayingIgboRef.current = false;
      igboAudioRef.current = null;
      setIsSpeaking(false);
      speak(trimmed);
    });
  }, [speak]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (igboAudioRef.current) {
      igboAudioRef.current.pause();
      igboAudioRef.current.currentTime = 0;
      igboAudioRef.current = null;
    }
    isPlayingIgboRef.current = false;
    setIsSpeaking(false);
  }, []);

  return { speak, speakIgbo, stop, isSpeaking };
}
