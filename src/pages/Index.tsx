import {
  Languages,
  BookOpen,
  Layers,
  Puzzle,
  Play,
  Library,
  Brain,
  Mic,
  Bot,
  Volume2,
  Heart,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";
import { OnboardingBanner } from "@/components/OnboardingBanner";
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
    to: "/practice",
    icon: Brain,
    title: "Practice",
    description: "Speaking drills, conversation tutor, and active recall",
    color: "primary" as const,
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

const highlights = [
  {
    icon: Mic,
    title: "Speak, don't just read",
    description: "Use This Word — daily mic-based drills with real feedback on your Igbo sentences.",
    to: "/practice/use-this-word",
  },
  {
    icon: Bot,
    title: "Conversation tutor",
    description: "Type or record messages; hear Igbo replies with English translations.",
    to: "/practice/conversation",
  },
  {
    icon: Volume2,
    title: "Native-quality audio",
    description: "Human recordings, Igbo API, and YarnGPT voices — never English TTS for Igbo.",
    to: "/vocabulary",
  },
  {
    icon: Heart,
    title: "My Words",
    description: "Save from the dictionary or categories; practice and play all from one list.",
    to: "/practice/my-words",
  },
  {
    icon: Library,
    title: "Story layer",
    description: "Cultural narratives with scene vocabulary and narrated scenes.",
    to: "/stories",
  },
  {
    icon: Trophy,
    title: "Track your growth",
    description: "Session scores, streaks, and saved word counts when you're signed in.",
    to: "/progress",
  },
];

export default function Index() {
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
              You understand Igbo. Now let&apos;s help you <span className="font-bold text-primary">speak</span> it.
              Practice with your voice, hear real pronunciation, and build confidence in your heritage language.
            </p>
          </div>

          <OnboardingBanner introStoryId={introStory?.id} />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="gap-2 text-lg border-2 border-foreground">
              <Link to="/practice">
                <Brain className="h-5 w-5" />
                Start practicing
              </Link>
            </Button>
            {introStory && (
              <Button asChild size="lg" variant="outline" className="gap-2 text-lg border-2">
                <Link to={`/story/${introStory.id}`}>
                  <Play className="h-5 w-5" />
                  Play intro story
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg" className="gap-2 border-2">
              <Link to="/stories">
                <Library className="h-5 w-5" />
                Explore stories
              </Link>
            </Button>
          </div>
          {introStory && (
            <p className="text-sm text-muted-foreground mt-3">
              New here? Watch the intro story first, or jump straight into practice.
            </p>
          )}
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.slice(0, 4).map((module, index) => (
              <div
                key={module.to}
                className="animate-bounce-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ModuleCard {...module} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center animate-bounce-in" style={{ animationDelay: "400ms" }}>
            <div className="w-full md:w-[calc(50%-0.75rem)]">
              <ModuleCard {...modules[4]} />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mb-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Why learners use Ntụgharị
            </h2>
            <Link
              to="/features"
              className="inline-flex items-center gap-1 font-display font-semibold text-sm text-primary hover:underline"
            >
              All features in detail
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlights.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="brutal-card bg-card p-5 hover:border-primary transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg border-2 border-foreground bg-secondary flex items-center justify-center mb-3">
                  <item.icon size={20} />
                </div>
                <h3 className="font-display font-bold mb-1 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 border-t-3 border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Who are the Igbo?
          </h2>
          <div className="brutal-card bg-card p-6 md:p-8">
            <div className="space-y-4 text-foreground leading-relaxed">
              <p>
                The <strong>Igbo</strong> (pronounced &quot;ee-boh&quot;) are one of the largest ethnic groups in Africa,
                with over <strong>40 million people</strong> primarily in southeastern Nigeria. Millions more
                live across the diaspora — in the US, UK, Canada, and beyond.
              </p>
              <p>
                Igbo is a <strong>tonal language</strong> with a rich oral tradition, proverbs, and cultural
                expressions that have been passed down for generations.
              </p>
              <p className="text-muted-foreground italic">
                For many children of the diaspora, the language exists in a painful gap: they understand
                it when spoken by parents and elders, but freeze when trying to speak it themselves.
              </p>
              <p className="text-primary font-semibold">Ntụgharị exists to bridge that gap.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <Link
              to="/vocabulary"
              className="brutal-card bg-card p-4 border-2 border-foreground hover:border-primary transition-colors text-center"
            >
              <p className="font-display font-semibold text-foreground">Language &amp; dialects</p>
              <p className="text-sm text-muted-foreground mt-1">Explore words and regional variety</p>
            </Link>
            <Link
              to="/stories"
              className="brutal-card bg-card p-4 border-2 border-foreground hover:border-primary transition-colors text-center"
            >
              <p className="font-display font-semibold text-foreground">Proverbs &amp; storytelling</p>
              <p className="text-sm text-muted-foreground mt-1">Stories that carry culture</p>
            </Link>
            <Link
              to="/practice"
              className="brutal-card bg-card p-4 border-2 border-foreground hover:border-primary transition-colors text-center"
            >
              <p className="font-display font-semibold text-foreground">Active recall</p>
              <p className="text-sm text-muted-foreground mt-1">Practice speaking every day</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-secondary border-3 border-foreground rounded-lg p-6 shadow-brutal text-center">
            <p className="font-display text-lg font-semibold text-foreground">
              Every word you learn is a step closer to your roots.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
