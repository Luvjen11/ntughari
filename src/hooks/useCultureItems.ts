import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CultureItem } from "@/lib/culture";

export type CultureItemWithRegion = CultureItem & {
  dialect_regions: { name: string; area: string } | null;
};

/** Published films, music and other works in editor order (RLS hides unpublished ones). */
export function useCultureItems() {
  return useQuery({
    queryKey: ["cultureItems"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("culture_items")
        .select("*, dialect_regions(name, area)")
        .eq("is_published", true)
        .order("order_index")
        .order("id");
      if (error) throw error;
      return data as CultureItemWithRegion[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
