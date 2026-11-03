import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Proverb } from "@/lib/proverbs";

/** Published proverbs in editor order (RLS hides unpublished ones from learners). */
export function useProverbs() {
  return useQuery({
    queryKey: ["proverbs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proverbs")
        .select("*")
        .eq("is_published", true)
        .order("order_index")
        .order("id");
      if (error) throw error;
      return data as Proverb[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
