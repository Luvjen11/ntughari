import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface PracticeResultProps {
  score: number;
  total: number;
  onRetry: () => void;
  onSave: () => void;
}

export function PracticeResult({ score, total, onRetry, onSave }: PracticeResultProps) {
  const navigate = useNavigate();
  const percentage = Math.round((score / total) * 100);

  useEffect(() => {
    onSave();
  }, [onSave]);

  const getMessage = () => {
    if (percentage >= 80) return "Amazing work! You're making great progress!";
    if (percentage >= 60) return "Well done! Keep practicing and you'll master this!";
    if (percentage >= 40) return "Good effort! Every practice session makes you stronger.";
    return "Don't worry — learning takes time. You're doing great by practicing!";
  };

  return (
    <Card className="border-2 border-border">
      <CardContent className="p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl font-bold text-primary mb-2">
            {score}/{total}
          </div>
          <p className="text-muted-foreground">{percentage}% correct</p>
        </div>
        
        <p className="text-lg mb-8">{getMessage()}</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} variant="outline" className="border-2">
            Practice Again
          </Button>
          <Button onClick={() => navigate("/practice")}>
            Back to Practice Hub
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
