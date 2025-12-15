import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Hook to manage saved words - uses database for logged-in users, localStorage for guests

export function useSavedWords() {
  const { user } = useAuth();
  const [localSavedWords, setLocalSavedWords] = useLocalStorage<string[]>("savedWords", []);
  const [dbSavedWords, setDbSavedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // The actual saved words - from DB if logged in, localStorage otherwise
  const savedWords = user ? dbSavedWords : localSavedWords;

  // Fetch saved words from database when user logs in
  useEffect(() => {
    if (!user) {
      setDbSavedWords([]);
      return;
    }

    const fetchSavedWords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_saved_words")
        .select("word_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setDbSavedWords(data.map((item) => item.word_id));
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

  return {
    savedWords,
    toggleSaveWord,
    isWordSaved,
    loading,
    isLoggedIn: !!user,
  };
}
