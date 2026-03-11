import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, Heart, ArrowLeft, BookOpen, Search } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { Link } from "react-router-dom";
import { useSavedWords } from "@/hooks/useSavedWords";
import { useAuth } from "@/hooks/useAuth";
import { CultureNote } from "@/components/CultureNote";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWords, type IgboApiWord } from "@/lib/igboApi";

/** API may return definitions as string[] or object[] (e.g. { wordClass, definitions }). Return a string for one item. */
function definitionItemToString(d: unknown): string {
  if (typeof d === "string") return d;
  if (d && typeof d === "object" && Array.isArray((d as { definitions?: string[] }).definitions))
    return (d as { definitions: string[] }).definitions[0] ?? "";
  if (d && typeof d === "object" && typeof (d as { definition?: string }).definition === "string")
    return (d as { definition: string }).definition;
  return "";
}

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
  cultural_note: string | null;
  dialect: string | null;
}

export default function Vocabulary() {
  const { speakIgbo } = useTTS();
  const [selectedCategory, setSelectedCategory] = useState<VocabCategory | null>(null);
  const {
    savedWords,
    toggleSaveWord,
    isWordSaved,
    savedApiWordIds,
    toggleSaveApiWord,
    isApiWordSaved,
    isLoggedIn,
  } = useSavedWords();
  const { user } = useAuth();

  // Dictionary (Igbo API) state
  const [dictionaryKeyword, setDictionaryKeyword] = useState("");
  const [dictionaryResults, setDictionaryResults] = useState<IgboApiWord[]>([]);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionarySearched, setDictionarySearched] = useState(false);

  const handleDictionarySearch = async () => {
    const kw = dictionaryKeyword.trim();
    if (!kw) return;
    setDictionaryLoading(true);
    setDictionaryError(null);
    setDictionarySearched(true);
    const { words, error } = await getWords({ keyword: kw });
    setDictionaryLoading(false);
    if (error) {
      setDictionaryError(error);
      setDictionaryResults([]);
    } else {
      setDictionaryResults(words ?? []);
    }
  };

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

        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Vocabulary
          </h1>
          <p className="text-muted-foreground mb-4">
            Browse by category or search the Igbo dictionary
            {(savedWords.length > 0 || savedApiWordIds.length > 0) && (
              <>
                {" · "}
                <Link to="/my-words" className="font-semibold text-primary hover:underline">
                  View My Words ({savedWords.length + savedApiWordIds.length})
                </Link>
              </>
            )}
          </p>
          <Tabs defaultValue="by-category" className="w-full max-w-2xl">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="by-category">By category</TabsTrigger>
              <TabsTrigger value="dictionary">Dictionary</TabsTrigger>
            </TabsList>
            <TabsContent value="by-category" className="mt-6">
              {!selectedCategory ? (
                <>
                  {!isLoggedIn && savedWords.length > 0 && (
                    <div className="brutal-card bg-secondary/30 border-secondary p-4 mb-6">
                      <p className="text-sm">
                        <span className="font-semibold">Tip:</span> You have {savedWords.length} saved word{savedWords.length > 1 ? "s" : ""} stored locally.{" "}
                        <Link to="/auth" className="font-semibold text-primary hover:underline">
                          Sign in
                        </Link>{" "}
                        to save them permanently.
                      </p>
                    </div>
                  )}
                  {categories && categories.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
                    <div className="brutal-card bg-muted p-8 text-center max-w-md mt-4">
                      <p className="font-display text-xl font-bold mb-2">No categories yet</p>
                      <p className="text-muted-foreground">
                        Vocabulary content is being prepared. Check back soon!
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-6 mt-4">
                    <h2 className="font-display text-2xl font-bold">
                      {selectedCategory.name}
                    </h2>
                    {selectedCategory.description && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {selectedCategory.description}
                      </p>
                    )}
                  </div>
                  {loadingWords ? (
                    <div className="brutal-card bg-muted p-8 animate-pulse">
                      <p>Loading words...</p>
                    </div>
                  ) : words && words.length > 0 ? (
                    <div className="space-y-4">
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
                              {word.dialect && (
                                <p className="text-muted-foreground text-sm mt-1">
                                  Dialect: {word.dialect}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleSaveWord(word.id)}
                                className={`p-2 rounded-lg border-2 border-foreground transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5
                                  ${isWordSaved(word.id) ? "bg-secondary" : "bg-card hover:bg-muted"}`}
                              >
                                <Heart
                                  size={18}
                                  fill={isWordSaved(word.id) ? "currentColor" : "none"}
                                />
                              </button>
                              <button
                                onClick={() => speakIgbo(word.igbo_word)}
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
                          {word.cultural_note && (
                            <CultureNote note={word.cultural_note} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="brutal-card bg-muted p-8 text-center max-w-md mt-4">
                      <p className="font-display text-xl font-bold mb-2">No words yet</p>
                      <p className="text-muted-foreground">
                        Words for this category are being prepared.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="dictionary" className="mt-6">
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Search in Igbo or English; tap the heart to save words for practice.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search word (e.g. house, ụlọ)"
                    value={dictionaryKeyword}
                    onChange={(e) => setDictionaryKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDictionarySearch()}
                    className="flex-1 border-2 border-foreground"
                  />
                  <Button
                    onClick={handleDictionarySearch}
                    disabled={dictionaryLoading}
                    className="border-2 border-foreground shadow-brutal-sm"
                  >
                    <Search size={18} className="mr-2" />
                    Search
                  </Button>
                </div>
                {dictionaryError && (
                  <div className="brutal-card bg-destructive/10 border-destructive p-4 text-sm text-destructive">
                    {dictionaryError}
                  </div>
                )}
                {dictionaryLoading && (
                  <div className="brutal-card bg-muted p-8 animate-pulse">
                    <p>Searching...</p>
                  </div>
                )}
                {!dictionaryLoading && dictionarySearched && dictionaryResults.length === 0 && !dictionaryError && (
                  <div className="brutal-card bg-muted p-8 text-center max-w-md">
                    <p className="font-display font-bold mb-2">No results</p>
                    <p className="text-muted-foreground text-sm">
                      Try a different search term.
                    </p>
                  </div>
                )}
                {!dictionaryLoading && dictionaryResults.length > 0 && (
                  <div className="space-y-4 mt-4">
                    {dictionaryResults.map((w) => (
                      <div
                        key={w.id}
                        className="brutal-card bg-card p-5 animate-slide-up"
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="font-display text-2xl font-bold">
                              {w.word}
                            </h3>
                            <p className="text-muted-foreground text-sm capitalize">
                              {w.wordClass}
                            </p>
                            {w.definitions?.length > 0 && (
                              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                {w.definitions.slice(0, 3).map((d, i) => {
                                  const text = definitionItemToString(d);
                                  return text ? <li key={i}>{text}</li> : null;
                                })}
                              </ul>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleSaveApiWord(w.id)}
                              className={`p-2 rounded-lg border-2 border-foreground transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5
                                ${isApiWordSaved(w.id) ? "bg-secondary" : "bg-card hover:bg-muted"}`}
                              title={isApiWordSaved(w.id) ? "Unsave" : "Save to My Words"}
                            >
                              <Heart
                                size={18}
                                fill={isApiWordSaved(w.id) ? "currentColor" : "none"}
                              />
                            </button>
                            <button
                              onClick={() => speakIgbo(w.word)}
                              className="p-2 rounded-lg border-2 border-foreground bg-primary hover:bg-primary/80 transition-colors shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                              title="Play pronunciation"
                            >
                              <Volume2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
