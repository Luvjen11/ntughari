import { gradeIgboAnswer, stripIgboDiacriticsForCompare } from "@/lib/gradeIgboAnswer";

export type AspectRating = "good" | "partial" | "missing" | "unknown";

export interface SentenceGradeResult {
  scorePercent: number;
  feedbackTitle: string;
  feedbackLines: string[];
  correctedSentence?: string;
  aspects: {
    wordChoice: AspectRating;
    spelling: AspectRating;
    diacritics: AspectRating;
    structure: AspectRating;
  };
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function tokenizeIgboSentence(text: string): string[] {
  return stripIgboDiacriticsForCompare(text)
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && levenshtein(a, b) <= 1) return true;
  return a.includes(b) || b.includes(a);
}

/** How much of the reference sentence appears in the user's answer (word overlap). */
export function sentenceOverlapScore(user: string, reference: string): number {
  const userTokens = tokenizeIgboSentence(user);
  const refTokens = tokenizeIgboSentence(reference);
  if (refTokens.length === 0 || userTokens.length === 0) return 0;

  const matched = refTokens.filter((rt) => userTokens.some((ut) => tokensMatch(ut, rt)));
  return matched.length / refTokens.length;
}

function wordInSentence(sentence: string, targetWord: string): boolean {
  const stripped = stripIgboDiacriticsForCompare(sentence);
  const target = stripIgboDiacriticsForCompare(targetWord);
  return stripped.split(/\s+/).some((w) => tokensMatch(w, target));
}

function extractTargetFromUser(user: string, targetWord: string): string | null {
  const userWords = user.trim().split(/\s+/);
  const targetStripped = stripIgboDiacriticsForCompare(targetWord);
  for (const w of userWords) {
    const wStripped = stripIgboDiacriticsForCompare(w);
    if (tokensMatch(wStripped, targetStripped)) {
      return w;
    }
  }
  return null;
}

function structureRating(overlap: number, userWordCount: number): AspectRating {
  if (overlap >= 0.55) return "good";
  if (overlap >= 0.3 || userWordCount >= 4) return "partial";
  return "missing";
}

export function gradeIgboSentence(
  userAnswer: string,
  targetWord: string,
  referenceIgbo: string | null,
  englishPrompt?: string
): SentenceGradeResult {
  const user = userAnswer.trim().normalize("NFC");
  const target = targetWord.trim().normalize("NFC");

  const aspects = {
    wordChoice: "missing" as AspectRating,
    spelling: "unknown" as AspectRating,
    diacritics: "unknown" as AspectRating,
    structure: "unknown" as AspectRating,
  };

  const feedbackLines: string[] = [];

  if (!user) {
    return {
      scorePercent: 0,
      feedbackTitle: "Try speaking a sentence in Igbo",
      feedbackLines: englishPrompt ? [`Prompt: "${englishPrompt}"`] : [],
      aspects,
    };
  }

  const hasWord = wordInSentence(user, target);
  aspects.wordChoice = hasWord ? "good" : "missing";

  if (!hasWord) {
    return {
      scorePercent: 10,
      feedbackTitle: `Include **${target}** in your sentence`,
      feedbackLines: [
        englishPrompt
          ? `Respond to: "${englishPrompt}"`
          : `Use the Igbo word **${target}** in a full sentence.`,
        referenceIgbo ? `Model: ${referenceIgbo}` : undefined,
      ].filter((line): line is string => Boolean(line)),
      correctedSentence: referenceIgbo ?? undefined,
      aspects,
    };
  }

  let wordScore = 30;
  const userTargetForm = extractTargetFromUser(user, target);
  if (userTargetForm) {
    const wordGrade = gradeIgboAnswer(userTargetForm, target);
    if (wordGrade.tier === "exact") {
      aspects.spelling = "good";
      aspects.diacritics = "good";
      wordScore = 45;
    } else if (wordGrade.tier === "missing_diacritics") {
      aspects.spelling = "good";
      aspects.diacritics = "partial";
      wordScore = 38;
      feedbackLines.push(`Add tone marks on **${target}** (you said "${userTargetForm}").`);
    } else if (wordGrade.tier === "close") {
      aspects.spelling = "partial";
      aspects.diacritics = "partial";
      wordScore = 28;
      feedbackLines.push(`Check the spelling of **${target}**.`);
    } else {
      aspects.spelling = "partial";
      aspects.diacritics = "missing";
      wordScore = 22;
    }
  }

  const userWordCount = user.split(/\s+/).filter(Boolean).length;

  if (referenceIgbo) {
    const overlap = sentenceOverlapScore(user, referenceIgbo);
    aspects.structure = structureRating(overlap, userWordCount);

    const strippedMatch =
      stripIgboDiacriticsForCompare(user) === stripIgboDiacriticsForCompare(referenceIgbo);

    if (strippedMatch && aspects.diacritics !== "missing") {
      return {
        scorePercent: aspects.diacritics === "good" ? 100 : 88,
        feedbackTitle:
          aspects.diacritics === "good"
            ? "Excellent! Natural Igbo sentence."
            : "Great structure — add tone marks throughout.",
        feedbackLines:
          aspects.diacritics === "good"
            ? []
            : [`Model with marks: **${referenceIgbo}**`],
        correctedSentence: aspects.diacritics === "good" ? undefined : referenceIgbo,
        aspects: {
          wordChoice: "good",
          spelling: "good",
          diacritics: aspects.diacritics === "good" ? "good" : "partial",
          structure: "good",
        },
      };
    }

    let structureScore = 0;
    if (overlap >= 0.7) structureScore = 40;
    else if (overlap >= 0.45) structureScore = 28;
    else if (overlap >= 0.25) structureScore = 15;
    else structureScore = userWordCount >= 3 ? 8 : 0;

    const scorePercent = Math.min(98, wordScore + structureScore);

    if (overlap >= 0.45) {
      return {
        scorePercent,
        feedbackTitle: "Good sentence — small tweaks left",
        feedbackLines:
          feedbackLines.length > 0
            ? feedbackLines
            : ["You matched the idea well. Compare with the model below."],
        correctedSentence: referenceIgbo,
        aspects: {
          wordChoice: "good",
          spelling: aspects.spelling,
          diacritics: aspects.diacritics,
          structure: aspects.structure,
        },
      };
    }

    return {
      scorePercent: Math.max(42, scorePercent),
      feedbackTitle: "Good word — shape the full sentence",
      feedbackLines: [
        ...feedbackLines,
        userWordCount < 3
          ? "Try a fuller sentence, not just the word on its own."
          : "Your sentence differs from the model — Igbo often uses different word order.",
        `Model: **${referenceIgbo}**`,
      ],
      correctedSentence: referenceIgbo,
      aspects: {
        wordChoice: "good",
        spelling: aspects.spelling,
        diacritics: aspects.diacritics,
        structure: aspects.structure,
      },
    };
  }

  // No reference — reward using the target word well in any sentence
  if (aspects.diacritics === "good" && userWordCount >= 3) {
    return {
      scorePercent: 78,
      feedbackTitle: "Nice! You used the word in a real sentence.",
      feedbackLines: ["We do not have a model for this prompt, but your usage looks solid."],
      aspects: { ...aspects, structure: userWordCount >= 4 ? "partial" : "unknown" },
    };
  }

  return {
    scorePercent: Math.max(35, wordScore),
    feedbackTitle: "Good start — polish the word and build a longer sentence",
    feedbackLines: feedbackLines,
    correctedSentence: target,
    aspects,
  };
}
