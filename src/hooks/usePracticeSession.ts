import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PracticeType = "translation" | "fill_gap" | "phrase_rebuild";

interface PracticeItem {
  id: string;
  correct: boolean;
}

export function usePracticeSession(practiceType: PracticeType) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<PracticeItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const totalQuestions = 5;

  const recordAnswer = useCallback((itemId: string, correct: boolean) => {
    setItems(prev => [...prev, { id: itemId, correct }]);
    if (correct) {
      setScore(prev => prev + 1);
    }
    
    if (currentIndex + 1 >= totalQuestions) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, totalQuestions]);

  const saveSession = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.from("practice_sessions").insert([{
        user_id: user.id,
        practice_type: practiceType,
        items_practiced: items as unknown as undefined,
        score,
        total_questions: totalQuestions,
      }]);
    } catch (error) {
      console.error("Failed to save practice session:", error);
    }
  }, [user, practiceType, items, score, totalQuestions]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setItems([]);
    setIsComplete(false);
  }, []);

  return {
    currentIndex,
    score,
    totalQuestions,
    isComplete,
    recordAnswer,
    saveSession,
    reset,
  };
}
