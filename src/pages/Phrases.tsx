import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Volume2, Puzzle, Check, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { useTTS } from "@/hooks/useTTS";

interface Phrase {
  id: string;
  igbo_phrase: string;
  english_translation: string;
  order_index: number;
}

interface PhrasePart {
  id: string;
  phrase_id: string;
  igbo_word: string;
  english_meaning: string;
  grammar_note: string | null;
  order_index: number;
}

export default function Phrases() {
  const { speak } = useTTS();
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null);
  const [rebuildMode, setRebuildMode] = useState(false);
  const [userOrder, setUserOrder] = useState<PhrasePart[]>([]);
  const [availableParts, setAvailableParts] = useState<PhrasePart[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const { data: phrases, isLoading } = useQuery({
    queryKey: ["phrases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phrases")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as Phrase[];
    },
  });

  const { data: parts } = useQuery({
    queryKey: ["phrase_parts", selectedPhrase?.id],
    queryFn: async () => {
      if (!selectedPhrase) return [];
      const { data, error } = await supabase
        .from("phrase_parts")
        .select("*")
        .eq("phrase_id", selectedPhrase.id)
        .order("order_index");
      if (error) throw error;
      return data as PhrasePart[];
    },
    enabled: !!selectedPhrase,
  });

  const startRebuild = () => {
    if (!parts) return;
    setRebuildMode(true);
    setUserOrder([]);
    setAvailableParts([...parts].sort(() => Math.random() - 0.5));
    setIsCorrect(null);
  };

  const addPart = (part: PhrasePart) => {
    setUserOrder([...userOrder, part]);
    setAvailableParts(availableParts.filter((p) => p.id !== part.id));
  };

  const removePart = (part: PhrasePart) => {
    setAvailableParts([...availableParts, part]);
    setUserOrder(userOrder.filter((p) => p.id !== part.id));
  };

  const checkAnswer = () => {
    if (!parts) return;
    const correct = userOrder.every(
      (part, index) => part.order_index === index
    );
    setIsCorrect(correct);
  };

  const resetRebuild = () => {
    setRebuildMode(false);
    setUserOrder([]);
    setAvailableParts([]);
    setIsCorrect(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutal-card bg-secondary p-8 animate-pulse">
          <p className="font-display text-xl font-bold">Loading phrases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          to={selectedPhrase ? "#" : "/"}
          onClick={(e) => {
            if (selectedPhrase) {
              e.preventDefault();
              setSelectedPhrase(null);
              resetRebuild();
            }
          }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">
            {selectedPhrase ? "Back to Phrases" : "Back to Home"}
          </span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Phrase-to-Pieces
          </h1>
          <p className="text-muted-foreground">
            Break down familiar phrases and learn each word
          </p>
        </div>

        {!selectedPhrase ? (
          <>
            {/* Phrases List */}
            {phrases && phrases.length > 0 ? (
              <div className="space-y-4 max-w-2xl">
                {phrases.map((phrase, index) => (
                  <button
                    key={phrase.id}
                    onClick={() => setSelectedPhrase(phrase)}
                    className="brutal-card bg-card p-5 w-full text-left animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center shrink-0">
                        <Puzzle size={24} />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold mb-1">
                          {phrase.igbo_phrase}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {phrase.english_translation}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="brutal-card bg-muted p-8 text-center max-w-md">
                <p className="font-display text-xl font-bold mb-2">No phrases yet</p>
                <p className="text-muted-foreground">
                  Phrases are being prepared. Check back soon!
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected Phrase Detail */}
            <div className="max-w-2xl space-y-6">
              {/* Phrase Header */}
              <div className="brutal-card bg-card p-6 animate-bounce-in">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-1">
                      {selectedPhrase.igbo_phrase}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedPhrase.english_translation}
                    </p>
                  </div>
                  <button
                    onClick={() => speak(selectedPhrase.igbo_phrase)}
                    className="brutal-button bg-primary flex items-center gap-2"
                  >
                    <Volume2 size={20} />
                    <span>Play</span>
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              {!rebuildMode && parts && parts.length > 0 && (
                <div className="brutal-card bg-card p-6">
                  <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-4">
                    Word-by-Word Breakdown
                  </h3>
                  <div className="space-y-3">
                    {parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center gap-4 p-3 bg-muted rounded-lg border-2 border-foreground/20"
                      >
                        <span className="font-display text-xl font-bold min-w-[80px]">
                          {part.igbo_word}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{part.english_meaning}</p>
                          {part.grammar_note && (
                            <p className="text-muted-foreground text-sm">
                              {part.grammar_note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startRebuild}
                    className="brutal-button bg-secondary w-full mt-6 flex items-center justify-center gap-2"
                  >
                    <Puzzle size={20} />
                    <span>Practice Rebuilding</span>
                  </button>
                </div>
              )}

              {/* Rebuild Mode */}
              {rebuildMode && (
                <div className="brutal-card bg-card p-6 animate-bounce-in">
                  <h3 className="font-display font-bold text-lg mb-4">
                    Rebuild the phrase
                  </h3>

                  {/* User's current order */}
                  <div className="min-h-[60px] p-4 bg-muted rounded-lg border-2 border-foreground mb-4 flex flex-wrap gap-2">
                    {userOrder.length === 0 ? (
                      <span className="text-muted-foreground">
                        Tap words below to build the phrase...
                      </span>
                    ) : (
                      userOrder.map((part) => (
                        <button
                          key={part.id}
                          onClick={() => removePart(part)}
                          className="px-4 py-2 bg-primary rounded-lg border-2 border-foreground font-display font-bold shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          {part.igbo_word}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Available parts */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {availableParts.map((part) => (
                      <button
                        key={part.id}
                        onClick={() => addPart(part)}
                        className="px-4 py-2 bg-card rounded-lg border-2 border-foreground font-display font-bold shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5 hover:bg-muted"
                      >
                        {part.igbo_word}
                      </button>
                    ))}
                  </div>

                  {/* Feedback */}
                  {isCorrect !== null && (
                    <div
                      className={`p-4 rounded-lg border-2 border-foreground mb-4 ${
                        isCorrect ? "bg-green-200" : "bg-secondary"
                      }`}
                    >
                      <p className="font-display font-bold text-center">
                        {isCorrect ? "Correct! ✓" : "Not quite — try again!"}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={checkAnswer}
                      disabled={userOrder.length === 0}
                      className="brutal-button bg-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Check size={20} />
                      <span>Check</span>
                    </button>
                    <button
                      onClick={startRebuild}
                      className="brutal-button bg-muted flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
