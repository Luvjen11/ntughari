export interface DrillWord {
  id: string;
  igbo_word: string;
  english_translation: string;
  word_class?: string | null;
  example_sentence_igbo?: string | null;
  example_sentence_english?: string | null;
}

export interface SpeakingDrill {
  id: string;
  englishPrompt: string;
  /** Short label shown under the prompt (e.g. "today") */
  glossHint?: string;
  referenceIgbo: string | null;
  referenceSource: "example" | "template" | "none";
}

export type WordKind = "time" | "verb" | "adjective" | "noun" | "phrase";

/** Pull a short, natural English gloss from dictionary-style definitions. */
export function extractPrimaryGloss(raw: string): { gloss: string; fullMeaning: string } {
  const fullMeaning = raw.trim();
  if (!fullMeaning) return { gloss: "", fullMeaning };

  const segments = fullMeaning
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const cleaned = segments
    .map((s) =>
      s
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .trim()
        .replace(/^(to|the|a|an)\s+/i, "")
        .trim()
    )
    .filter((s) => s.length > 0);

  if (cleaned.length === 0) {
    return { gloss: fullMeaning.toLowerCase(), fullMeaning };
  }

  // Dictionary entries often end with the simple gloss after a semicolon ("this very day; today").
  if (cleaned.length > 1) {
    const last = cleaned[cleaned.length - 1];
    if (last.split(/\s+/).length <= 4) {
      return { gloss: last.toLowerCase(), fullMeaning };
    }
  }

  const best = cleaned.reduce((shortest, current) => {
    const currentWords = current.split(/\s+/).length;
    const shortestWords = shortest.split(/\s+/).length;
    if (currentWords < shortestWords) return current;
    if (currentWords === shortestWords && current.length < shortest.length) return current;
    return shortest;
  });

  return { gloss: best.toLowerCase(), fullMeaning };
}

