import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

export type TutorChat = Tables<"tutor_chats">;

/** One saved turn, in the shape the chat screen renders. */
export interface SavedTutorMessage {
  role: "user" | "assistant";
  text: string;
  english?: string | null;
  correction?: string | null;
  correctionNote?: string | null;
  newWord?: { igbo: string; english: string } | null;
}

const CHATS_KEY = ["tutor-chats"];

/** A chat's title: the opening words of its first message. */
function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 47)}…` : clean || "New chat";
}

function toNewWord(value: Json | null): SavedTutorMessage["newWord"] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const { igbo, english } = value as Record<string, unknown>;
    if (typeof igbo === "string" && typeof english === "string") return { igbo, english };
  }
  return null;
}

/**
 * The signed-in learner's saved tutor conversations. Only text is stored; replies
 * replay from the tts audio cache. Signed-out learners chat without saving.
 */
export function useTutorChats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const chats = useQuery({
    queryKey: [...CHATS_KEY, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_chats")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as TutorChat[];
    },
  });

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: CHATS_KEY }), [queryClient]);

  const createChat = useCallback(
    async (firstMessage: string, level: string): Promise<string | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("tutor_chats")
        .insert({ user_id: user.id, title: titleFrom(firstMessage), level })
        .select("id")
        .single();
      if (error) {
        console.warn("Couldn't save the chat:", error.message);
        return null;
      }
      void refresh();
      return data.id;
    },
    [user, refresh]
  );

  const saveMessages = useCallback(
    async (chatId: string, messages: SavedTutorMessage[]) => {
      if (!user || messages.length === 0) return;
      // Explicit, increasing timestamps keep a turn's two messages in order when reloaded.
      const base = Date.now();
      const { error } = await supabase.from("tutor_messages").insert(
        messages.map((m, i) => ({
          created_at: new Date(base + i).toISOString(),
          chat_id: chatId,
          user_id: user.id,
          role: m.role,
          content: m.text,
          english: m.english ?? null,
          correction: m.correction ?? null,
          correction_note: m.correctionNote ?? null,
          new_word: (m.newWord ?? null) as Json,
        }))
      );
      if (error) {
        console.warn("Couldn't save messages:", error.message);
        return;
      }
      // Bump the chat to the top of the list.
      await supabase.from("tutor_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
      void refresh();
    },
    [user, refresh]
  );

  const loadMessages = useCallback(async (chatId: string): Promise<SavedTutorMessage[]> => {
    const { data, error } = await supabase
      .from("tutor_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at");
    if (error) throw error;
    return data.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      text: m.content,
      english: m.english,
      correction: m.correction,
      correctionNote: m.correction_note,
      newWord: toNewWord(m.new_word),
    }));
  }, []);

  const deleteChat = useCallback(
    async (chatId: string) => {
      const { error } = await supabase.from("tutor_chats").delete().eq("id", chatId);
      if (error) throw error;
      void refresh();
    },
    [refresh]
  );

  return {
    signedIn: !!user,
    chats: chats.data ?? [],
    loadingChats: chats.isLoading,
    chatsError: chats.error,
    createChat,
    saveMessages,
    loadMessages,
    deleteChat,
  };
}
