import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getWordById, type IgboApiWord } from "@/lib/igboApi";
import { useSavedWords } from "@/hooks/useSavedWords";
import { useTTS } from "@/hooks/useTTS";
import { ArrowLeft, Heart, Volume2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CultureNote } from "@/components/CultureNote";

/** API definitions may be string[] or object[]. Return first definition string. */
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

interface VocabRow {
  id: string;
  igbo_word: string;
  english_translation: string;
  example_sentence_igbo: string | null;
  example_sentence_english: string | null;
  cultural_note: string | null;
  dialect: string | null;
}

export default function MyWords() {
  const { savedWords, savedApiWordIds, toggleSaveWord, toggleSaveApiWord, isWordSaved, isApiWordSaved } = useSavedWords();
  const { speakIgbo, isSpeaking } = useTTS();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [playAllPlaying, setPlayAllPlaying] = useState(false);

  const { data: vocabRows, isLoading: loadingVocab } = useQuery({
    queryKey: ["my-words-vocabulary", savedWords],
    queryFn: async () => {
      if (savedWords.length === 0) return [] as VocabRow[];
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, igbo_word, english_translation, example_sentence_igbo, example_sentence_english, cultural_note, dialect")
        .in("id", savedWords);
      if (error) throw error;
      return (data ?? []) as VocabRow[];
    },
    enabled: savedWords.length > 0,
  });

  const { data: apiWords, isLoading: loadingApi } = useQuery({
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

  const playAll = useCallback(async () => {
    const vocab: { igbo: string }[] = (vocabRows ?? []).map((w) => ({ igbo: w.igbo_word }));
    const api: { igbo: string }[] = (apiWords ?? []).map((w) => ({ igbo: w.word }));
    const list = sourceFilter === "dictionary" ? api : sourceFilter === "vocabulary" ? vocab : [...vocab, ...api];
    if (list.length === 0) return;
    setPlayAllPlaying(true);
    for (const item of list) {
      speakIgbo(item.igbo);
      await new Promise((r) => setTimeout(r, 2500));
    }
    setPlayAllPlaying(false);
  }, [sourceFilter, vocabRows, apiWords, speakIgbo]);

  const totalCount = (vocabRows?.length ?? 0) + (apiWords?.length ?? 0);
  const showVocab = sourceFilter === "all" || sourceFilter === "vocabulary";
  const showApi = sourceFilter === "all" || sourceFilter === "dictionary";
  const isLoading = loadingVocab || loadingApi;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/vocabulary"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Vocabulary</span>
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            My Words
          </h1>
          <p className="text-muted-foreground mb-4">
            Words you've saved from Vocabulary and the Dictionary. Tap the heart to remove; use Play all to hear them in sequence.
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
                disabled={isSpeaking || playAllPlaying || ((showVocab ? (vocabRows?.length ?? 0) : 0) + (showApi ? (apiWords?.length ?? 0) : 0)) === 0}
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
              You haven't saved any words yet. Go to Vocabulary or the Dictionary and tap the heart on words you want to learn.
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

        {!isLoading && totalCount > 0 && (
          <div className="space-y-4">
            {showVocab && (vocabRows ?? []).map((word) => (
              <div
                key={word.id}
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
                      onClick={() => speakIgbo(word.igbo_word)}
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

            {showApi && (apiWords ?? []).map((w) => (
              <div
                key={w.id}
                className="brutal-card bg-card p-5 animate-slide-up"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-display text-2xl font-bold">{w.word}</h3>
                    <p className="text-muted-foreground text-sm capitalize">{w.wordClass}</p>
                    {firstDef(w) && <p className="text-muted-foreground text-sm mt-1">{firstDef(w)}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSaveApiWord(w.id)}
                      className="p-2 rounded-lg border-2 border-foreground bg-secondary shadow-brutal-sm"
                      title="Remove from My Words"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => speakIgbo(w.word)}
                      disabled={isSpeaking}
                      className="p-2 rounded-lg border-2 border-foreground bg-primary hover:bg-primary/80 shadow-brutal-sm"
                      title="Play pronunciation"
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
