/**
 * Igbo API client – word lookup, types, and error handling.
 * Base URL: https://igboapi.com/api/v2
 * Auth: X-API-Key header
 */

const BASE_URL = "https://igboapi.com/api/v2";

function getApiKey(): string {
  const key = import.meta.env.VITE_IGBO_API_KEY;
  return typeof key === "string" ? key : "";
}

export interface IgboApiWordAttributes {
  isStandardIgbo?: boolean;
  isAccented?: boolean;
  isSlang?: boolean;
  isConstructedTerm?: boolean;
  isBorrowedTerm?: boolean;
  isStem?: boolean;
  isCommon?: boolean;
}

export interface IgboApiWordDialect {
  word?: string;
  dialects?: string[];
  pronunciation?: string;
  variations?: string[];
}

export interface IgboApiExample {
  id?: string;
  igbo?: string;
  english?: string;
  pronunciation?: string;
  meaning?: string;
  style?: Record<string, unknown>;
  associatedWords?: string[];
  nsibidi?: string;
}

export interface IgboApiWord {
  id: string;
  word: string;
  wordClass: string;
  pronunciation: string;
  definitions: string[];
  attributes?: IgboApiWordAttributes;
  nsibidi?: string;
  relatedTerms?: string;
  dialects?: IgboApiWordDialect[];
  variations?: string[];
  examples?: IgboApiExample[];
}

export interface GetWordsParams {
  keyword: string;
  page?: number;
  range?: number;
  wordClasses?: string;
  strict?: boolean;
  dialects?: string;
  examples?: string;
}

export interface GetWordsResult {
  words: IgboApiWord[];
  error?: string;
}

export interface GetWordByIdResult {
  word: IgboApiWord | null;
  error?: string;
}

/** Display snapshot stored when saving dictionary words (My Words). */
export interface IgboApiWordSnapshot {
  igbo_word: string;
  english_gloss: string;
  word_class?: string;
  pronunciation?: string;
}

function definitionToStrings(definitions: unknown): string[] {
  if (!Array.isArray(definitions)) return [];
  return definitions.flatMap((d) => {
    if (typeof d === "string") return [d];
    if (d && typeof d === "object") {
      const obj = d as { definitions?: string[]; definition?: string };
      if (Array.isArray(obj.definitions)) return obj.definitions;
      if (typeof obj.definition === "string") return [obj.definition];
    }
    return [];
  });
}

/** Normalize API JSON (search, by-id, wrapped envelopes) into IgboApiWord. */
export function normalizeIgboApiWord(raw: unknown): IgboApiWord | null {
  if (!raw || typeof raw !== "object") return null;

  let doc = raw as Record<string, unknown>;
  if (doc.data && typeof doc.data === "object") {
    doc = doc.data as Record<string, unknown>;
  }
  if (doc.word && typeof doc.word === "object" && !Array.isArray(doc.word)) {
    doc = doc.word as Record<string, unknown>;
  }

  const wordText =
    typeof doc.word === "string"
      ? doc.word
      : typeof doc.headword === "string"
        ? doc.headword
        : "";
  if (!wordText.trim()) return null;

  const id =
    (typeof doc.id === "string" && doc.id) ||
    (typeof doc._id === "string" && doc._id) ||
    (doc._id && typeof doc._id === "object" && "$oid" in (doc._id as object)
      ? String((doc._id as { $oid: string }).$oid)
      : doc._id != null
        ? String(doc._id)
        : "");

  const pronunciation =
    (typeof doc.pronunciation === "string" && doc.pronunciation) ||
    (typeof doc.wordPronunciation === "string" && doc.wordPronunciation) ||
    "";

  const wordClass =
    (typeof doc.wordClass === "string" && doc.wordClass) ||
    (typeof doc.partOfSpeech === "string" && doc.partOfSpeech) ||
    "";

  const defs = definitionToStrings(doc.definitions);

  return {
    id: id || wordText,
    word: wordText,
    wordClass,
    pronunciation,
    definitions: defs,
    attributes: doc.attributes as IgboApiWordAttributes | undefined,
    nsibidi: typeof doc.nsibidi === "string" ? doc.nsibidi : undefined,
    dialects: Array.isArray(doc.dialects) ? (doc.dialects as IgboApiWordDialect[]) : undefined,
    variations: Array.isArray(doc.variations) ? (doc.variations as string[]) : undefined,
    examples: Array.isArray(doc.examples) ? (doc.examples as IgboApiExample[]) : undefined,
  };
}

