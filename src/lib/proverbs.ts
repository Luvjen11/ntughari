import type { Tables } from "@/integrations/supabase/types";

export type Proverb = Tables<"proverbs">;

export const PROVERB_THEMES = ["patience", "family", "community", "wisdom", "work"] as const;
export type ProverbTheme = (typeof PROVERB_THEMES)[number];

export const THEME_LABELS: Record<ProverbTheme, { label: string; igbo: string }> = {
  patience: { label: "Patience", igbo: "Ndidi" },
  family: { label: "Family", igbo: "Ezinụlọ" },
  community: { label: "Community", igbo: "Obodo" },
  wisdom: { label: "Wisdom", igbo: "Amamihe" },
  work: { label: "Work", igbo: "Ọrụ" },
};

export function themeLabel(theme: string): string {
  return THEME_LABELS[theme as ProverbTheme]?.label ?? theme;
}

/** The whole proverb as one line, for display and audio. */
export function proverbText(p: Pick<Proverb, "igbo_first" | "igbo_second">): string {
  return `${p.igbo_first.trim()} ${p.igbo_second.trim()}`;
}

/** Days since 1970-01-01 in the viewer's local time, so the proverb changes at local midnight. */
function localDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

/** Same proverb for everyone on a given day; cycles through the list in order. */
export function proverbOfTheDay<T>(proverbs: T[], date = new Date()): T | null {
  if (proverbs.length === 0) return null;
  return proverbs[localDayNumber(date) % proverbs.length];
}
