/**
 * Audio kept on the learner's device between visits, so a returning learner hears
 * words straight away with no download. Uses the browser's Cache Storage; every
 * call fails quietly (private windows and some browsers don't allow it).
 *
 * Entries are refreshed after MAX_AGE_MS, so a clip an admin regenerates reaches
 * learners within that time. A refresh comes from the server's stored copy and
 * costs no voice credits.
 */

const CACHE_NAME = "ntughari-audio-v1";
const MAX_ENTRIES = 600;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SAVED_AT_HEADER = "x-ntughari-saved-at";

function cacheAvailable(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

function requestFor(key: string): Request {
  return new Request(`${window.location.origin}/__audio-cache/${encodeURIComponent(key)}`);
}

export async function readDeviceClip(key: string): Promise<Blob | null> {
  if (!cacheAvailable()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(requestFor(key));
    if (!hit) return null;
    const savedAt = Number(hit.headers.get(SAVED_AT_HEADER) ?? 0);
    if (Date.now() - savedAt > MAX_AGE_MS) {
      await cache.delete(requestFor(key));
      return null;
    }
    return await hit.blob();
  } catch {
    return null;
  }
}

export async function saveDeviceClip(key: string, blob: Blob): Promise<void> {
  if (!cacheAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      requestFor(key),
      new Response(blob, {
        headers: { "Content-Type": blob.type || "audio/mpeg", [SAVED_AT_HEADER]: String(Date.now()) },
      })
    );
    // Keys come back oldest first; drop the oldest beyond the cap.
    const keys = await cache.keys();
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(old);
  } catch {
    // storage full or blocked: the clip still plays, it just isn't kept
  }
}

/** Remove every stored clip whose key ends with `suffix` (any voice). */
export async function forgetDeviceClips(suffix: string): Promise<void> {
  if (!cacheAvailable()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    for (const request of await cache.keys()) {
      const key = decodeURIComponent(new URL(request.url).pathname.replace("/__audio-cache/", ""));
      if (key.endsWith(suffix)) await cache.delete(request);
    }
  } catch {
    // nothing to forget
  }
}

// ---- Dictionary lookups: which words have a human recording in the Igbo API ----

const LOOKUPS_KEY = "ntughari-dictionary-audio-v1";
const MAX_LOOKUPS = 3000;
/** "No recording" answers are re-checked sooner, in case the dictionary adds one. */
const FOUND_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MISSING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StoredLookup = { u: string | null; t: number };

function loadLookups(): Record<string, StoredLookup> {
  try {
    return JSON.parse(localStorage.getItem(LOOKUPS_KEY) ?? "{}") as Record<string, StoredLookup>;
  } catch {
    return {};
  }
}

const lookups = loadLookups();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** undefined = never looked up (or too old); null = looked up, no recording. */
export function readDictionaryLookup(word: string): string | null | undefined {
  const entry = lookups[word];
  if (!entry) return undefined;
  const ttl = entry.u ? FOUND_TTL_MS : MISSING_TTL_MS;
  return Date.now() - entry.t > ttl ? undefined : entry.u;
}

export function saveDictionaryLookup(word: string, url: string | null): void {
  lookups[word] = { u: url, t: Date.now() };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const entries = Object.entries(lookups).sort((a, b) => b[1].t - a[1].t).slice(0, MAX_LOOKUPS);
      localStorage.setItem(LOOKUPS_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      // storage full or blocked: lookups last for this visit only
    }
  }, 1000);
}
