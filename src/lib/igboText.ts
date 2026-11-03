export interface IgboInsertResult {
  value: string;
  caret: number;
}

/**
 * Insert a character (or combining tone mark) at a caret position and
 * NFC-normalize so `a` + U+0301 becomes the single character `á`.
 * Returns the new value and where the caret should land.
 */
export function insertIgboChar(
  value: string,
  char: string,
  start: number,
  end: number
): IgboInsertResult {
  const prefix = (value.slice(0, start) + char).normalize("NFC");
  const next = (value.slice(0, start) + char + value.slice(end)).normalize("NFC");
  return { value: next, caret: prefix.length };
}
