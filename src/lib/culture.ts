import type { Tables } from "@/integrations/supabase/types";

export type CultureItem = Tables<"culture_items">;

export const CULTURE_TYPES = ["film", "music", "other"] as const;
export type CultureType = (typeof CULTURE_TYPES)[number];

export const TYPE_LABELS: Record<CultureType, { label: string; igbo: string }> = {
  film: { label: "Films", igbo: "Ihe nkiri" },
  music: { label: "Music", igbo: "Egwu" },
  other: { label: "Other", igbo: "Ndị ọzọ" },
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type as CultureType]?.label ?? type;
}

/** "highlife, classic" → ["highlife", "classic"], lower-cased, no blanks or repeats. */
export function parseTags(text: string): string[] {
  const tags = text
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  return [...new Set(tags)];
}

/** "tv-series" → "tv series" for display. */
export function tagLabel(tag: string): string {
  return tag.replace(/-/g, " ");
}

/** Only http(s) links are shown as links; anything else is treated as plain text. */
export function safeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Host name for a link label, e.g. "en.wikipedia.org" → "wikipedia.org". */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^(www|en|m)\./, "");
  } catch {
    return url;
  }
}
