import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  type IgboApiWord,
  type IgboApiWordSnapshot,
  igboApiWordToSnapshot,
} from "@/lib/igboApi";

export type SavedApiWordSnapshots = Record<string, IgboApiWordSnapshot>;

const API_SNAPSHOT_SELECT =
  "igbo_api_word_id, igbo_word, english_gloss, word_class, pronunciation";

function rowToSnapshot(row: {
  igbo_word: string | null;
  english_gloss: string | null;
  word_class: string | null;
  pronunciation: string | null;
}): IgboApiWordSnapshot | null {
  if (!row.igbo_word?.trim()) return null;
  return {
    igbo_word: row.igbo_word,
    english_gloss: row.english_gloss ?? row.igbo_word,
    word_class: row.word_class ?? undefined,
    pronunciation: row.pronunciation ?? undefined,
  };
}

export function useSavedWords() {
  const { user } = useAuth();
  const [localSavedWords, setLocalSavedWords] = useLocalStorage<string[]>("savedWords", []);
  const [localSavedApiWordIds, setLocalSavedApiWordIds] = useLocalStorage<string[]>("savedApiWords", []);
  const [localApiSnapshots, setLocalApiSnapshots] = useLocalStorage<SavedApiWordSnapshots>(
    "savedApiWordSnapshots",
    {}
  );
  const [dbSavedWords, setDbSavedWords] = useState<string[]>([]);
  const [dbSavedApiWordIds, setDbSavedApiWordIds] = useState<string[]>([]);
  const [dbApiSnapshots, setDbApiSnapshots] = useState<SavedApiWordSnapshots>({});
  const [loading, setLoading] = useState(false);

  const savedWords = user ? dbSavedWords : localSavedWords;
  const savedApiWordIds = user ? dbSavedApiWordIds : localSavedApiWordIds;
  const savedApiSnapshots = user ? dbApiSnapshots : localApiSnapshots;

  useEffect(() => {
    if (!user) {
      setDbSavedWords([]);
      setDbSavedApiWordIds([]);
      setDbApiSnapshots({});
      return;
    }

    const fetchSavedWords = async () => {
      setLoading(true);
      const [wordsRes, apiWordsRes] = await Promise.all([
        supabase.from("user_saved_words").select("word_id").eq("user_id", user.id),
        supabase.from("user_saved_api_words").select(API_SNAPSHOT_SELECT).eq("user_id", user.id),
      ]);

      if (!wordsRes.error && wordsRes.data) {
        setDbSavedWords(wordsRes.data.map((item) => item.word_id));
      }
      if (!apiWordsRes.error && apiWordsRes.data) {
        const ids: string[] = [];
        const snapshots: SavedApiWordSnapshots = {};
        for (const row of apiWordsRes.data) {
          ids.push(row.igbo_api_word_id);
          const snap = rowToSnapshot(row);
          if (snap) snapshots[row.igbo_api_word_id] = snap;
        }
        setDbSavedApiWordIds(ids);
        setDbApiSnapshots(snapshots);
      }
      setLoading(false);
    };

    fetchSavedWords();
  }, [user]);

  useEffect(() => {
    if (!user || localSavedWords.length === 0) return;

    const migrateWords = async () => {
      const { data: existing } = await supabase
        .from("user_saved_words")
        .select("word_id")
        .eq("user_id", user.id);

      const existingIds = new Set(existing?.map((item) => item.word_id) || []);
      const wordsToMigrate = localSavedWords.filter((id) => !existingIds.has(id));

      if (wordsToMigrate.length > 0) {
        const { error } = await supabase.from("user_saved_words").insert(
          wordsToMigrate.map((word_id) => ({ user_id: user.id, word_id }))
        );

        if (!error) {
          setLocalSavedWords([]);
          setDbSavedWords((prev) => [...prev, ...wordsToMigrate]);
        }
      }
    };

    migrateWords();
  }, [user, localSavedWords, setLocalSavedWords]);

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
        const inserts = toMigrate.map((igbo_api_word_id) => {
          const snap = localApiSnapshots[igbo_api_word_id];
          return {
            user_id: user.id,
            igbo_api_word_id,
            igbo_word: snap?.igbo_word ?? null,
            english_gloss: snap?.english_gloss ?? null,
            word_class: snap?.word_class ?? null,
            pronunciation: snap?.pronunciation ?? null,
          };
        });
        const { error } = await supabase.from("user_saved_api_words").insert(inserts);
        if (!error) {
          setLocalSavedApiWordIds([]);
          setLocalApiSnapshots({});
          setDbSavedApiWordIds((prev) => [...new Set([...prev, ...toMigrate])]);
          setDbApiSnapshots((prev) => {
            const next = { ...prev };
            for (const id of toMigrate) {
              if (localApiSnapshots[id]) next[id] = localApiSnapshots[id];
            }
            return next;
          });
        }
      }
    };

    migrateApiWords();
  }, [user, localSavedApiWordIds, localApiSnapshots, setLocalSavedApiWordIds, setLocalApiSnapshots]);

  const toggleSaveWord = useCallback(
    async (wordId: string) => {
      if (user) {
        const isSaved = dbSavedWords.includes(wordId);

        if (isSaved) {
          const { error } = await supabase
            .from("user_saved_words")
            .delete()
            .eq("user_id", user.id)
            .eq("word_id", wordId);

          if (!error) {
            setDbSavedWords((prev) => prev.filter((id) => id !== wordId));
          }
        } else {
          const { error } = await supabase
            .from("user_saved_words")
            .insert({ user_id: user.id, word_id: wordId });

          if (!error) {
            setDbSavedWords((prev) => [...prev, wordId]);
          }
        }
      } else {
        setLocalSavedWords((prev) =>
          prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
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
    async (apiWordId: string, word?: IgboApiWord) => {
      const snapshot = word ? igboApiWordToSnapshot(word) : undefined;

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
            setDbApiSnapshots((prev) => {
              const next = { ...prev };
              delete next[apiWordId];
              return next;
            });
          }
        } else {
          const { error } = await supabase.from("user_saved_api_words").insert({
            user_id: user.id,
            igbo_api_word_id: apiWordId,
            igbo_word: snapshot?.igbo_word ?? null,
            english_gloss: snapshot?.english_gloss ?? null,
            word_class: snapshot?.word_class ?? null,
            pronunciation: snapshot?.pronunciation ?? null,
          });
          if (!error) {
            setDbSavedApiWordIds((prev) => [...prev, apiWordId]);
            if (snapshot) {
              setDbApiSnapshots((prev) => ({ ...prev, [apiWordId]: snapshot }));
            }
          }
        }
      } else {
        const removing = localSavedApiWordIds.includes(apiWordId);
        setLocalSavedApiWordIds((prev) =>
          removing ? prev.filter((id) => id !== apiWordId) : [...prev, apiWordId]
        );
        setLocalApiSnapshots((prev) => {
          const next = { ...prev };
          if (removing) {
            delete next[apiWordId];
          } else if (snapshot) {
            next[apiWordId] = snapshot;
          }
          return next;
        });
      }
    },
    [user, dbSavedApiWordIds, localSavedApiWordIds, setLocalSavedApiWordIds, setLocalApiSnapshots]
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
    savedApiSnapshots,
    toggleSaveApiWord,
    isApiWordSaved,
    loading,
    isLoggedIn: !!user,
  };
}
