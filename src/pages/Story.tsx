import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { StoryCard } from "@/components/StoryCard";

export default function Story() {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  const { data: scenes, isLoading } = useQuery({
    queryKey: ["story-scenes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_scenes")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const currentScene = scenes?.[currentSceneIndex];
  const totalScenes = scenes?.length ?? 0;
  const isFirstScene = currentSceneIndex === 0;
  const isLastScene = currentSceneIndex === totalScenes - 1;

  const goToNextScene = () => {
    if (!isLastScene) {
      setCurrentSceneIndex((prev) => prev + 1);
    }
  };

  const goToPreviousScene = () => {
    if (!isFirstScene) {
      setCurrentSceneIndex((prev) => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading story...</div>
      </div>
    );
  }

  if (!scenes || scenes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">No story scenes available yet.</p>
        <Button asChild variant="outline">
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b-2 border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">← Back</Link>
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Scene {currentSceneIndex + 1} of {totalScenes}
          </span>
        </div>
      </header>

      {/* Story Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {currentScene && (
            <StoryCard
              key={currentScene.id}
              title={currentScene.title}
              narrationText={currentScene.narration_text}
            />
          )}
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="p-4 border-t-2 border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={goToPreviousScene}
            disabled={isFirstScene}
            className="border-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {/* Progress dots */}
          <div className="flex gap-2">
            {scenes.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSceneIndex(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentSceneIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to scene ${index + 1}`}
              />
            ))}
          </div>

          {isLastScene ? (
            <Button asChild className="border-2">
              <Link to="/">Start Learning →</Link>
            </Button>
          ) : (
            <Button onClick={goToNextScene} className="border-2">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
