import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { supabaseFunctionHeaders } from "@/lib/supabaseFunctions";
import { DEFAULT_YARNGPT_VOICE } from "@/lib/ttsConstants";
import { looksLikeIgbo, splitForTTS } from "@/lib/ttsUtils";
import { proverbText } from "@/lib/proverbs";
import { letterPhrase } from "@/lib/igboLetters";

const CONCURRENCY = 2;

type SourceId = "proverbs" | "letters" | "phrases" | "vocabWords" | "vocabExamples" | "letterExamples" | "stories";

const SOURCE_LABELS: Record<SourceId, string> = {
  proverbs: "Proverbs (whole proverb and opening)",
  letters: "Alphabet letters (sound with an example word)",
  phrases: "Phrases",
  vocabExamples: "Vocabulary example sentences",
  vocabWords: "Vocabulary words",
  letterExamples: "Alphabet example words",
  stories: "Igbo story narration",
};

interface Tally {
  done: number;
  cached: number;
  generated: Record<string, number>;
  failed: number;
  lastError: string | null;
}

const EMPTY_TALLY: Tally = { done: 0, cached: 0, generated: {}, failed: 0, lastError: null };

/** Same chunking the app uses at playback time, so every clip lands on the cache key it will be looked up by. */
function sentenceChunks(text: string | null | undefined): string[] {
  return text?.trim() ? splitForTTS(text) : [];
}

function wordChunk(text: string | null | undefined): string[] {
  const t = text?.trim().normalize("NFC");
  return t ? [t] : [];
}

async function loadSources(): Promise<Record<SourceId, string[]>> {
  const [vocab, phrases, proverbs, letters, scenes, alphabet] = await Promise.all([
    supabase.from("vocabulary").select("igbo_word, example_sentence_igbo"),
    supabase.from("phrases").select("igbo_phrase"),
    supabase.from("proverbs").select("igbo_first, igbo_second").eq("is_published", true),
    supabase.from("letter_examples").select("letter_id, igbo_word"),
    supabase.from("story_scenes").select("narration_text").eq("is_active", true),
    supabase.from("letters").select("id, character"),
  ]);
  // Same phrase the Alphabet page asks for: the letter's sound with its first example word.
  const firstExample = new Map<string, string>();
  for (const ex of letters.data ?? []) if (!firstExample.has(ex.letter_id)) firstExample.set(ex.letter_id, ex.igbo_word);
  return {
    proverbs: (proverbs.data ?? []).flatMap((p) => [...sentenceChunks(proverbText(p)), ...sentenceChunks(p.igbo_first)]),
    letters: (alphabet.data ?? []).flatMap((l) => sentenceChunks(letterPhrase(l.character, firstExample.get(l.id)))),
    phrases: (phrases.data ?? []).flatMap((p) => sentenceChunks(p.igbo_phrase)),
    vocabExamples: (vocab.data ?? []).flatMap((v) => sentenceChunks(v.example_sentence_igbo)),
    vocabWords: (vocab.data ?? []).flatMap((v) => wordChunk(v.igbo_word)),
    letterExamples: (letters.data ?? []).flatMap((l) => wordChunk(l.igbo_word)),
    stories: (scenes.data ?? [])
      .filter((s) => looksLikeIgbo(s.narration_text))
      .flatMap((s) => sentenceChunks(s.narration_text)),
  };
}