const TIME_GLOSS =
  /\b(today|tomorrow|yesterday|now|tonight|morning|afternoon|evening|night|week|month|year|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

export function inferWordKind(gloss: string, wordClass?: string | null): WordKind {
  const cls = (wordClass ?? "").toLowerCase();
  if (cls.includes("verb")) return "verb";
  if (cls.includes("adjective") || cls.includes("adj")) return "adjective";
  if (cls.includes("adverb") || cls.includes("adv")) return "time";
  if (cls.includes("noun")) return "noun";

  if (TIME_GLOSS.test(gloss)) return "time";
  if (/^(to\s+)?[a-z]+ing$/.test(gloss) || gloss.startsWith("to ")) return "verb";
  if (gloss.split(/\s+/).length >= 4) return "phrase";
  if (
    /\b(good|bad|big|small|new|old|hot|cold|beautiful|ugly|happy|sad|tall|short|long|young|red|blue|white|black)\b/.test(
      gloss
    )
  ) {
    return "adjective";
  }
  return "noun";
}

type ContextualTemplate = {
  kinds: WordKind[];
  english: (gloss: string) => string;
  igbo: (igbo: string, gloss: string) => string;
};

const CONTEXTUAL_TEMPLATES: ContextualTemplate[] = [
  {
    kinds: ["time"],
    english: (g) => `Say what you will do ${g}.`,
    igbo: (igbo) => `Ga m mee ihe ${igbo}.`,
  },
  {
    kinds: ["time"],
    english: (g) => `Tell me something that happened ${g}.`,
    igbo: (igbo) => `Ọ mere ${igbo}.`,
  },
  {
    kinds: ["time"],
    english: (g) => `Ask what someone is doing ${g}.`,
    igbo: (igbo) => `Kedu ihe ị na-eme ${igbo}?`,
  },
  {
    kinds: ["time"],
    english: (g) => `Say you are busy ${g}.`,
    igbo: (igbo) => `A na m arụ ọrụ ${igbo}.`,
  },
  {
    kinds: ["verb"],
    english: (g) => {
      const base = g.replace(/^to\s+/, "");
      return `Say you want to ${base} something.`;
    },
    igbo: (igbo) => `Achọrọ m ${igbo} ya.`,
  },
  {
    kinds: ["verb"],
    english: (g) => {
      const base = g.replace(/^to\s+/, "");
      return `Tell someone you will ${base} it soon.`;
    },
    igbo: (igbo) => `Ga m ${igbo} ya n'oge na-adịghị anya.`,
  },
  {
    kinds: ["verb"],
    english: (g) => {
      const base = g.replace(/^to\s+/, "");
      return `Ask if they can ${base} it for you.`;
    },
    igbo: (igbo) => `Ị ga-${igbo} ya m?`,
  },
  {
    kinds: ["adjective"],
    english: (g) => `Describe something that is ${g}.`,
    igbo: (igbo) => `Ọ dị ${igbo}.`,
  },
  {
    kinds: ["adjective"],
    english: (g) => `Say the food is ${g}.`,
    igbo: (igbo) => `Nri ahụ dị ${igbo}.`,
  },
  {
    kinds: ["noun", "phrase"],
    english: (g) => `Say you need some ${g}.`,
    igbo: (igbo) => `Achọrọ m ${igbo}.`,
  },
  {
    kinds: ["noun", "phrase"],
    english: (g) => `Say the ${g} is here.`,
    igbo: (igbo) => `${igbo} nọ ebe a.`,
  },
  {
    kinds: ["noun", "phrase"],
    english: (g) => `Tell someone about the ${g} at home.`,
    igbo: (igbo) => `Nọ n'ụlọ m ${igbo}.`,
  },
  {
    kinds: ["noun", "phrase"],
    english: (g) => `Say you like ${g}.`,
    igbo: (igbo) => `Ọ na-amasị m ${igbo}.`,
  },
  {
    kinds: ["noun", "phrase"],
    english: (g) => `Ask where the ${g} is.`,
    igbo: (igbo) => `Kedu ebe ${igbo} dị?`,
  },
];

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drillFromExample(word: DrillWord, index: number): SpeakingDrill | null {
  const english = word.example_sentence_english?.trim();
  const igbo = word.example_sentence_igbo?.trim();
  if (!english || !igbo) return null;

  const { gloss } = extractPrimaryGloss(word.english_translation);

  return {
    id: `${word.id}-example-${index}`,
    englishPrompt: english.endsWith(".") ? english : `${english}.`,
    glossHint: gloss || undefined,
    referenceIgbo: igbo,
    referenceSource: "example",
  };
}

function buildContextualDrills(word: DrillWord, gloss: string, kind: WordKind, count: number): SpeakingDrill[] {
  const igbo = word.igbo_word;
  const matching = CONTEXTUAL_TEMPLATES.filter((t) => t.kinds.includes(kind));
  const pool = matching.length > 0 ? matching : CONTEXTUAL_TEMPLATES.filter((t) => t.kinds.includes("noun"));
  const picked = shuffle(pool).slice(0, count);

  return picked.map((template, index) => ({
    id: `${word.id}-ctx-${index}`,
    englishPrompt: template.english(gloss),
    glossHint: gloss,
    referenceIgbo: template.igbo(igbo, gloss),
    referenceSource: "template" as const,
  }));
}

export function generateSpeakingDrills(word: DrillWord, count = 5): SpeakingDrill[] {
  const { gloss } = extractPrimaryGloss(word.english_translation);
  const kind = inferWordKind(gloss, word.word_class);
  const drills: SpeakingDrill[] = [];

  const exampleDrill = drillFromExample(word, 0);
  if (exampleDrill) {
    drills.push(exampleDrill);
  }

  const remaining = count - drills.length;
  if (remaining > 0) {
    const contextual = buildContextualDrills(word, gloss, kind, remaining + 2);
    for (const drill of contextual) {
      if (drills.length >= count) break;
      const duplicate = drills.some(
        (d) => d.englishPrompt.toLowerCase() === drill.englishPrompt.toLowerCase()
      );
      if (!duplicate) drills.push(drill);
    }
  }

  while (drills.length < count) {
    const filler = buildContextualDrills(word, gloss, kind, 1)[0];
    if (!filler || drills.some((d) => d.englishPrompt === filler.englishPrompt)) break;
    drills.push(filler);
  }

  return shuffle(drills).map((drill, index) => ({
    ...drill,
    id: `${word.id}-drill-${index}`,
  }));
}
