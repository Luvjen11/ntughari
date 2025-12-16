import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Bookmark, BookmarkCheck } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { useSavedWords } from "@/hooks/useSavedWords";

interface Word {
  id: string;
  igbo_word: string;
  english_translation: string;
}

interface WordsFromSceneProps {
  words: Word[];
  onContinue: () => void;
}

export function WordsFromScene({ words, onContinue }: WordsFromSceneProps) {
  const { speak, isSpeaking } = useTTS();
  const { savedWords, toggleSaveWord, loading: isSavingWords } = useSavedWords();

  const handleSpeak = (text: string) => {
    speak(text, { rate: 0.75 });
  };

  const handleToggleSave = (wordId: string) => {
    toggleSaveWord(wordId);
  };

  if (words.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-border shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-foreground text-center">
          Words from this scene
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Tap to hear pronunciation, save to My Words
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {words.map((word) => {
          const isSaved = savedWords.includes(word.id);

          return (
            <div
              key={word.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex-1">
                <span className="font-semibold text-foreground text-lg">
                  {word.igbo_word}
                </span>
                <span className="text-muted-foreground mx-2">—</span>
                <span className="text-muted-foreground">
                  {word.english_translation}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSpeak(word.igbo_word)}
                  className="h-9 w-9"
                  aria-label={`Listen to ${word.igbo_word}`}
                >
                  <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleSave(word.id)}
                  disabled={isSavingWords}
                  className="h-9 w-9"
                  aria-label={isSaved ? "Remove from My Words" : "Save to My Words"}
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}

        <div className="pt-4">
          <Button onClick={onContinue} className="w-full border-2">
            Ready to practice →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