async function generateOne(text: string): Promise<{ cache: string | null; provider: string | null; error?: string }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`, {
    method: "POST",
    headers: supabaseFunctionHeaders(),
    body: JSON.stringify({ text, voice: DEFAULT_YARNGPT_VOICE, responseFormat: "mp3" }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { cache: null, provider: null, error: `${res.status}: ${body.slice(0, 160)}` };
  }
  await res.arrayBuffer();
  return { cache: res.headers.get("X-TTS-Cache"), provider: res.headers.get("X-TTS-Provider") };
}

export default function AdminAudio() {
  const { data: sources, isLoading } = useQuery({ queryKey: ["admin-audio-sources"], queryFn: loadSources });
  const [selected, setSelected] = useState<Record<SourceId, boolean>>({
    proverbs: true,
    letters: true,
    phrases: true,
    vocabExamples: true,
    vocabWords: true,
    letterExamples: false,
    stories: true,
  });
  const [running, setRunning] = useState(false);
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const stopRef = useRef(false);

  const queue = useMemo(() => {
    if (!sources) return [];
    const texts = (Object.keys(sources) as SourceId[])
      .filter((id) => selected[id])
      .flatMap((id) => sources[id])
      .filter(Boolean);
    return [...new Set(texts)];
  }, [sources, selected]);

  const characters = queue.reduce((sum, t) => sum + t.length, 0);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    setTally(EMPTY_TALLY);
    let next = 0;

    const worker = async () => {
      while (!stopRef.current && next < queue.length) {
        const text = queue[next++];
        let result: Awaited<ReturnType<typeof generateOne>>;
        try {
          result = await generateOne(text);
        } catch (e) {
          result = { cache: null, provider: null, error: (e as Error).message };
        }
        setTally((t) => {
          const generated = { ...t.generated };
          if (result.cache === "miss" && result.provider) {
            generated[result.provider] = (generated[result.provider] ?? 0) + 1;
          }
          return {
            done: t.done + 1,
            cached: t.cached + (result.cache === "hit" ? 1 : 0),
            generated,
            failed: t.failed + (result.error ? 1 : 0),
            lastError: result.error ? `"${text.slice(0, 40)}" → ${result.error}` : t.lastError,
          };
        });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
  };

  const percent = queue.length ? Math.round((tally.done / queue.length) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">Generate Audio</h1>
          <p className="text-sm text-muted-foreground">
            Makes every clip once and stores it, so learners hear it instantly and it is never paid for twice.
          </p>
        </div>
      </div>

      <div className="brutal-card bg-card p-5 space-y-2 text-sm">
        <p>
          Clips are made by whichever voice the <code>tts</code> function is set to use. To use your
          ElevenLabs voice, set <code>TTS_PROVIDER=elevenlabs</code> and <code>ELEVENLABS_VOICE_ID</code> in
          Supabase secrets first. Clips made with ElevenLabs keep playing after the credits run out.
        </p>
        <p className="text-muted-foreground">
          Try one small source first and listen to the results before generating everything.
        </p>
      </div>

      <fieldset className="brutal-card bg-card p-5 space-y-3" disabled={running}>
        <legend className="font-display font-bold px-1">What to generate</legend>
        {isLoading && <p className="text-sm text-muted-foreground">Counting content…</p>}
        {sources &&
          (Object.keys(SOURCE_LABELS) as SourceId[]).map((id) => (
            <label key={id} className="flex items-center gap-3">
              <input
                id={`src-${id}`}
                type="checkbox"
                checked={selected[id]}
                onChange={(e) => setSelected((s) => ({ ...s, [id]: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="flex-1">{SOURCE_LABELS[id]}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{sources[id].length} clips</span>
            </label>
          ))}
        <p className="text-xs text-muted-foreground">
          Single words usually play a human recording from the Igbo API first, so generating them is optional.
        </p>
      </fieldset>

      <div className="brutal-card bg-secondary p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display font-bold">
            {queue.length} unique clips · {characters.toLocaleString()} characters
          </p>
          <p className="text-sm">Clips already stored cost nothing.</p>
        </div>

        <div className="h-3 bg-card rounded-full border-2 border-foreground overflow-hidden" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
          <div><dt className="text-foreground/70">Done</dt><dd className="font-display font-bold text-lg">{tally.done}/{queue.length}</dd></div>
          <div><dt className="text-foreground/70">Already stored</dt><dd className="font-display font-bold text-lg">{tally.cached}</dd></div>
          <div>
            <dt className="text-foreground/70">Generated</dt>
            <dd className="font-display font-bold text-lg">
              {Object.values(tally.generated).reduce((a, b) => a + b, 0)}
            </dd>
            {Object.entries(tally.generated).map(([provider, n]) => (
              <dd key={provider} className="text-xs">{provider}: {n}</dd>
            ))}
          </div>
          <div><dt className="text-foreground/70">Failed</dt><dd className="font-display font-bold text-lg">{tally.failed}</dd></div>
        </dl>

        {tally.lastError && <p className="text-xs break-words">Last error: {tally.lastError}</p>}

        {running ? (
          <Button onClick={() => (stopRef.current = true)} variant="outline" className="brutal-button bg-card w-full">
            <Square size={16} className="mr-2" /> Stop after current clips
          </Button>
        ) : (
          <Button onClick={() => void run()} disabled={!queue.length} className="brutal-button bg-primary w-full">
            <Play size={16} className="mr-2" /> Generate {queue.length} clips
          </Button>
        )}
      </div>
    </div>
  );
}
