import { Languages, BookOpen, Layers, Puzzle, Play, Library } from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const modules = [
  {
    to: "/alphabet",
    icon: Languages,
    title: "Alphabet & Sounds",
    description: "Master the 36 Igbo letters and their unique pronunciations",
    color: "primary" as const,
  },
  {
    to: "/vocabulary",
    icon: BookOpen,
    title: "Vocabulary",
    description: "Build your word knowledge across everyday categories",
    color: "secondary" as const,
  },
  {
    to: "/skeletons",
    icon: Layers,
    title: "Sentence Skeletons",
    description: "Understand how Igbo sentences are constructed",
    color: "secondary" as const,
  },
  {
    to: "/phrases",
    icon: Puzzle,
    title: "Phrase-to-Pieces",
    description: "Break down familiar phrases into learnable parts",
    color: "primary" as const,
  },
];

export default function Index() {
  // Fetch Story 1 (Finding Your Voice) for the intro CTA
  const { data: introStory } = useQuery({
    queryKey: ["intro-story"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("id, title")
        .eq("title", "Finding Your Voice")
        .single();
      if (error) return null;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-foreground">
            Ntụgharị
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-display mb-4">
            The Bridge
          </p>
          <div className="brutal-card bg-card p-6 md:p-8 max-w-2xl mx-auto mb-8">
            <p className="text-lg text-foreground leading-relaxed">
              You understand Igbo. Now let's help you <span className="font-bold text-primary">speak</span> it. 
              Ntụgharị creates a safe, judgment-free space to practice and build confidence 
              in your heritage language.
            </p>
          </div>
          
          {/* Story CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {introStory && (
              <Button asChild size="lg" className="gap-2 text-lg">
                <Link to={`/story/${introStory.id}`}>
                  <Play className="h-5 w-5" />
                  Play Intro Story
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="gap-2 border-2">
              <Link to="/stories">
                <Library className="h-5 w-5" />
                Explore Stories
              </Link>
            </Button>
          </div>
          {introStory && (
            <p className="text-sm text-muted-foreground mt-3">
              Understand why Ntụgharị exists
            </p>
          )}
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {modules.map((module, index) => (
            <div 
              key={module.to} 
              className="animate-bounce-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ModuleCard {...module} />
            </div>
          ))}
        </div>
      </section>

      {/* Encouragement Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary border-3 border-foreground rounded-lg p-6 shadow-brutal text-center">
            <p className="font-display text-lg font-semibold text-foreground">
              Every word you learn is a step closer to your roots. 🌱
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
