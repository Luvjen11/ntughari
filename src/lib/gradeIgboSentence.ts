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

function wordInSentence(sentence: string, targetWord: string): boolean {
  const stripped = stripIgboDiacriticsForCompare(sentence);
  const target = stripIgboDiacriticsForCompare(targetWord);
  return stripped.split(/\s+/).some((w) => w === target || w.includes(target) || target.includes(w));
}

function extractTargetFromUser(user: string, targetWord: string): string | null {
  const userWords = user.trim().split(/\s+/);
  const targetStripped = stripIgboDiacriticsForCompare(targetWord);
  for (const w of userWords) {
    const wStripped = stripIgboDiacriticsForCompare(w);
    if (wStripped === targetStripped || wStripped.includes(targetStripped)) {
      return w;
    }
  }
  return null;
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
      feedbackTitle: "Try writing a sentence in Igbo",
      feedbackLines: englishPrompt ? [`Prompt: "${englishPrompt}"`] : [],
      aspects,
    };
  }

  const hasWord = wordInSentence(user, target);
  aspects.wordChoice = hasWord ? "good" : "missing";

  if (!hasWord) {
    return {
      scorePercent: 10,
      feedbackTitle: `Include the word **${target}** in your sentence`,
      feedbackLines: [
        `You need to use "${target}" (${englishPrompt ?? "see prompt above"}).`,
        referenceIgbo ? `Example: ${referenceIgbo}` : "Think about how the Igbo word fits the English meaning.",
      ],
      correctedSentence: referenceIgbo ?? undefined,
      aspects,
    };
  }

  const userTargetForm = extractTargetFromUser(user, target);
  if (userTargetForm) {
    const wordGrade = gradeIgboAnswer(userTargetForm, target);
    if (wordGrade.tier === "exact") {
      aspects.spelling = "good";
      aspects.diacritics = "good";
    } else if (wordGrade.tier === "missing_diacritics") {
      aspects.spelling = "good";
      aspects.diacritics = "partial";
      feedbackLines.push(`Add Igbo spelling marks on **${target}** (you wrote "${userTargetForm}").`);
    } else if (wordGrade.tier === "close") {
      aspects.spelling = "partial";
      aspects.diacritics = "partial";
      feedbackLines.push(`Check the spelling of **${target}**.`);
    } else {
      aspects.spelling = "partial";
      aspects.diacritics = "missing";
    }
  }

  let scorePercent = 55;
  if (aspects.diacritics === "good") scorePercent += 15;
  if (aspects.diacritics === "partial") scorePercent += 8;
  if (aspects.spelling === "good") scorePercent += 10;

  if (referenceIgbo) {
    const sentenceGrade = gradeIgboAnswer(user, referenceIgbo);
    aspects.structure =
      sentenceGrade.tier === "exact"
        ? "good"
        : sentenceGrade.tier === "missing_diacritics"
          ? "partial"
          : sentenceGrade.tier === "close"
            ? "partial"
            : "partial";

    if (sentenceGrade.tier === "exact") {
      scorePercent = 100;
      return {
        scorePercent,
        feedbackTitle: "Excellent! Natural Igbo sentence.",
        feedbackLines: [],
        aspects: {
          wordChoice: "good",
          spelling: "good",
          diacritics: "good",
          structure: "good",
        },
      };
    }

    if (sentenceGrade.tier === "missing_diacritics") {
      scorePercent = Math.max(scorePercent, 78);
      feedbackLines.unshift("Good structure. Add Igbo spelling marks throughout.");
      return {
        scorePercent,
        feedbackTitle: `Good structure. Add Igbo spelling marks: **${referenceIgbo}**`,
        feedbackLines,
        correctedSentence: referenceIgbo,
        aspects: {
          wordChoice: "good",
          spelling: "good",
          diacritics: "partial",
          structure: "good",
        },
      };
    }

    if (sentenceGrade.tier === "close") {
      scorePercent = Math.max(scorePercent, 65);
      feedbackLines.push("Your sentence structure is close — compare with the model below.");
    } else {
      aspects.structure = "partial";
      scorePercent = Math.max(scorePercent, 50);
      feedbackLines.push("Good word choice. Work on sentence structure — Igbo often uses different word order.");
    }

    return {
      scorePercent: Math.min(95, scorePercent),
      feedbackTitle:
        aspects.structure === "good"
          ? "Good work! Fine-tune the details."
          : "Good word choice — refine the full sentence",
      feedbackLines,
      correctedSentence: referenceIgbo,
      aspects,
    };
  }

  // No reference sentence — reward production with the target word
  if (aspects.diacritics === "good" && aspects.spelling === "good") {
    scorePercent = 75;
    feedbackLines.push("We don't have a model sentence for this prompt yet, but your word usage looks solid.");
    return {
      scorePercent,
      feedbackTitle: "Good! You used the word correctly.",
      feedbackLines,
      aspects: { ...aspects, structure: "unknown" },
    };
  }

  return {
    scorePercent: Math.max(45, scorePercent),
    feedbackTitle: "Good start — polish spelling and diacritics",
    feedbackLines,
    correctedSentence: target,
    aspects,
  };
}
