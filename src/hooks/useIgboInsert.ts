import { useCallback, useRef } from "react";
import { insertIgboChar } from "@/lib/igboText";

type IgboEditableElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Caret-aware Igbo character insertion for a controlled input or textarea.
 * Attach `ref` to the element and pass `insert` to IgboCharacterPad.
 */
export function useIgboInsert<T extends IgboEditableElement>(
  value: string,
  setValue: (next: string) => void
) {
  const ref = useRef<T>(null);

  const insert = useCallback(
    (char: string) => {
      const el = ref.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const result = insertIgboChar(value, char, start, end);
      setValue(result.value);
      setTimeout(() => {
        if (!el) return;
        el.focus();
        el.setSelectionRange(result.caret, result.caret);
      }, 0);
    },
    [value, setValue]
  );

  return { ref, insert };
}
