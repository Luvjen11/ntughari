import { useCallback, useRef, useState } from "react";
import { supabaseFunctionAuthHeaders } from "@/lib/supabaseFunctions";

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

  const transcribeWithServer = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || audioBlob.size === 0) return null;

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(`${supabaseUrl}/functions/v1/asr`, {
        method: "POST",
        headers: supabaseFunctionAuthHeaders(),
        body: formData,
      });

      if (!response.ok) return null;
      const data = (await response.json()) as { text?: string };
      return data.text?.trim() ?? null;
    } catch {
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const buildTranscriptFromParts = useCallback((interim = "") => {
    const finals = finalPartsRef.current.join(" ").trim();
    const combined = interim ? `${finals} ${interim}`.trim() : finals;
    return combined;
  }, []);

  const stopRecognition = useCallback(() => {
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
          finalPartsRef.current.push(piece);
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
      // Browser STT failed — full audio will go to server ASR on stop
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (isRecordingRef.current) {
        try {
          startRecognition();
        } catch {
          // Mic still recording; server ASR will handle on stop
        }
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
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
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        let text = browserText;
        if (audioBlob.size > 0) {
          const serverText = (await transcribeWithServer(audioBlob)) ?? "";
          if (serverText.length > text.length) {
            text = serverText;
          }
        }

        if (text) {
          setTranscript(text);
          transcriptRef.current = text;
        } else {
          setError("Couldn't hear you. Speak in one go, then tap Stop — or type your message.");
        }
      };

      isRecordingRef.current = true;
      setIsRecording(true);
      startRecognition();
      mediaRecorder.start(250);
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
