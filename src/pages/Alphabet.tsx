import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, Star, ArrowLeft } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { Link } from "react-router-dom";

interface Letter {
  id: string;
  character: string;
  pronunciation_tip: string | null;
  order_index: number;
}

interface LetterExample {
  id: string;
  letter_id: string;
  igbo_word: string;
  english_translation: string;
}

export default function Alphabet() {
  const { speakIgbo } = useTTS();
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [letterOfTheDay, setLetterOfTheDay] = useState<Letter | null>(null);

  const { data: letters, isLoading, error } = useQuery({
    queryKey: ["letters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("letters")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as Letter[];
    },
  });

  const { data: examples } = useQuery({
    queryKey: ["letter_examples", selectedLetter?.id],
    queryFn: async () => {
      if (!selectedLetter) return [];
      const { data, error } = await supabase
        .from("letter_examples")
        .select("*")
        .eq("letter_id", selectedLetter.id);
      if (error) throw error;
      return data as LetterExample[];
    },
    enabled: !!selectedLetter,
  });

  // Set letter of the day based on the current date
  useEffect(() => {
    if (letters && letters.length > 0) {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const index = dayOfYear % letters.length;
      setLetterOfTheDay(letters[index]);
    }
  }, [letters]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutal-card bg-primary p-8 animate-pulse">
          <p className="font-display text-xl font-bold">Loading alphabet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutal-card bg-destructive p-8">
          <p className="font-display text-xl font-bold text-destructive-foreground">
            Error loading alphabet. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (!letters || letters.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </Link>
          <div className="brutal-card bg-muted p-8 text-center max-w-md mx-auto">
            <p className="font-display text-xl font-bold mb-2">No letters yet</p>
            <p className="text-muted-foreground">
              The alphabet content is being prepared. Check back soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Alphabet & Sounds
          </h1>
          <p className="text-muted-foreground">
            Tap any letter to hear its sound and see examples
          </p>
        </div>

        {/* Letter of the Day */}
        {letterOfTheDay && (
          <div className="mb-8">
            <div className="brutal-card bg-secondary p-6 max-w-md">
              <div className="flex items-center gap-2 mb-3">
                <Star className="text-foreground" size={20} fill="currentColor" />
                <span className="font-display font-bold text-sm uppercase tracking-wide">
                  Letter of the Day
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedLetter(letterOfTheDay);
                  speakIgbo(letterOfTheDay.character);
                }}
                className="flex items-center gap-4"
              >
                <span className="font-display text-5xl font-bold">
                  {letterOfTheDay.character}
                </span>
                <Volume2 className="text-foreground/60" size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Selected Letter Detail - NOW ABOVE THE GRID */}
        {selectedLetter && (
          <div className="brutal-card bg-card p-6 md:p-8 animate-fade-in max-w-2xl mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-5xl md:text-6xl font-bold mb-2">
                  {selectedLetter.character}
                </h2>
                {selectedLetter.pronunciation_tip && (
                  <p className="text-muted-foreground">
                    {selectedLetter.pronunciation_tip}
                  </p>
                )}
              </div>
              <button
                onClick={() => speakIgbo(selectedLetter.character)}
                className="brutal-button bg-primary flex items-center gap-2"
              >
                <Volume2 size={20} />
                <span>Play</span>
              </button>
            </div>

            {/* Examples */}
            {examples && examples.length > 0 && (
              <div>
                <h3 className="font-display font-bold text-lg mb-3">
                  Example Words
                </h3>
                <div className="space-y-3">
                  {examples.map((example) => (
                    <div
                      key={example.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg border-2 border-foreground"
                    >
                      <div>
                        <p className="font-display font-bold text-lg">
                          {example.igbo_word}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {example.english_translation}
                        </p>
                      </div>
                      <button
                        onClick={() => speakIgbo(example.igbo_word)}
                        className="p-2 rounded-lg border-2 border-foreground bg-card hover:bg-primary transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {examples && examples.length === 0 && (
              <p className="text-muted-foreground italic">
                No example words available yet for this letter.
              </p>
            )}
          </div>
        )}

        {/* Letter Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-3">
          {letters.map((letter) => (
            <button
              key={letter.id}
              onClick={() => {
                setSelectedLetter(letter);
                speakIgbo(letter.character);
              }}
              className={`brutal-card p-4 flex items-center justify-center aspect-square transition-all
                ${selectedLetter?.id === letter.id 
                  ? "bg-primary" 
                  : "bg-card hover:bg-muted"
                }`}
            >
              <span className="font-display text-2xl md:text-3xl font-bold">
                {letter.character}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
