import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { StoryCard } from "@/components/StoryCard";
import { WordsFromScene } from "@/components/story/WordsFromScene";
import { ScenePractice } from "@/components/story/ScenePractice";

interface Story {
  id: string;
  title: string;
  description: string | null;
}

interface StoryScene {
  id: string;
  title: string;
  narration_text: string;
  order_index: number;
  cultural_note: string | null;
}

interface SceneVocab {
  id: string;
  vocab_id: string;
  vocabulary: {
    id: string;
    igbo_word: string;
    english_translation: string;
    example_sentence_igbo: string | null;
  };
}

type ViewMode = "scene" | "words" | "practice";

export default function StoryPlayer() {
  const { storyId } = useParams<{ storyId: string }>();
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("scene");

  // Fetch story details
  const { data: story } = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .maybeSingle();

      if (error) throw error;
      return data as Story | null;
    },
    enabled: !!storyId,
  });

  // Fetch scenes for this story
  const { data: scenes, isLoading } = useQuery({
    queryKey: ["story-scenes", storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_scenes")
        .select("*")
        .eq("story_id", storyId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as StoryScene[];
    },
    enabled: !!storyId,
  });

  const currentScene = scenes?.[currentSceneIndex];

  // Fetch vocabulary linked to current scene
  const { data: sceneVocab } = useQuery({
    queryKey: ["scene-vocab", currentScene?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_scene_vocab")
        .select(`
          id,
          vocab_id,
          vocabulary (
            id,
            igbo_word,
            english_translation,
            example_sentence_igbo
          )
        `)
        .eq("scene_id", currentScene!.id)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as SceneVocab[];
    },
    enabled: !!currentScene?.id,
  });

  const totalScenes = scenes?.length ?? 0;
  const isFirstScene = currentSceneIndex === 0;
  const isLastScene = currentSceneIndex === totalScenes - 1;
  const hasVocab = sceneVocab && sceneVocab.length > 0;

  const goToNextScene = () => {
    if (!isLastScene) {
      setCurrentSceneIndex((prev) => prev + 1);
      setViewMode("scene");
    }
  };

  const goToPreviousScene = () => {
    if (!isFirstScene) {
      setCurrentSceneIndex((prev) => prev - 1);
      setViewMode("scene");
    }
  };

  const handleContinue = () => {
    if (viewMode === "scene" && hasVocab) {
      setViewMode("words");
    } else if (viewMode === "words" && hasVocab) {
      setViewMode("practice");
    } else if (isLastScene) {
      // Story complete - could redirect or show completion
      setViewMode("scene");
    } else {
      goToNextScene();
    }
  };

  const handleSkipPractice = () => {
    if (isLastScene) {
      setViewMode("scene");
    } else {
      goToNextScene();
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
        <p className="text-muted-foreground">No scenes available for this story.</p>
        <Button asChild variant="outline">
          <Link to="/stories">Back to Stories</Link>
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
            <Link to="/stories">← Stories</Link>
          </Button>
          <div className="text-center">
            <span className="text-sm text-muted-foreground font-medium block">
              {story?.title}
            </span>
            <span className="text-xs text-muted-foreground">
              Scene {currentSceneIndex + 1} of {totalScenes}
            </span>
          </div>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {viewMode === "scene" && currentScene && (
            <StoryCard
              key={currentScene.id}
              title={currentScene.title}
              narrationText={currentScene.narration_text}
              culturalNote={currentScene.cultural_note}
            />
          )}

          {viewMode === "words" && sceneVocab && (
            <WordsFromScene
              words={sceneVocab.map((sv) => sv.vocabulary)}
              onContinue={handleContinue}
            />
          )}

          {viewMode === "practice" && sceneVocab && (
            <ScenePractice
              words={sceneVocab.map((sv) => sv.vocabulary)}
              onComplete={handleSkipPractice}
              onSkip={handleSkipPractice}
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
                onClick={() => {
                  setCurrentSceneIndex(index);
                  setViewMode("scene");
                }}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentSceneIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to scene ${index + 1}`}
              />
            ))}
          </div>

          {viewMode === "scene" ? (
            <Button onClick={handleContinue} className="border-2">
              {hasVocab ? "Continue" : isLastScene ? "Finish" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleContinue} className="border-2">
              {viewMode === "words" ? "Practice" : isLastScene ? "Finish" : "Next Scene"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
