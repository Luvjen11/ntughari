import { Button } from "@/components/ui/button";

interface IgboCharacterPadProps {
  onCharacterClick: (char: string) => void;
  disabled?: boolean;
}

const IGBO_CHARACTERS = [
  "ị", "Ị", "ọ", "Ọ", "ụ", "Ụ",
  "ñ", "ŋ", "ṅ",
  "á", "à", "é", "è", "í", "ì", "ó", "ò", "ú", "ù",
];

export function IgboCharacterPad({ onCharacterClick, disabled }: IgboCharacterPadProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Need Igbo characters? Tap below.
      </p>
      <div className="flex flex-wrap gap-1">
        {IGBO_CHARACTERS.map((char) => (
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
      </div>
    </div>
  );
}
