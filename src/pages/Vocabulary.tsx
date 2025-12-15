import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, Heart, ArrowLeft, BookOpen } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { Link } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface VocabCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  order_index: number;
}

interface VocabWord {
  id: string;
  category_id: string;
  igbo_word: string;
  english_translation: string;
  example_sentence_igbo: string | null;
  example_sentence_english: string | null;
}

export default function Vocabulary() {
  const { speak } = useTTS();
  const [selectedCategory, setSelectedCategory] = useState<VocabCategory | null>(null);
  const [savedWords, setSavedWords] = useLocalStorage<string[]>("my-words", []);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["vocab_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocab_categories")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as VocabCategory[];
    },
  });

  const { data: words, isLoading: loadingWords } = useQuery({
    queryKey: ["vocabulary", selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("category_id", selectedCategory.id);
      if (error) throw error;
      return data as VocabWord[];
    },
    enabled: !!selectedCategory,
  });

  const toggleSaveWord = (wordId: string) => {
    setSavedWords((prev) =>
      prev.includes(wordId)
        ? prev.filter((id) => id !== wordId)
        : [...prev, wordId]
    );
  };

  if (loadingCategories) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutal-card bg-secondary p-8 animate-pulse">
          <p className="font-display text-xl font-bold">Loading vocabulary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          to={selectedCategory ? "#" : "/"}
          onClick={(e) => {
            if (selectedCategory) {
              e.preventDefault();
              setSelectedCategory(null);
            }
          }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">
            {selectedCategory ? "Back to Categories" : "Back to Home"}
          </span>
        </Link>

        {!selectedCategory ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Vocabulary
              </h1>
              <p className="text-muted-foreground">
                Choose a category to start learning words
              </p>
            </div>

            {/* Categories Grid */}
            {categories && categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                {categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className="brutal-card bg-card p-6 text-left animate-bounce-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center">
                        <BookOpen size={20} />
                      </div>
                      <h3 className="font-display text-xl font-bold">
                        {category.name}
                      </h3>
                    </div>
                    {category.description && (
                      <p className="text-muted-foreground text-sm">
                        {category.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="brutal-card bg-muted p-8 text-center max-w-md">
                <p className="font-display text-xl font-bold mb-2">No categories yet</p>
                <p className="text-muted-foreground">
                  Vocabulary content is being prepared. Check back soon!
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Category Header */}
            <div className="mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                {selectedCategory.name}
              </h1>
              {selectedCategory.description && (
                <p className="text-muted-foreground">
                  {selectedCategory.description}
                </p>
              )}
            </div>

            {/* Words List */}
            {loadingWords ? (
              <div className="brutal-card bg-muted p-8 animate-pulse">
                <p>Loading words...</p>
              </div>
            ) : words && words.length > 0 ? (
              <div className="space-y-4 max-w-2xl">
                {words.map((word) => (
                  <div
                    key={word.id}
                    className="brutal-card bg-card p-5 animate-slide-up"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="font-display text-2xl font-bold">
                          {word.igbo_word}
                        </h3>
                        <p className="text-muted-foreground">
                          {word.english_translation}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleSaveWord(word.id)}
                          className={`p-2 rounded-lg border-2 border-foreground transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5
                            ${savedWords.includes(word.id) ? "bg-secondary" : "bg-card hover:bg-muted"}`}
                        >
                          <Heart
                            size={18}
                            fill={savedWords.includes(word.id) ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={() => speak(word.igbo_word)}
                          className="p-2 rounded-lg border-2 border-foreground bg-primary hover:bg-primary/80 transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>
                    </div>

                    {word.example_sentence_igbo && (
                      <div className="bg-muted rounded-lg p-3 border-2 border-foreground/20">
                        <p className="font-medium text-sm mb-1">
                          {word.example_sentence_igbo}
                        </p>
                        {word.example_sentence_english && (
                          <p className="text-muted-foreground text-sm">
                            {word.example_sentence_english}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="brutal-card bg-muted p-8 text-center max-w-md">
                <p className="font-display text-xl font-bold mb-2">No words yet</p>
                <p className="text-muted-foreground">
                  Words for this category are being prepared.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
