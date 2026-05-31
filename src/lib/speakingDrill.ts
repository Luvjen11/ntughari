export interface DrillWord {
  id: string;
  igbo_word: string;
  english_translation: string;
  example_sentence_igbo?: string | null;
  example_sentence_english?: string | null;
}

export interface SpeakingDrill {
  id: string;
  englishPrompt: string;
  /** Best available reference Igbo sentence, if we have one */
  referenceIgbo: string | null;
  /** How the reference was derived */
  referenceSource: "example" | "template" | "none";
}

const PROMPT_PATTERNS: ((gloss: string) => string)[] = [
  (g) => `I am using ${g}.`,
  (g) => `She likes ${g}.`,
  (g) => `Bring the ${g}.`,
  (g) => `The ${g} is good.`,
  (g) => `I want ${g}.`,
];

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function findMatchingExample(word: DrillWord, englishPrompt: string): string | null {
  if (!word.example_sentence_igbo || !word.example_sentence_english) return null;
  const promptNorm = normalizeForMatch(englishPrompt);
  const exampleNorm = normalizeForMatch(word.example_sentence_english);
  const glossNorm = normalizeForMatch(word.english_translation);

  if (exampleNorm.includes(promptNorm) || promptNorm.includes(exampleNorm)) {
    return word.example_sentence_igbo;
  }
  if (promptNorm.includes(glossNorm)) {
    return word.example_sentence_igbo;
  }
  return null;
}

/** Simple Igbo sentence shells for production practice when no example exists */
function templateReferenceIgbo(word: DrillWord, englishPrompt: string): string | null {
  const igbo = word.igbo_word;
  const lower = englishPrompt.toLowerCase();

  if (lower.startsWith("i am ") || lower.startsWith("i'm ")) {
    return `A na m eji ${igbo}.`;
  }
  if (lower.startsWith("she ") || lower.startsWith("he ")) {
    return `Ọ na-amasị ya ${igbo}.`;
  }
  if (lower.startsWith("bring ")) {
    return `Were ${igbo} bịa.`;
  }
  if (lower.includes(" is good") || lower.includes(" is nice")) {
    return `${igbo} dị mma.`;
  }
  if (lower.startsWith("i want ") || lower.startsWith("i like ")) {
    return `Achọrọ m ${igbo}.`;
  }
  return null;
}

export function generateSpeakingDrills(word: DrillWord, count = 5): SpeakingDrill[] {
  const gloss = word.english_translation.toLowerCase();
  const patterns = PROMPT_PATTERNS.slice(0, count);

  return patterns.map((pattern, index) => {
    const englishPrompt = pattern(gloss);
    const fromExample = findMatchingExample(word, englishPrompt);
    const referenceIgbo = fromExample ?? templateReferenceIgbo(word, englishPrompt);

    return {
      id: `${word.id}-drill-${index}`,
      englishPrompt,
      referenceIgbo,
      referenceSource: fromExample ? "example" : referenceIgbo ? "template" : "none",
    };
  });
}
