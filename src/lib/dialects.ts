import type { Tables } from "@/integrations/supabase/types";

export type DialectRegion = Tables<"dialect_regions">;
export type DialectVariant = Tables<"dialect_variants">;

/** Areas in the order the map legend and the table list them. */
export const DIALECT_AREAS = ["Anambra", "Imo", "Enugu", "Abia", "Ebonyi", "Delta & Rivers"] as const;

/** Marker colours per area; mid-tone so they read on the light map tiles in either theme. */
export const AREA_COLORS: Record<string, string> = {
  Anambra: "#4f6fe0",
  Imo: "#c23fbf",
  Enugu: "#1f8a5b",
  Abia: "#d9822b",
  Ebonyi: "#b33a3a",
  "Delta & Rivers": "#5b5f6b",
};

export function areaColor(area: string): string {
  return AREA_COLORS[area] ?? "#5b5f6b";
}

export interface AreaSummary {
  area: string;
  communities: string[];
  hasCommunityNotes: boolean;
}

/** One row per area for the "how dialects are shown" table. */
export function summarizeAreas(regions: DialectRegion[]): AreaSummary[] {
  const known = DIALECT_AREAS as readonly string[];
  const areas = [...new Set(regions.map((r) => r.area))].sort(
    (a, b) => (known.indexOf(a) + 1 || 99) - (known.indexOf(b) + 1 || 99)
  );
  return areas.map((area) => {
    const inArea = regions.filter((r) => r.area === area);
    return {
      area,
      communities: inArea.map((r) => r.name),
      hasCommunityNotes: inArea.some((r) => !!r.community_note),
    };
  });
}
