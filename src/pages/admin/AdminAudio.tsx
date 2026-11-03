import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Play, Search, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { supabaseFunctionHeaders } from "@/lib/supabaseFunctions";
import { DEFAULT_YARNGPT_VOICE } from "@/lib/ttsConstants";
import { chargeableLength, looksLikeIgbo, MIN_YARNGPT_CHARGEABLE, splitForTTS } from "@/lib/ttsUtils";
import { proverbText } from "@/lib/proverbs";
import { letterPhrase } from "@/lib/igboLetters";
import { findDictionaryRecording } from "@/lib/dictionaryRecordings";

const CONCURRENCY = 2;
const CHECK_CONCURRENCY = 4;
/** Clips are made one at a time with a short gap, to stay under YarnGPT's rate limit. */
const GENERATE_GAP_MS = 1000;
/** After "too many requests", wait this long before each retry of the same clip, then give up on it. */
const RATE_LIMIT_WAITS_MS = [30_000, 60_000, 120_000];

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

/** A word that could get its human recording from the Igbo API dictionary. */
interface LookupItem {
  table: "vocabulary" | "letter_examples";
  id: string;
  word: string;
}

interface Sources {
  clips: Record<SourceId, string[]>;
  /** Words with no recording yet, to look up in the dictionary. */
  lookups: LookupItem[];
  /** Items skipped because they already have a recording. */
  recorded: number;
}

/** Same chunking the app uses at playback time, so every clip lands on the cache key it will be looked up by. */
function sentenceChunks(text: string | null | undefined): string[] {
  return text?.trim() ? splitForTTS(text) : [];
}

function wordChunk(text: string | null | undefined): string[] {
  const t = text?.trim().normalize("NFC");
  return t ? [t] : [];
}

async function loadSources(): Promise<Sources> {
  const [vocab, phrases, proverbs, examples, scenes, alphabet] = await Promise.all([
    supabase.from("vocabulary").select("id, igbo_word, example_sentence_igbo, audio_url"),
    supabase.from("phrases").select("igbo_phrase, audio_url"),
    supabase.from("proverbs").select("igbo_first, igbo_second, audio_url").eq("is_published", true),
    supabase.from("letter_examples").select("id, letter_id, igbo_word, audio_url"),
    supabase.from("story_scenes").select("narration_text").eq("is_active", true),
    supabase.from("letters").select("id, character"),
  ]);
  const vocabRows = vocab.data ?? [];
  const exampleRows = examples.data ?? [];
  // Same phrase the Alphabet page asks for: the letter's sound with its first example word.
  const firstExample = new Map<string, string>();
  for (const ex of exampleRows) if (!firstExample.has(ex.letter_id)) firstExample.set(ex.letter_id, ex.igbo_word);

  // Anything with a recording plays that instead, so it never needs AI audio.
  const withoutRecording = <T extends { audio_url: string | null }>(rows: T[]) => rows.filter((r) => !r.audio_url);
  const recorded =
    vocabRows.filter((r) => r.audio_url).length +
    exampleRows.filter((r) => r.audio_url).length +
    (phrases.data ?? []).filter((r) => r.audio_url).length +
    (proverbs.data ?? []).filter((r) => r.audio_url).length;

  return {
    clips: {
      proverbs: withoutRecording(proverbs.data ?? []).flatMap((p) => [
        ...sentenceChunks(proverbText(p)),
        ...sentenceChunks(p.igbo_first),
      ]),
      letters: (alphabet.data ?? []).flatMap((l) => sentenceChunks(letterPhrase(l.character, firstExample.get(l.id)))),
      phrases: withoutRecording(phrases.data ?? []).flatMap((p) => sentenceChunks(p.igbo_phrase)),
      vocabExamples: vocabRows.flatMap((v) => sentenceChunks(v.example_sentence_igbo)),
      vocabWords: withoutRecording(vocabRows).flatMap((v) => wordChunk(v.igbo_word)),
      letterExamples: withoutRecording(exampleRows).flatMap((l) => wordChunk(l.igbo_word)),
      stories: (scenes.data ?? [])
        .filter((s) => looksLikeIgbo(s.narration_text))
        .flatMap((s) => sentenceChunks(s.narration_text)),
    },
    lookups: [
      ...withoutRecording(vocabRows).map((v) => ({ table: "vocabulary" as const, id: v.id, word: v.igbo_word })),
      ...withoutRecording(exampleRows).map((e) => ({ table: "letter_examples" as const, id: e.id, word: e.igbo_word })),
    ].filter((item) => item.word?.trim()),
    recorded,
  };
}

