import { useCallback, useRef, useState } from "react";
import { supabaseFunctionAuthHeaders } from "@/lib/supabaseFunctions";

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } }; length: number }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

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
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const transcriptRef = useRef("");

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

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    transcriptRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        let text = transcriptRef.current.trim();
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        if (!text && audioBlob.size > 0) {
          text = (await transcribeWithServer(audioBlob)) ?? "";
        }

        if (text) {
          setTranscript(text);
          transcriptRef.current = text;
        } else {
          setError("Couldn't hear you. Try again, speak clearly, or use self-check below.");
        }
      };

      const Recognition = getSpeechRecognition();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = "ig-NG";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let combined = "";
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript;
          }
          const t = combined.trim();
          if (t) {
            transcriptRef.current = t;
            setTranscript(t);
          }
        };
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
        }
      }

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied. Allow the mic in browser settings.");
      setIsRecording(false);
    }
  }, [transcribeWithServer]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    transcriptRef.current = "";
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
