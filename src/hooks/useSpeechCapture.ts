import { useCallback, useRef, useState } from "react";
import { userFunctionAuthHeaders } from "@/lib/supabaseFunctions";

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Ordered by preference; iOS Safari only records audio/mp4.
const RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return RECORDER_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

function fileNameForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "recording.m4a";
  if (mimeType.includes("ogg")) return "recording.ogg";
  return "recording.webm";
}

export function useSpeechCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const finalPartsRef = useRef<string[]>([]);
  const isRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signInRequiredRef = useRef(false);

  const transcribeWithServer = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    signInRequiredRef.current = false;
    if (!supabaseUrl || audioBlob.size === 0) return null;

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, fileNameForMimeType(audioBlob.type));

      const response = await fetch(`${supabaseUrl}/functions/v1/asr`, {
        method: "POST",
        headers: await userFunctionAuthHeaders(),
        body: formData,
      });

      if (response.status === 401) signInRequiredRef.current = true;
      if (!response.ok) return null;
      const data = (await response.json()) as { text?: string };
      return data.text?.trim() ?? null;
    } catch {
      return null;
    }
  }, []);

  const buildTranscriptFromParts = useCallback((interim = "") => {
    const finals = finalPartsRef.current.join(" ").trim();
    return interim ? `${finals} ${interim}`.trim() : finals;
  }, []);

  const stopRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort();
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    stopRecognition();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [stopRecognition]);

  const startRecognition = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition || !isRecordingRef.current) return;

    const recognition = new Recognition();
    recognition.lang = "ig-NG";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (!piece) continue;
        if (result.isFinal) {
          const last = finalPartsRef.current[finalPartsRef.current.length - 1];
          if (last !== piece) {
            finalPartsRef.current.push(piece);
          }
        } else {
          interim += piece;
        }
      }
      const combined = buildTranscriptFromParts(interim);
      if (combined) {
        transcriptRef.current = combined;
        setTranscript(combined);
      }
    };

    recognition.onerror = () => {
      // Browser STT is a live preview only; server ASR handles the final transcript.
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (isRecordingRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (isRecordingRef.current) {
            try {
              startRecognition();
            } catch {
              // Server ASR will handle on stop
            }
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [buildTranscriptFromParts]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    finalPartsRef.current = [];

    if (typeof MediaRecorder === "undefined") {
      setError("Voice recording isn't supported in this browser. Try Chrome, or type your answer instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Let the browser pick its default when none of our preferred types are supported (older iOS).
      const mimeType = pickRecorderMimeType();
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        isRecordingRef.current = false;
        setIsRecording(false);
        stopRecognition();

        const browserText = buildTranscriptFromParts().trim();
        const blobType = mediaRecorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];

        setIsTranscribing(true);
        const serverText = audioBlob.size > 0 ? ((await transcribeWithServer(audioBlob)) ?? "").trim() : "";
        setIsTranscribing(false);

        // Server ASR is the source of truth for Igbo; the browser transcript is a
        // live preview only and is never merged in (browser STT has no real Igbo
        // support and produces garbled English guesses).
        const text = serverText || browserText;

        if (signInRequiredRef.current) {
          setError("Sign in to use Igbo voice transcription — browser preview only for now.");
        }
        if (text) {
          setTranscript(text);
          transcriptRef.current = text;
        } else if (!signInRequiredRef.current) {
          setError(
            "Couldn't hear you clearly. Speak your full sentence, tap Stop, then try again in a quiet space."
          );
        }
      };

      isRecordingRef.current = true;
      setIsRecording(true);
      startRecognition();
      mediaRecorder.start();
    } catch {
      isRecordingRef.current = false;
      setError("Microphone access denied. Allow the mic in browser settings.");
      setIsRecording(false);
    }
  }, [buildTranscriptFromParts, startRecognition, stopRecognition, transcribeWithServer]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    transcriptRef.current = "";
    finalPartsRef.current = [];
    setError(null);
  }, []);

  return {
    isRecording,
    isTranscribing,
    transcript,
    setTranscript,
    error,
    toggleRecording,
    clearTranscript,
    hasSpeechRecognition: !!getSpeechRecognition(),
  };
}
