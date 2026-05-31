export type IgboGradeTier = "exact" | "missing_diacritics" | "close" | "wrong";

export interface IgboGradeResult {
  tier: IgboGradeTier;
  scorePercent: number;
  feedbackTitle: string;
  showCorrectAnswer: boolean;
}

const DIACRITIC_MAP: Record<string, string> = {
  ị: "i",
  Ị: "I",
  ọ: "o",
  Ọ: "O",
  ụ: "u",
  Ụ: "U",
  ṅ: "n",
  Ṅ: "N",
  ñ: "n",
  ŋ: "n",
  á: "a",
  à: "a",
  é: "e",
  è: "e",
  í: "i",
  ì: "i",
  ó: "o",
  ò: "o",
  ú: "u",
  ù: "u",
  Á: "A",
  À: "A",
  É: "E",
  È: "E",
  Í: "I",
  Ì: "I",
  Ó: "O",
  Ò: "O",
  Ú: "U",
  Ù: "U",
};

function stripIgboDiacritics(text: string): string {
  return [...text.normalize("NFC")]
    .map((char) => DIACRITIC_MAP[char] ?? char)
    .join("")
    .toLowerCase();
}

export function stripIgboDiacriticsForCompare(text: string): string {
  return stripIgboDiacritics(text);
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

function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export function gradeIgboAnswer(userAnswer: string, correctAnswer: string): IgboGradeResult {
  const user = userAnswer.trim().normalize("NFC");
  const correct = correctAnswer.trim().normalize("NFC");

  if (!user) {
    return {
      tier: "wrong",
      scorePercent: 0,
      feedbackTitle: "Not quite",
      showCorrectAnswer: true,
    };
  }

  if (user === correct || user.toLowerCase() === correct.toLowerCase()) {
    return {
      tier: "exact",
      scorePercent: 100,
      feedbackTitle: "Correct!",
      showCorrectAnswer: false,
    };
  }

  const userStripped = stripIgboDiacritics(user);
  const correctStripped = stripIgboDiacritics(correct);

  if (userStripped === correctStripped) {
    return {
      tier: "missing_diacritics",
      scorePercent: 80,
      feedbackTitle: `Correct word, but missing Igbo diacritics: ${correct}.`,
      showCorrectAnswer: false,
    };
  }

  const similarity = similarityRatio(userStripped, correctStripped);
  const distance = levenshtein(userStripped, correctStripped);

  if (similarity >= 0.55 || (distance <= 2 && similarity >= 0.4)) {
    const scorePercent = Math.round(40 + similarity * 20);
    return {
      tier: "close",
      scorePercent: Math.min(60, Math.max(40, scorePercent)),
      feedbackTitle: "Close! Check the spelling",
      showCorrectAnswer: true,
    };
  }

  const wrongScore = Math.round(similarity * 20);
  return {
    tier: "wrong",
    scorePercent: Math.min(20, Math.max(0, wrongScore)),
    feedbackTitle: "Not quite",
    showCorrectAnswer: true,
  };
}
