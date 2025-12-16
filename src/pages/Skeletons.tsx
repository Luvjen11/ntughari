import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Layers, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CultureNote } from "@/components/CultureNote";

interface SentenceSkeleton {
  id: string;
  name: string;
  structure: string;
  explanation: string | null;
  example_igbo: string;
  example_english: string;
  order_index: number;
  cultural_note: string | null;
}

export default function Skeletons() {
  const [selectedSkeleton, setSelectedSkeleton] = useState<SentenceSkeleton | null>(null);

  const { data: skeletons, isLoading } = useQuery({
    queryKey: ["sentence_skeletons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sentence_skeletons")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as SentenceSkeleton[];
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="brutal-card bg-primary p-8 animate-pulse">
          <p className="font-display text-xl font-bold">Loading patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          to={selectedSkeleton ? "#" : "/"}
          onClick={(e) => {
            if (selectedSkeleton) {
              e.preventDefault();
              setSelectedSkeleton(null);
            }
          }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">
            {selectedSkeleton ? "Back to Patterns" : "Back to Home"}
          </span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Sentence Skeletons
          </h1>
          <p className="text-muted-foreground">
            Understand how Igbo sentences are constructed
          </p>
        </div>

        {!selectedSkeleton ? (
          <>
            {/* Patterns List */}
            {skeletons && skeletons.length > 0 ? (
              <div className="space-y-4 max-w-2xl">
                {skeletons.map((skeleton, index) => (
                  <button
                    key={skeleton.id}
                    onClick={() => setSelectedSkeleton(skeleton)}
                    className="brutal-card bg-card p-5 w-full text-left animate-slide-up flex items-center justify-between gap-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary border-2 border-foreground flex items-center justify-center shrink-0">
                        <Layers size={24} />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold mb-1">
                          {skeleton.name}
                        </h3>
                        <p className="text-muted-foreground text-sm font-mono">
                          {skeleton.structure}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="brutal-card bg-muted p-8 text-center max-w-md">
                <p className="font-display text-xl font-bold mb-2">No patterns yet</p>
                <p className="text-muted-foreground">
                  Sentence patterns are being prepared. Check back soon!
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected Pattern Detail */}
            <div className="max-w-2xl space-y-6">
              <div className="brutal-card bg-card p-6 md:p-8 animate-bounce-in">
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                  {selectedSkeleton.name}
                </h2>

                {/* Structure */}
                <div className="mb-6">
                  <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                    Structure
                  </h3>
                  <div className="bg-primary/20 rounded-lg p-4 border-2 border-foreground">
                    <p className="font-mono text-lg font-semibold">
                      {selectedSkeleton.structure}
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                {selectedSkeleton.explanation && (
                  <div className="mb-6">
                    <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                      Explanation
                    </h3>
                    <p className="text-foreground leading-relaxed">
                      {selectedSkeleton.explanation}
                    </p>
                  </div>
                )}

                {/* Example */}
                <div>
                  <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                    Example
                  </h3>
                  <div className="bg-secondary rounded-lg p-4 border-2 border-foreground">
                    <p className="font-display text-xl font-bold mb-1">
                      {selectedSkeleton.example_igbo}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedSkeleton.example_english}
                    </p>
                  </div>
                </div>

                {/* Culture Note */}
                {selectedSkeleton.cultural_note && (
                  <CultureNote note={selectedSkeleton.cultural_note} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