function ttsRequest(body: Record<string, unknown>) {
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`, {
    method: "POST",
    headers: supabaseFunctionHeaders(),
    body: JSON.stringify({ voice: DEFAULT_YARNGPT_VOICE, responseFormat: "mp3", ...body }),
  });
}

async function isStored(text: string): Promise<boolean | null> {
  try {
    const res = await ttsRequest({ text, check: true });
    if (!res.ok) return null;
    const data = (await res.json()) as { stored?: boolean };
    return typeof data.stored === "boolean" ? data.stored : null;
  } catch {
    return null;
  }
}

interface GenerateResult {
  cache: string | null;
  provider: string | null;
  error?: string;
  rateLimited?: boolean;
}

async function generateOne(text: string): Promise<GenerateResult> {
  const res = await ttsRequest({ text });
  if (!res.ok) {
    const body = await res.text();
    let rateLimited = res.status === 429;
    try {
      rateLimited ||= (JSON.parse(body) as { rateLimited?: boolean }).rateLimited === true;
    } catch {
      // not JSON
    }
    return { cache: null, provider: null, error: `${res.status}: ${body.slice(0, 160)}`, rateLimited };
  }
  await res.arrayBuffer();
  return { cache: res.headers.get("X-TTS-Cache"), provider: res.headers.get("X-TTS-Provider") };
}

/** Rough credit cost: YarnGPT bills per character, at least 20 per clip. */
function estimateCredits(texts: string[]): number {
  return texts.reduce((sum, t) => sum + Math.max(chargeableLength(t), MIN_YARNGPT_CHARGEABLE), 0);
}

/** Waits in short steps so Stop still works during a long pause. */
async function pause(ms: number, stopRef: { current: boolean }) {
  const end = Date.now() + ms;
  while (!stopRef.current && Date.now() < end) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(500, end - Date.now())));
  }
}

/** Run `task` over `items` with a few at a time, stopping early when asked. */
async function runPool<T>(items: T[], size: number, stopRef: { current: boolean }, task: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (!stopRef.current && next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: size }, worker));
}

interface Tally {
  done: number;
  cached: number;
  generated: Record<string, number>;
  failed: number;
  lastError: string | null;
}

const EMPTY_TALLY: Tally = { done: 0, cached: 0, generated: {}, failed: 0, lastError: null };

interface LookupTally {
  done: number;
  found: number;
  none: number;
  failed: number;
}

const EMPTY_LOOKUP: LookupTally = { done: 0, found: 0, none: 0, failed: 0 };

export default function AdminAudio() {
  const queryClient = useQueryClient();
  const { data: sources, isLoading } = useQuery({ queryKey: ["admin-audio-sources"], queryFn: loadSources });
  const [selected, setSelected] = useState<Record<SourceId, boolean>>({
    proverbs: true,
    letters: true,
    phrases: true,
    vocabExamples: true,
    vocabWords: true,
    letterExamples: true,
    stories: true,
  });
  const [busy, setBusy] = useState<"lookup" | "check" | "generate" | null>(null);
  const stopRef = useRef(false);

  const [lookup, setLookup] = useState<LookupTally>(EMPTY_LOOKUP);
  /** Texts the free check found missing; null until a check has run for this selection. */
  const [missing, setMissing] = useState<string[] | null>(null);
  const [checked, setChecked] = useState({ done: 0, stored: 0, unknown: 0 });
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  /** Seconds the run is waiting after a rate limit, or null. */
  const [rateWait, setRateWait] = useState<number | null>(null);

  const queue = useMemo(() => {
    if (!sources) return [];
    const texts = (Object.keys(sources.clips) as SourceId[])
      .filter((id) => selected[id])
      .flatMap((id) => sources.clips[id])
      .filter(Boolean);
    return [...new Set(texts)];
  }, [sources, selected]);

  const toGenerate = missing ?? queue;

  const changeSelection = (id: SourceId, value: boolean) => {
    setSelected((s) => ({ ...s, [id]: value }));
    setMissing(null);
  };

  const runLookups = async () => {
    if (!sources) return;
    stopRef.current = false;
    setBusy("lookup");
    setLookup(EMPTY_LOOKUP);
    await runPool(sources.lookups, CONCURRENCY, stopRef, async (item) => {
      const { url, error } = await findDictionaryRecording(item.word);
      let saveFailed = false;
      if (url) {
        const { error: saveError } = await supabase.from(item.table).update({ audio_url: url }).eq("id", item.id);
        saveFailed = !!saveError;
      }
      setLookup((t) => ({
        done: t.done + 1,
        found: t.found + (url && !saveFailed ? 1 : 0),
        none: t.none + (!url && !error ? 1 : 0),
        failed: t.failed + (error || saveFailed ? 1 : 0),
      }));
    });
    setBusy(null);
    setMissing(null);
    await queryClient.invalidateQueries({ queryKey: ["admin-audio-sources"] });
    await queryClient.invalidateQueries({ queryKey: ["adminVocabulary"] });
  };

  const runCheck = async () => {
    stopRef.current = false;
    setBusy("check");
    setChecked({ done: 0, stored: 0, unknown: 0 });
    const notStored: string[] = [];
    await runPool(queue, CHECK_CONCURRENCY, stopRef, async (text) => {
      const stored = await isStored(text);
      if (stored !== true) notStored.push(text);
      setChecked((c) => ({
        done: c.done + 1,
        stored: c.stored + (stored === true ? 1 : 0),
        unknown: c.unknown + (stored === null ? 1 : 0),
      }));
    });
    // Keep queue order so related clips are made together.
    if (!stopRef.current) setMissing(queue.filter((t) => notStored.includes(t)));
    setBusy(null);
  };

  const runGenerate = async () => {
    const items = toGenerate;
    stopRef.current = false;
    setBusy("generate");
    setTally(EMPTY_TALLY);
    const notMade: string[] = [];
    let processed = 0;
    for (const text of items) {
      if (stopRef.current) break;
      let result: GenerateResult;
      for (let attempt = 0; ; attempt++) {
        try {
          result = await generateOne(text);
        } catch (e) {
          result = { cache: null, provider: null, error: (e as Error).message };
        }
        if (!result.rateLimited || attempt >= RATE_LIMIT_WAITS_MS.length || stopRef.current) break;
        setRateWait(RATE_LIMIT_WAITS_MS[attempt] / 1000);
        await pause(RATE_LIMIT_WAITS_MS[attempt], stopRef);
        setRateWait(null);
        if (stopRef.current) break;
      }
      processed++;
      if (result.error) notMade.push(text);
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
      if (result.cache === "miss") await pause(GENERATE_GAP_MS, stopRef);
    }
    setRateWait(null);
    setBusy(null);
    // What failed or wasn't reached stays queued, so the next run picks up only those.
    const left = new Set([...notMade, ...items.slice(processed)]);
    const stillMissing = queue.filter((t) => left.has(t));
    setMissing(stillMissing.length ? stillMissing : null);
    setChecked({ done: queue.length, stored: queue.length - stillMissing.length, unknown: 0 });
  };

  const generatedCount = Object.values(tally.generated).reduce((a, b) => a + b, 0);
  const generatePercent = toGenerate.length ? Math.round((tally.done / toGenerate.length) * 100) : 0;
  const lookupTotal = sources?.lookups.length ?? 0;

  const stopButton = (
    <Button onClick={() => (stopRef.current = true)} variant="outline" className="brutal-button bg-card w-full">
      <Square size={16} className="mr-2" /> Stop
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="brutal-button bg-card p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold">Audio</h1>
          <p className="text-sm text-muted-foreground">
            Every clip is made once and stored. After that it plays for everyone without spending credits.
          </p>
        </div>
      </div>

      {/* Step 1: free human recordings from the dictionary */}
      <section className="brutal-card bg-card p-5 space-y-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <BookOpenCheck size={18} /> 1. Save dictionary recordings <span className="text-sm font-normal text-muted-foreground">(free)</span>
        </h2>
        <p className="text-sm">
          Looks up vocabulary and alphabet example words in the Igbo API dictionary and saves the human
          recording for each exact match. Those words then play straight away, in a real voice, and never
          need AI audio.
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {isLoading ? "Counting words…" : `${lookupTotal} words without a recording`}
          {lookup.done > 0 && ` · checked ${lookup.done} · found ${lookup.found} · not in dictionary ${lookup.none}${lookup.failed ? ` · failed ${lookup.failed}` : ""}`}
        </p>
        {busy === "lookup" ? (
          stopButton
        ) : (
          <Button onClick={() => void runLookups()} disabled={busy !== null || !lookupTotal} className="brutal-button bg-primary w-full">
            <Search size={16} className="mr-2" /> Look up {lookupTotal} words
          </Button>
        )}
      </section>

      {/* Step 2 and 3: AI audio */}
      <fieldset className="brutal-card bg-card p-5 space-y-3" disabled={busy !== null}>
        <legend className="font-display font-bold px-1">2. Choose what needs AI audio</legend>
        {isLoading && <p className="text-sm text-muted-foreground">Counting content…</p>}
        {sources &&
          (Object.keys(SOURCE_LABELS) as SourceId[]).map((id) => (
            <label key={id} className="flex items-center gap-3">
              <input
                id={`src-${id}`}
                type="checkbox"
                checked={selected[id]}
                onChange={(e) => changeSelection(id, e.target.checked)}
                className="h-4 w-4"
              />
              <span className="flex-1">{SOURCE_LABELS[id]}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{sources.clips[id].length} clips</span>
            </label>
          ))}
        {sources && sources.recorded > 0 && (
          <p className="text-xs text-muted-foreground">
            {sources.recorded} items already have a recording and are skipped.
          </p>
        )}
      </fieldset>

      <section className="brutal-card bg-secondary p-5 space-y-4">
        <h2 className="font-display text-lg font-bold">3. Check, then generate</h2>

        <div className="space-y-2">
          <p className="text-sm">
            {queue.length} clips selected. Checking what's already stored is free.
          </p>
          {(busy === "check" || missing) && (
            <p className="font-display font-bold tabular-nums">
              {busy === "check"
                ? `Checking… ${checked.done}/${queue.length}`
                : `${checked.stored} already stored · ${missing?.length ?? 0} to make · about ${estimateCredits(missing ?? []).toLocaleString()} credits`}
            </p>
          )}
          {checked.unknown > 0 && busy !== "check" && (
            <p className="text-xs">
              {checked.unknown} couldn't be checked (the voice function may need redeploying) and are counted as to make.
            </p>
          )}
          {busy === "check" ? (
            stopButton
          ) : (
            <Button onClick={() => void runCheck()} disabled={busy !== null || !queue.length} variant="outline" className="brutal-button bg-card w-full">
              <Search size={16} className="mr-2" /> Check what's stored
            </Button>
          )}
        </div>

        <div className="h-3 bg-card rounded-full border-2 border-foreground overflow-hidden" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${generatePercent}%` }} />
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
          <div><dt className="text-foreground/70">Done</dt><dd className="font-display font-bold text-lg">{tally.done}/{toGenerate.length}</dd></div>
          <div><dt className="text-foreground/70">Already stored</dt><dd className="font-display font-bold text-lg">{tally.cached}</dd></div>
          <div>
            <dt className="text-foreground/70">Generated</dt>
            <dd className="font-display font-bold text-lg">{generatedCount}</dd>
            {Object.entries(tally.generated).map(([provider, n]) => (
              <dd key={provider} className="text-xs">{provider}: {n}</dd>
            ))}
          </div>
          <div><dt className="text-foreground/70">Failed</dt><dd className="font-display font-bold text-lg">{tally.failed}</dd></div>
        </dl>

        {rateWait !== null && (
          <p className="text-sm font-semibold">
            YarnGPT asked us to slow down. Waiting {rateWait} seconds, then trying the same clip again…
          </p>
        )}
        {tally.lastError && <p className="text-xs break-words">Last error: {tally.lastError}</p>}

        {busy === "generate" ? (
          stopButton
        ) : (
          <Button onClick={() => void runGenerate()} disabled={busy !== null || !toGenerate.length} className="brutal-button bg-primary w-full">
            <Play size={16} className="mr-2" />
            {missing ? `Generate the ${missing.length} missing clips` : `Generate ${queue.length} clips`}
          </Button>
        )}
        <p className="text-xs">
          Tip: try one source first and listen before generating everything.
        </p>
      </section>
    </div>
  );
}
