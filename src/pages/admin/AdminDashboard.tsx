import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { BookOpen, MessageSquare, Layers, Type, BookHeart } from "lucide-react";

export default function AdminDashboard() {
  const { data: counts, isLoading } = useQuery({
    queryKey: ["adminCounts"],
    queryFn: async () => {
      const [letters, vocabulary, skeletons, phrases, stories] = await Promise.all([
        supabase.from("letters").select("id", { count: "exact", head: true }),
        supabase.from("vocabulary").select("id", { count: "exact", head: true }),
        supabase.from("sentence_skeletons").select("id", { count: "exact", head: true }),
        supabase.from("phrases").select("id", { count: "exact", head: true }),
        supabase.from("stories").select("id", { count: "exact", head: true }),
      ]);
      
      return {
        letters: letters.count ?? 0,
        vocabulary: vocabulary.count ?? 0,
        skeletons: skeletons.count ?? 0,
        phrases: phrases.count ?? 0,
        stories: stories.count ?? 0,
      };
    },
  });

  const contentCards = [
    { title: "Letters", count: counts?.letters ?? 0, icon: Type, to: "/admin/letters", color: "bg-primary" },
    { title: "Vocabulary", count: counts?.vocabulary ?? 0, icon: BookOpen, to: "/admin/vocabulary", color: "bg-secondary" },
    { title: "Skeletons", count: counts?.skeletons ?? 0, icon: Layers, to: "/admin/skeletons", color: "bg-primary" },
    { title: "Phrases", count: counts?.phrases ?? 0, icon: MessageSquare, to: "/admin/phrases", color: "bg-secondary" },
    { title: "Stories", count: counts?.stories ?? 0, icon: BookHeart, to: "/admin/stories", color: "bg-primary" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your Ntụgharị content</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="brutal-card p-6 animate-pulse">
              <div className="h-12 w-12 bg-muted rounded-lg mb-4" />
              <div className="h-6 bg-muted rounded w-1/2 mb-2" />
              <div className="h-10 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {contentCards.map((card) => (
            <Link key={card.title} to={card.to} className="brutal-card p-6 group">
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 border-2 border-foreground`}>
                <card.icon size={24} />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">{card.title}</h3>
              <p className="font-display text-4xl font-bold">{card.count}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
