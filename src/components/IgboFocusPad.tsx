import { useEffect, useRef } from "react";
import { IgboCharacterPad } from "@/components/practice/IgboCharacterPad";
import { insertIgboChar } from "@/lib/igboText";

type EditableElement = HTMLInputElement | HTMLTextAreaElement;

function isEditable(el: unknown): el is EditableElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

interface IgboFocusPadProps {
  /** Container whose inputs/textareas the pad should type into */
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Character pad for forms with many fields: remembers the last focused
 * input/textarea inside the container and inserts into it, dispatching a
 * native input event so controlled React fields pick up the change.
 */
export function IgboFocusPad({ containerRef }: IgboFocusPadProps) {
  const targetRef = useRef<EditableElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onFocusIn = (event: FocusEvent) => {
      if (isEditable(event.target)) targetRef.current = event.target;
    };
    container.addEventListener("focusin", onFocusIn);
    return () => container.removeEventListener("focusin", onFocusIn);
  }, [containerRef]);

  const insert = (char: string) => {
    const el = targetRef.current;
    if (!el || !el.isConnected) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const result = insertIgboChar(el.value, char, start, end);
    const proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(el, result.value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    el.setSelectionRange(result.caret, result.caret);
  };

  return <IgboCharacterPad onCharacterClick={insert} compact />;
}
