import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeUsername, validateUsername } from "@/lib/username";

export interface UserProfile {
  id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, username, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      return data as UserProfile | null;
    },
    enabled: !!user,
  });

  const updateUsername = useMutation({
    mutationFn: async (rawUsername: string) => {
      if (!user) throw new Error("Not signed in");
      const validationError = validateUsername(rawUsername);
      if (validationError) throw new Error(validationError);

      const username = normalizeUsername(rawUsername);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) {
        if (updateError.code === "23505") throw new Error("That username is already taken");
        throw updateError;
      }
      return username;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  const ensureProfile = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) {
        await supabase.from("profiles").insert({ id: user.id, username: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateUsername,
    ensureProfile,
    needsUsername: !!user && !isLoading && !profile?.username,
  };
}
