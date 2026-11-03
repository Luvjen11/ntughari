import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DialectRegion, DialectVariant } from "@/lib/dialects";

export function useDialectRegions() {
  return useQuery({
    queryKey: ["dialect-regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dialect_regions").select("*").order("order_index");
      if (error) throw error;
      return data as DialectRegion[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useDialectVariants() {
  return useQuery({
    queryKey: ["dialect-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dialect_variants")
        .select("*")
        .order("english_gloss");
      if (error) throw error;
      return data as DialectVariant[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
