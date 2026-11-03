import { useRef, useState } from "react";
import { Loader2, Mic, RefreshCw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioStateIcon } from "@/components/AudioStateIcon";
import { useToast } from "@/hooks/use-toast";
import { useTTS } from "@/hooks/useTTS";
import { audioStateFor } from "@/lib/audioState";
import { regenerateClip, uploadRecording, type SpokenKind } from "@/lib/audioAdmin";

interface AudioControlsProps {
  /** Exactly the text learners hear for this item. */
  text: string;
  kind: SpokenKind;
  /** A human recording, if one has been added. */
  recordingUrl: string | null;
  /** Folder in the recordings bucket, e.g. "vocabulary". */
  folder: string;
  itemId: string;
  /** Save the item's audio_url (null removes the recording). */
  onRecordingChange: (url: string | null) => Promise<void>;
}

/**
 * Admin audio tools for one item: hear what learners hear, regenerate the AI clip,
 * or add a real voice recording, which then plays instead of the AI voice.
 */
export function AudioControls({ text, kind, recordingUrl, folder, itemId, onRecordingChange }: AudioControlsProps) {
  const { toast } = useToast();
  const tts = useTTS();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"regenerate" | "upload" | "remove" | null>(null);

  const play = () => {
    if (kind === "word") void tts.speakIgboWord(text, { recordedUrl: recordingUrl });
    else if (recordingUrl) void tts.speakIgboWord(text, { recordedUrl: recordingUrl });
    else void tts.speakSentence(text, { igbo: true });
  };

  const regenerate = async () => {
    setBusy("regenerate");
    try {
      await regenerateClip(text, kind);
      toast({ title: "New AI audio saved", description: recordingUrl ? "Learners still hear the recording while one is set." : undefined });
    } catch (e) {
      toast({ title: "Couldn't regenerate", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Choose an audio file", description: "MP3, M4A, WAV or WebM.", variant: "destructive" });
      return;
    }
    setBusy("upload");
    try {
      const url = await uploadRecording(file, folder, itemId);
      await onRecordingChange(url);
      toast({ title: "Recording saved", description: "Learners now hear this voice." });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeRecording = async () => {
    setBusy("remove");
    try {
      await onRecordingChange(null);
      toast({ title: "Recording removed", description: "Learners hear the AI voice again." });
    } catch (e) {
      toast({ title: "Couldn't remove", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const state = audioStateFor(text, tts);

  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="sm" onClick={play} aria-label="Play what learners hear" title="Play what learners hear">
        <AudioStateIcon state={state} size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void regenerate()}
        disabled={busy !== null}
        aria-label="Regenerate AI audio"
        title="Regenerate the AI audio (uses credits once)"
      >
        {busy === "regenerate" ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
        aria-label={recordingUrl ? "Replace the recording" : "Upload a recording"}
        title={recordingUrl ? "Replace the recording" : "Upload a real voice recording"}
      >
        {busy === "upload" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
      </Button>
      {recordingUrl && (
        <>
          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 px-1" title="Has a human recording">
            <Mic size={12} /> Voice
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void removeRecording()}
            disabled={busy !== null}
            aria-label="Remove the recording"
            title="Remove the recording"
          >
            {busy === "remove" ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
          </Button>
        </>
      )}
      <input
        ref={fileRef}
        id={`recording-${folder}-${itemId}`}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
