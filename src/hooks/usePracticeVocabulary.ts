import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWordById, type IgboApiWord } from "@/lib/igboApi";
import { useSavedWords } from "@/hooks/useSavedWords";
import { VOCAB_PRACTICE_COLUMNS, VOCAB_PRACTICE_COLUMNS_BASIC } from "@/lib/supabaseFunctions";

export type PracticeSource = "all" | "my-words" | "category";

export interface PracticeVocabWord {
  id: string;
  english_translation: string;
  igbo_word: string;
  audio_url?: string | null;
  example_sentence_igbo?: string | null;
  example_sentence_english?: string | null;
}

function firstDef(w: IgboApiWord): string {
  const d = w.definitions;
  if (!Array.isArray(d) || d.length === 0) return "";
  const first = d[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && Array.isArray((first as { definitions?: string[] }).definitions))
    return (first as { definitions: string[] }).definitions[0] ?? "";
  return "";
}

export function usePracticeSourceParams() {
  const [searchParams] = useSearchParams();
  const sourceParam = searchParams.get("source");
  const categoryId = searchParams.get("category");

  const source: PracticeSource =
    sourceParam === "my-words"
      ? "my-words"
      : sourceParam === "category" && categoryId
        ? "category"
        : "all";

  return { source, categoryId };
}

export function buildPracticeUrl(path: string, source: PracticeSource, categoryId?: string | null) {
  if (source === "my-words") return `${path}?source=my-words`;
  if (source === "category" && categoryId) return `${path}?source=category&category=${categoryId}`;
  return path;
}

interface UsePracticeVocabularyOptions {
  includeExamples?: boolean;
}

export function usePracticeVocabulary(options: UsePracticeVocabularyOptions = {}) {
  const { includeExamples = false } = options;
  const { source, categoryId } = usePracticeSourceParams();
  const { savedWords, savedApiWordIds } = useSavedWords();

  const selectFields = includeExamples ? VOCAB_PRACTICE_COLUMNS : VOCAB_PRACTICE_COLUMNS_BASIC;

  const { data: allVocabulary, isLoading: loadingAll } = useQuery({
    queryKey: ["vocabulary-practice", includeExamples],
    queryFn: async () => {
      let query = supabase.from("vocabulary").select(selectFields);
      if (includeExamples) {
        query = query.not("example_sentence_igbo", "is", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PracticeVocabWord[];
    },
    enabled: source === "all",
  });

  const { data: categoryVocabulary, isLoading: loadingCategory } = useQuery({
    queryKey: ["vocabulary-practice-category", categoryId, includeExamples],
    queryFn: async () => {
      if (!categoryId) return [] as PracticeVocabWord[];
      let query = supabase.from("vocabulary").select(selectFields).eq("category_id", categoryId);
      if (includeExamples) {
        query = query.not("example_sentence_igbo", "is", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PracticeVocabWord[];
    },
    enabled: source === "category" && !!categoryId,
  });

  const { data: savedVocabRows, isLoading: loadingSavedVocab } = useQuery({
    queryKey: ["vocabulary-practice-saved", savedWords, includeExamples],
    queryFn: async () => {
      if (savedWords.length === 0) return [] as PracticeVocabWord[];
      let query = supabase.from("vocabulary").select(selectFields).in("id", savedWords);
      if (includeExamples) {
        query = query.not("example_sentence_igbo", "is", null);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PracticeVocabWord[];
    },
    enabled: source === "my-words" && savedWords.length > 0,
  });

  const { data: apiWords, isLoading: loadingApi } = useQuery({
    queryKey: ["vocabulary-practice-api", savedApiWordIds],
    queryFn: async () => {
      if (savedApiWordIds.length === 0) return [] as IgboApiWord[];
      const results = await Promise.all(savedApiWordIds.map((id) => getWordById(id)));
      return results
        .filter((r): r is { word: IgboApiWord } => r.word != null)
        .map((r) => r.word);
    },
    enabled: source === "my-words" && savedApiWordIds.length > 0,
  });

  const vocabulary = useMemo(() => {
    if (source === "my-words") {
      const fromApi = (apiWords ?? []).map((w) => ({
        id: `api-${w.id}`,
        english_translation: firstDef(w) || w.word,
        igbo_word: w.word,
      }));
      return [...(savedVocabRows ?? []), ...fromApi];
    }
    if (source === "category") return categoryVocabulary ?? [];
    return allVocabulary ?? [];
  }, [source, savedVocabRows, apiWords, categoryVocabulary, allVocabulary]);

  const isLoading =
    source === "my-words"
      ? loadingSavedVocab || loadingApi
      : source === "category"
        ? loadingCategory
        : loadingAll;

  return { vocabulary, isLoading, source, categoryId };
}
