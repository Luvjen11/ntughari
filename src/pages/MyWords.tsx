import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getWordById,
  snapshotToDisplayWord,
  type IgboApiWord,
} from "@/lib/igboApi";
import { useSavedWords } from "@/hooks/useSavedWords";
import { useTTS } from "@/hooks/useTTS";
import { ArrowLeft, Heart, Volume2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CultureNote } from "@/components/CultureNote";
import { VOCAB_LIST_COLUMNS, type VocabRowWithOptionalAudio } from "@/lib/supabaseFunctions";

function firstDef(w: IgboApiWord): string {
  const d = w.definitions;
  if (!Array.isArray(d) || d.length === 0) return "";
  const first = d[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && Array.isArray((first as { definitions?: string[] }).definitions))
    return (first as { definitions: string[] }).definitions[0] ?? "";
  return "";
}

type SourceFilter = "all" | "vocabulary" | "dictionary";

interface VocabRow extends VocabRowWithOptionalAudio {}

export default function MyWords() {
  const {
    savedWords,
    savedApiWordIds,
    savedApiSnapshots,
    toggleSaveWord,
    toggleSaveApiWord,
  } = useSavedWords();
  const { speakIgboWord, isSpeaking } = useTTS();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [playAllPlaying, setPlayAllPlaying] = useState(false);

  const { data: vocabRows, isLoading: loadingVocab } = useQuery({
    queryKey: ["my-words-vocabulary", savedWords],
    queryFn: async () => {
      if (savedWords.length === 0) return [] as VocabRow[];
      const { data, error } = await supabase
        .from("vocabulary")
        .select(VOCAB_LIST_COLUMNS)
        .in("id", savedWords);
      if (error) throw error;
      return (data ?? []) as VocabRow[];
    },
    enabled: savedWords.length > 0,
  });

  const { data: apiWordsFresh, isLoading: loadingApi, refetch: refetchApi } = useQuery({
    queryKey: ["my-words-api", savedApiWordIds],
    queryFn: async () => {
      if (savedApiWordIds.length === 0) return [] as IgboApiWord[];
      const results = await Promise.all(
        savedApiWordIds.map((id) => getWordById(id))
      );
      return results
        .filter((r): r is { word: IgboApiWord } => r.word != null)
        .map((r) => r.word);
    },
    enabled: savedApiWordIds.length > 0,
  });

  const apiWordsDisplay = useMemo(() => {
    const freshById = new Map((apiWordsFresh ?? []).map((w) => [w.id, w]));
    return savedApiWordIds.map((id) => {
      const fresh = freshById.get(id);
      if (fresh?.word) return { word: fresh, fromCache: false };
      const snap = savedApiSnapshots[id];
      if (snap) return { word: snapshotToDisplayWord(id, snap), fromCache: true };
      return { word: null, fromCache: false };
    });
  }, [savedApiWordIds, apiWordsFresh, savedApiSnapshots]);

  const playAll = useCallback(async () => {
    const vocabItems = (vocabRows ?? []).map((w) => ({
      igbo: w.igbo_word,
      recordedUrl: w.audio_url,
    }));
    const apiItems = apiWordsDisplay
      .filter((e) => e.word)
      .map((e) => ({
        igbo: e.word!.word,
        recordedUrl: e.word!.pronunciation ?? null,
      }));
    const list =
      sourceFilter === "dictionary"
        ? apiItems
        : sourceFilter === "vocabulary"
          ? vocabItems
          : [...vocabItems, ...apiItems];
    if (list.length === 0) return;
    setPlayAllPlaying(true);
    for (const item of list) {
      await speakIgboWord(item.igbo, { recordedUrl: item.recordedUrl });
      await new Promise((r) => setTimeout(r, 2500));
    }
    setPlayAllPlaying(false);
  }, [sourceFilter, vocabRows, apiWordsDisplay, speakIgboWord]);

  const vocabCount = savedWords.length;
  const apiCount = savedApiWordIds.length;
  const totalCount = vocabCount + apiCount;
  const showVocab = sourceFilter === "all" || sourceFilter === "vocabulary";
  const showApi = sourceFilter === "all" || sourceFilter === "dictionary";
  const isLoading = (savedWords.length > 0 && loadingVocab) || (savedApiWordIds.length > 0 && loadingApi);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/practice"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Practice</span>
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            My Words
          </h1>
          <p className="text-muted-foreground mb-4">
            Words you&apos;ve saved from Vocabulary and the Dictionary. Tap the heart to remove; use Play all to hear them in sequence.
          </p>

          {totalCount > 0 && (
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex gap-2 border-2 border-foreground rounded-lg p-1 bg-card">
                {(["all", "vocabulary", "dictionary"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSourceFilter(f)}
                    className={`px-3 py-1.5 font-display font-semibold text-sm rounded transition-colors
                      ${sourceFilter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {f === "all" ? "All" : f === "vocabulary" ? "From vocabulary" : "From dictionary"}
                  </button>
                ))}
              </div>
              <Button
                onClick={playAll}
                disabled={
                  isSpeaking ||
                  playAllPlaying ||
                  ((showVocab ? vocabCount : 0) + (showApi ? apiCount : 0)) === 0
                }
                className="border-2 border-foreground shadow-brutal-sm"
              >
                <Play size={18} className="mr-2" />
                {playAllPlaying ? "Playing…" : "Play all"}
              </Button>
            </div>
          )}
        </div>

        {totalCount === 0 && !isLoading && (
          <div className="brutal-card bg-card p-8 text-center max-w-md mx-auto">
            <p className="font-display text-xl font-bold mb-2">No saved words yet</p>
            <p className="text-muted-foreground mb-6">
              You haven&apos;t saved any words yet. Go to Vocabulary or the Dictionary and tap the heart on words you want to learn.
            </p>
            <Button asChild className="border-2 border-foreground">
              <Link to="/vocabulary">Go to Vocabulary</Link>
            </Button>
          </div>
        )}

        {isLoading && totalCount > 0 && (
          <div className="brutal-card bg-muted p-8 animate-pulse">
            <p>Loading your words...</p>
          </div>
        )}

        {totalCount > 0 && !isLoading && (
          <div className="space-y-4">
            {showVocab &&
              (vocabRows ?? []).map((word) => (
                <div
                  key={`vocab-${word.id}`}
                  className="brutal-card bg-card p-5 animate-slide-up"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-display text-2xl font-bold">{word.igbo_word}</h3>
                      <p className="text-muted-foreground">{word.english_translation}</p>
                      {word.dialect && (
                        <p className="text-muted-foreground text-sm mt-1">Dialect: {word.dialect}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleSaveWord(word.id)}
                        className="p-2 rounded-lg border-2 border-foreground bg-secondary shadow-brutal-sm"
                        title="Remove from My Words"
                      >
                        <Heart size={18} fill="currentColor" />
                      </button>
                      <button
                        onClick={() => speakIgboWord(word.igbo_word, { recordedUrl: word.audio_url })}
                        disabled={isSpeaking}
                        className="p-2 rounded-lg border-2 border-foreground bg-primary hover:bg-primary/80 shadow-brutal-sm"
                        title="Play pronunciation"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  </div>
                  {word.example_sentence_igbo && (
                    <div className="bg-muted rounded-lg p-3 border-2 border-foreground/20 mt-2">
                      <p className="font-medium text-sm">{word.example_sentence_igbo}</p>
                      {word.example_sentence_english && (
                        <p className="text-muted-foreground text-sm">{word.example_sentence_english}</p>
                      )}
                    </div>
                  )}
                  {word.cultural_note && <CultureNote note={word.cultural_note} />}
                </div>
              ))}

            {showApi &&
              apiWordsDisplay.map(({ word, fromCache }, index) => {
                const rowId = savedApiWordIds[index] ?? `row-${index}`;
                if (!word) {
                  return (
                    <div
                      key={`api-missing-${rowId}`}
                      className="brutal-card bg-card p-5 flex items-center justify-between gap-4"
                    >
                      <p className="text-muted-foreground text-sm">
                        A saved dictionary word couldn&apos;t be loaded.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => refetchApi()}>
                        <RefreshCw size={16} className="mr-1" />
                        Retry
                      </Button>
                    </div>
                  );
                }
                return (
                  <div
                    key={`api-${word.id}`}
                    className="brutal-card bg-card p-5 animate-slide-up"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-display text-2xl font-bold">{word.word}</h3>
                        <p className="text-muted-foreground text-sm capitalize">{word.wordClass}</p>
                        {firstDef(word) && (
                          <p className="text-muted-foreground text-sm mt-1">{firstDef(word)}</p>
                        )}
                        {fromCache && (
                          <p className="text-xs text-muted-foreground mt-1">Saved offline copy</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleSaveApiWord(word.id, word)}
                          className="p-2 rounded-lg border-2 border-foreground bg-secondary shadow-brutal-sm"
                          title="Remove from My Words"
                        >
                          <Heart size={18} fill="currentColor" />
                        </button>
                        <button
                          onClick={() => speakIgboWord(word.word, { recordedUrl: word.pronunciation })}
                          disabled={isSpeaking}
                          className="p-2 rounded-lg border-2 border-foreground bg-primary hover:bg-primary/80 shadow-brutal-sm"
                          title="Play pronunciation"
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
