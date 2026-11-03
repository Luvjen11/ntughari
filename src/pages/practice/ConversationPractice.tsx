import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AiConversation } from "@/components/practice/AiConversation";

type Level = "beginner" | "intermediate" | "advanced";

const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function ConversationPractice() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level>(
    () => (localStorage.getItem("tutorLevel") as Level) || "beginner"
  );

  const changeLevel = (next: Level) => {
    setLevel(next);
    localStorage.setItem("tutorLevel", next);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/practice")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Practice Hub
        </Button>

        <h1 className="text-2xl font-bold mb-1">Conversation Tutor</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Chat with your Igbo tutor in text or voice. Replies are spoken with YarnGPT when available.
        </p>

        <div className="flex gap-2 mb-4">
          {LEVELS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={level === option.value ? "default" : "outline"}
              onClick={() => changeLevel(option.value)}
              className="border-2"
            >
              {option.label}
            </Button>
          ))}
        </div>

        <AiConversation key={level} level={level} />
      </div>
    </div>
  );
}
