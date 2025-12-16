import { Sparkles } from "lucide-react";

interface CultureNoteProps {
  note: string;
}

export function CultureNote({ note }: CultureNoteProps) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3 border-2 border-secondary flex gap-3 items-start mt-3">
      <div className="w-6 h-6 rounded-full bg-secondary border border-foreground/20 flex items-center justify-center shrink-0">
        <Sparkles size={12} />
      </div>
      <div>
        <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Culture Note
        </p>
        <p className="text-sm leading-relaxed">{note}</p>
      </div>
    </div>
  );
}