export function igboApiWordToSnapshot(w: IgboApiWord): IgboApiWordSnapshot {
  const defs = definitionToStrings(w.definitions);
  return {
    igbo_word: w.word,
    english_gloss: defs[0] ?? w.word,
    word_class: w.wordClass || undefined,
    pronunciation: w.pronunciation || undefined,
  };
}

export function snapshotToDisplayWord(
  id: string,
  snapshot: IgboApiWordSnapshot
): IgboApiWord {
  return {
    id,
    word: snapshot.igbo_word,
    wordClass: snapshot.word_class ?? "",
    pronunciation: snapshot.pronunciation ?? "",
    definitions: snapshot.english_gloss ? [snapshot.english_gloss] : [],
  };
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const key = getApiKey();
  const headers: HeadersInit = {
    "X-API-Key": key,
    ...(options.headers as Record<string, string>),
  };
  return fetch(url, { ...options, headers });
}

/**
 * Search words by keyword. Returns array of word entries or error.
 * Never throws; returns { words: [], error?: string } on failure.
 */
export async function getWords(
  params: GetWordsParams
): Promise<GetWordsResult> {
  const { keyword, page, range, wordClasses, strict, dialects, examples } =
    params;
  if (!keyword.trim()) {
    return { words: [] };
  }

  const key = getApiKey();
  if (!key) {
    return { words: [], error: "Igbo API key not configured" };
  }

  const searchParams = new URLSearchParams();
  // Normalize to NFC so the API receives consistent Unicode (avoids 400 for some diacritics)
  searchParams.set("keyword", keyword.trim().normalize("NFC"));
  if (page != null) searchParams.set("page", String(page));
  if (range != null) searchParams.set("range", String(Math.min(25, range)));
  if (wordClasses) searchParams.set("wordClasses", wordClasses);
  if (strict !== undefined) searchParams.set("strict", String(strict));
  if (dialects) searchParams.set("dialects", dialects);
  if (examples) searchParams.set("examples", examples);

  const url = `${BASE_URL}/words?${searchParams.toString()}`;

  try {
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      const text = await res.text();
      const friendlyMessage =
        res.status === 400 && (text.includes("timed out") || text.includes("buffering"))
          ? "The Igbo API is temporarily slow or unavailable. Please try again in a moment."
          : res.status >= 500
            ? "The Igbo API is temporarily unavailable. Please try again later."
            : `Igbo API error: ${res.status} ${text.slice(0, 80)}`;
      return {
        words: [],
        error: friendlyMessage,
      };
    }
    const data = await res.json();
    const raw =
      Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.data)
          ? (data as { data: unknown[] }).data
          : Array.isArray((data as Record<string, unknown>)?.words)
            ? (data as { words: unknown[] }).words
            : [];
    const words = raw
      .map((item) => normalizeIgboApiWord(item))
      .filter((w): w is IgboApiWord => w != null);
    return { words };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { words: [], error: `Network error: ${message}` };
  }
}

/**
 * Fetch a single word by Igbo API id. For saved words and detail view.
 */
export async function getWordById(id: string): Promise<GetWordByIdResult> {
  if (!id.trim()) {
    return { word: null };
  }

  const key = getApiKey();
  if (!key) {
    return { word: null, error: "Igbo API key not configured" };
  }

  const url = `${BASE_URL}/words/${encodeURIComponent(id)}`;

  try {
    const res = await fetchWithAuth(url);
    if (!res.ok) {
      if (res.status === 404) return { word: null };
      const text = await res.text();
      return {
        word: null,
        error: `Igbo API error: ${res.status} ${text.slice(0, 100)}`,
      };
    }
    const data = await res.json();
    const word = normalizeIgboApiWord(data);
    return { word };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { word: null, error: `Network error: ${message}` };
  }
}
