interface PracticeProgressProps {
  current: number;
  total: number;
}

export function PracticeProgress({ current, total }: PracticeProgressProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm text-muted-foreground">
        Question {current + 1} of {total}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
