import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Hook to manage saved words - uses database for logged-in users, localStorage for guests
// Supports both Supabase vocabulary (word_id) and Igbo API words (igbo_api_word_id)

export function useSavedWords() {
  const { user } = useAuth();
  const [localSavedWords, setLocalSavedWords] = useLocalStorage<string[]>("savedWords", []);
  const [localSavedApiWordIds, setLocalSavedApiWordIds] = useLocalStorage<string[]>("savedApiWords", []);
  const [dbSavedWords, setDbSavedWords] = useState<string[]>([]);
  const [dbSavedApiWordIds, setDbSavedApiWordIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // The actual saved words - from DB if logged in, localStorage otherwise
  const savedWords = user ? dbSavedWords : localSavedWords;
  const savedApiWordIds = user ? dbSavedApiWordIds : localSavedApiWordIds;

  // Fetch saved words (Supabase + API) from database when user logs in
  useEffect(() => {
    if (!user) {
      setDbSavedWords([]);
      setDbSavedApiWordIds([]);
      return;
    }

    const fetchSavedWords = async () => {
      setLoading(true);
      const [wordsRes, apiWordsRes] = await Promise.all([
        supabase.from("user_saved_words").select("word_id").eq("user_id", user.id),
        supabase.from("user_saved_api_words").select("igbo_api_word_id").eq("user_id", user.id),
      ]);

      if (!wordsRes.error && wordsRes.data) {
        setDbSavedWords(wordsRes.data.map((item) => item.word_id));
      }
      if (!apiWordsRes.error && apiWordsRes.data) {
        setDbSavedApiWordIds(apiWordsRes.data.map((item) => item.igbo_api_word_id));
      }
      setLoading(false);
    };

    fetchSavedWords();
  }, [user]);

  // Migrate localStorage words to DB when user logs in
  useEffect(() => {
    if (!user || localSavedWords.length === 0) return;

    const migrateWords = async () => {
      // Get existing DB words to avoid duplicates
      const { data: existing } = await supabase
        .from("user_saved_words")
        .select("word_id")
        .eq("user_id", user.id);

      const existingIds = new Set(existing?.map((item) => item.word_id) || []);
      const wordsToMigrate = localSavedWords.filter((id) => !existingIds.has(id));

      if (wordsToMigrate.length > 0) {
        const inserts = wordsToMigrate.map((word_id) => ({
          user_id: user.id,
          word_id,
        }));

        const { error } = await supabase.from("user_saved_words").insert(inserts);

        if (!error) {
          // Clear localStorage after successful migration
          setLocalSavedWords([]);
          // Refresh DB words
          setDbSavedWords((prev) => [...prev, ...wordsToMigrate]);
        }
      }
    };

    migrateWords();
  }, [user, localSavedWords, setLocalSavedWords]);

  // Migrate localStorage API words to DB when user logs in
  useEffect(() => {
    if (!user || localSavedApiWordIds.length === 0) return;

    const migrateApiWords = async () => {
      const { data: existing } = await supabase
        .from("user_saved_api_words")
        .select("igbo_api_word_id")
        .eq("user_id", user.id);

      const existingIds = new Set(existing?.map((item) => item.igbo_api_word_id) || []);
      const toMigrate = localSavedApiWordIds.filter((id) => !existingIds.has(id));

      if (toMigrate.length > 0) {
        const { error } = await supabase.from("user_saved_api_words").insert(
          toMigrate.map((igbo_api_word_id) => ({ user_id: user.id, igbo_api_word_id }))
        );
        if (!error) {
          setLocalSavedApiWordIds([]);
          setDbSavedApiWordIds((prev) => [...new Set([...prev, ...toMigrate])]);
        }
      }
    };

    migrateApiWords();
  }, [user, localSavedApiWordIds, setLocalSavedApiWordIds]);

  const toggleSaveWord = useCallback(
    async (wordId: string) => {
      if (user) {
        // Database operation
        const isSaved = dbSavedWords.includes(wordId);

        if (isSaved) {
          // Remove from DB
          const { error } = await supabase
            .from("user_saved_words")
            .delete()
            .eq("user_id", user.id)
            .eq("word_id", wordId);

          if (!error) {
            setDbSavedWords((prev) => prev.filter((id) => id !== wordId));
          }
        } else {
          // Add to DB
          const { error } = await supabase
            .from("user_saved_words")
            .insert({ user_id: user.id, word_id: wordId });

          if (!error) {
            setDbSavedWords((prev) => [...prev, wordId]);
          }
        }
      } else {
        // localStorage operation (guest mode)
        setLocalSavedWords((prev) =>
          prev.includes(wordId)
            ? prev.filter((id) => id !== wordId)
            : [...prev, wordId]
        );
      }
    },
    [user, dbSavedWords, setLocalSavedWords]
  );

  const isWordSaved = useCallback(
    (wordId: string) => savedWords.includes(wordId),
    [savedWords]
  );

  const toggleSaveApiWord = useCallback(
    async (apiWordId: string) => {
      if (user) {
        const isSaved = dbSavedApiWordIds.includes(apiWordId);
        if (isSaved) {
          const { error } = await supabase
            .from("user_saved_api_words")
            .delete()
            .eq("user_id", user.id)
            .eq("igbo_api_word_id", apiWordId);
          if (!error) {
            setDbSavedApiWordIds((prev) => prev.filter((id) => id !== apiWordId));
          }
        } else {
          const { error } = await supabase
            .from("user_saved_api_words")
            .insert({ user_id: user.id, igbo_api_word_id: apiWordId });
          if (!error) {
            setDbSavedApiWordIds((prev) => [...prev, apiWordId]);
          }
        }
      } else {
        setLocalSavedApiWordIds((prev) =>
          prev.includes(apiWordId)
            ? prev.filter((id) => id !== apiWordId)
            : [...prev, apiWordId]
        );
      }
    },
    [user, dbSavedApiWordIds, setLocalSavedApiWordIds]
  );

  const isApiWordSaved = useCallback(
    (apiWordId: string) => savedApiWordIds.includes(apiWordId),
    [savedApiWordIds]
  );

  return {
    savedWords,
    toggleSaveWord,
    isWordSaved,
    savedApiWordIds,
    toggleSaveApiWord,
    isApiWordSaved,
    loading,
    isLoggedIn: !!user,
  };
}
