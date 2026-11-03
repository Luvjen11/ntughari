import { Button } from "@/components/ui/button";

interface IgboCharacterPadProps {
  onCharacterClick: (char: string) => void;
  disabled?: boolean;
  /** Hide the digraph row and helper text for tight layouts (chat, transcript box) */
  compact?: boolean;
}

const LETTERS = ["ị", "Ị", "ọ", "Ọ", "ụ", "Ụ", "ṅ", "Ṅ", "ñ", "ŋ"];

// Combining marks: tapped after a vowel they merge with it (a + ◌́ = á, ị + ◌̀ = ị̀)
const TONE_MARKS = [
  { char: "́", label: "◌́", title: "High tone — type the vowel first, then tap" },
  { char: "̀", label: "◌̀", title: "Low tone — type the vowel first, then tap" },
  { char: "̄", label: "◌̄", title: "Steady tone — type the vowel first, then tap" },
];

const DIGRAPHS = ["ch", "gb", "gh", "gw", "kp", "kw", "nw", "ny", "sh"];

export function IgboCharacterPad({ onCharacterClick, disabled, compact }: IgboCharacterPadProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {LETTERS.map((char) => (
          <Button
            key={char}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onCharacterClick(char)}
            className="w-9 h-9 text-base font-medium border-2"
          >
            {char}
          </Button>
        ))}
        <span className="w-px h-6 bg-border mx-1" aria-hidden />
        {TONE_MARKS.map((mark) => (
          <Button
            key={mark.char}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onCharacterClick(mark.char)}
            title={mark.title}
            className="w-9 h-9 text-base font-medium border-2 border-dashed"
          >
            {mark.label}
          </Button>
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1">
          {DIGRAPHS.map((digraph) => (
            <Button
              key={digraph}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onCharacterClick(digraph)}
              className="h-9 px-2.5 text-sm font-medium border-2"
            >
              {digraph}
            </Button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Tones: type the vowel, then tap a tone mark — a + ◌́ = á, ọ + ◌̀ = ọ̀.
      </p>
    </div>
  );
}
