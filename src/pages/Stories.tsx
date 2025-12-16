import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight } from "lucide-react";

interface Story {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface StoryWithProgress extends Story {
  sceneCount: number;
}

export default function Stories() {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories-with-scenes"],
    queryFn: async () => {
      // Get all published stories
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .eq("is_published", true)
        .order("order_index", { ascending: true });

      if (storiesError) throw storiesError;

      // Get scene counts for each story
      const storiesWithCounts: StoryWithProgress[] = await Promise.all(
        (storiesData || []).map(async (story) => {
          const { count } = await supabase
            .from("story_scenes")
            .select("*", { count: "exact", head: true })
            .eq("story_id", story.id)
            .eq("is_active", true);

          return {
            ...story,
            sceneCount: count || 0,
          };
        })
      );

      return storiesWithCounts;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading stories...</div>
      </div>
    );
  }

  if (!stories || stories.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">No stories available yet.</p>
        <Button asChild variant="outline">
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-foreground">
            Stories
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Reflective narratives that introduce you to Igbo language and culture, 
            one scene at a time.
          </p>
        </div>

        <div className="space-y-4">
          {stories.map((story, index) => (
            <Link key={story.id} to={`/story/${story.id}`}>
              <Card className="border-2 border-border hover:border-primary transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        {index + 1}
                      </span>
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                        {story.title}
                      </CardTitle>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>
                </CardHeader>
                <CardContent>
                  {story.description && (
                    <p className="text-muted-foreground mb-3">
                      {story.description}
                    </p>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {story.sceneCount} {story.sceneCount === 1 ? "scene" : "scenes"}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button asChild variant="ghost">
            <Link to="/">← Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
