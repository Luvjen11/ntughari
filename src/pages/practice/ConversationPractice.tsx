import { useState } from "react";
import { AiConversation, type TutorLevel } from "@/components/practice/AiConversation";

const LEVEL_KEY = "tutorLevel";

function readLevel(): TutorLevel {
  try {
    const stored = localStorage.getItem(LEVEL_KEY);
    if (stored === "beginner" || stored === "intermediate" || stored === "advanced") return stored;
  } catch {
    // storage blocked: fall back to beginner
  }
  return "beginner";
}

export default function ConversationPractice() {
  const [level, setLevel] = useState<TutorLevel>(readLevel);

  const changeLevel = (next: TutorLevel) => {
    setLevel(next);
    try {
      localStorage.setItem(LEVEL_KEY, next);
    } catch {
      // storage blocked: the level lasts for this visit only
    }
  };

  // Fills the screen below the 64px site header, like a chat app.
  return (
    <div className="h-[calc(100dvh-4rem)]">
      <AiConversation level={level} onLevelChange={changeLevel} />
    </div>
  );
}
