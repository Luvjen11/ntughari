import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ArrowLeft } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { AudioStateIcon } from "@/components/AudioStateIcon";
import { audioStateFor } from "@/lib/audioState";
import { letterPhrase } from "@/lib/igboLetters";
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
  audio_url?: string | null;
}

export default function Alphabet() {
  const tts = useTTS();
  const { speakIgboWord, speakSentence, prefetchDictionary } = tts;
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

  // All examples in one request (a small table), so a tapped letter can be
  // spoken with its example word straight away.
  const { data: allExamples } = useQuery({
    queryKey: ["letter_examples"],
    queryFn: async () => {
      const { data, error } = await supabase.from("letter_examples").select("*");
      if (error) throw error;
      return data as LetterExample[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const examplesByLetter = useMemo(() => {
    const map = new Map<string, LetterExample[]>();
    for (const ex of allExamples ?? []) {
      map.set(ex.letter_id, [...(map.get(ex.letter_id) ?? []), ex]);
    }
    return map;
  }, [allExamples]);

  const examples = useMemo(
    () => (selectedLetter ? examplesByLetter.get(selectedLetter.id) ?? [] : undefined),
    [selectedLetter, examplesByLetter]
  );

  /** "Ba, dị ka ọba. Ba." — the letter's sound said with its first example word. */
  const phraseFor = (letter: Letter) =>
    letterPhrase(letter.character, examplesByLetter.get(letter.id)?.[0]?.igbo_word);

  const playLetter = (letter: Letter) => {
    setSelectedLetter(letter);
    void speakSentence(phraseFor(letter), { igbo: true });
  };

  // Warm up the free dictionary recordings for the open letter's example words.
  useEffect(() => {
    for (const ex of examples ?? []) prefetchDictionary(ex.igbo_word);
  }, [examples, prefetchDictionary]);

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
                onClick={() => playLetter(letterOfTheDay)}
                className="flex items-center gap-4"
                aria-label={`Hear the letter ${letterOfTheDay.character}`}
              >
                <span className="font-display text-5xl font-bold">
                  {letterOfTheDay.character}
                </span>
                <span className="text-foreground/60">
                  <AudioStateIcon state={audioStateFor(phraseFor(letterOfTheDay), tts)} size={24} />
                </span>
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
                onClick={() => playLetter(selectedLetter)}
                className="brutal-button bg-primary flex items-center gap-2"
              >
                <AudioStateIcon state={audioStateFor(phraseFor(selectedLetter), tts)} size={20} />
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
                        onClick={() => speakIgboWord(example.igbo_word, { recordedUrl: example.audio_url })}
                        aria-label={`Hear ${example.igbo_word}`}
                        className="p-2 rounded-lg border-2 border-foreground bg-card hover:bg-primary transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <AudioStateIcon state={audioStateFor(example.igbo_word, tts)} />
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
              onClick={() => playLetter(letter)}
              aria-label={`Hear the letter ${letter.character}`}
              className={`brutal-card p-4 flex items-center justify-center aspect-square transition-all relative
                ${selectedLetter?.id === letter.id 
                  ? "bg-primary" 
                  : "bg-card hover:bg-muted"
                }`}
            >
              <span className="font-display text-2xl md:text-3xl font-bold">
                {letter.character}
              </span>
              {audioStateFor(phraseFor(letter), tts) === "loading" && (
                <span className="absolute top-1.5 right-1.5">
                  <AudioStateIcon state="loading" size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
