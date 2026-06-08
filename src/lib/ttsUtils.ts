/** Igbo-specific letters — narration with these is treated as Igbo for TTS routing */
const IGBO_MARKERS = /[ịọụỊỌỤṅŋàáèéìíòóúùÀÁÈÉÌÍÒÓÚÙ]/;

export function looksLikeIgbo(text: string): boolean {
  return IGBO_MARKERS.test(text.normalize("NFC"));
}

const MAX_TTS_CHUNK = 450;

/** Split long narration into YarnGPT-safe chunks (API limit 2000; shorter chunks fail less often). */
export function splitForTTS(text: string, maxLen = MAX_TTS_CHUNK): string[] {
  const normalized = text.trim().normalize("NFC");
  if (!normalized) return [];
  if (normalized.length <= maxLen) return [normalized];

  const paragraphs = normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      chunks.push(para);
      continue;
    }

    const sentences = para.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [para];
    let buffer = "";

    for (const sentence of sentences) {
      const piece = sentence.trim();
      if (!piece) continue;

      const candidate = buffer ? `${buffer} ${piece}` : piece;
      if (candidate.length <= maxLen) {
        buffer = candidate;
      } else {
        if (buffer) chunks.push(buffer);
        if (piece.length <= maxLen) {
          buffer = piece;
        } else {
          for (let i = 0; i < piece.length; i += maxLen) {
            chunks.push(piece.slice(i, i + maxLen));
          }
          buffer = "";
        }
      }
    }
    if (buffer) chunks.push(buffer);
  }

  return chunks.length > 0 ? chunks : [normalized.slice(0, maxLen)];
}
