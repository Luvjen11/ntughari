import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Heart, Languages, MessageSquare, PenLine, Puzzle } from "lucide-react";
import { buildPracticeUrl, type PracticeSource } from "@/hooks/usePracticeVocabulary";

const practiceTypes = [
  {
    id: "use-this-word",
    title: "Use This Word",
    description: "Daily speaking drill — write Igbo sentences using words you've learned",
    icon: MessageSquare,
    path: "/practice/use-this-word",
    usesVocabulary: true,
  },
  {
    id: "translation",
    title: "English → Igbo",
    description: "Translate English words and phrases into Igbo",
    icon: Languages,
    path: "/practice/translation",
    usesVocabulary: true,
  },
  {
    id: "fill-gap",
    title: "Fill the Gap",
    description: "Complete sentences by filling in the missing Igbo word",
    icon: PenLine,
    path: "/practice/fill-gap",
    usesVocabulary: true,
  },
  {
    id: "phrase-rebuild",
    title: "Phrase Rebuild",
    description: "Arrange words in the correct order to form Igbo phrases",
    icon: Puzzle,
    path: "/practice/phrase-rebuild",
    usesVocabulary: false,
  },
];

interface VocabCategory {
  id: string;
  name: string;
  icon: string | null;
}

export default function PracticeHub() {
  const navigate = useNavigate();
  const [practiceSource, setPracticeSource] = useState<PracticeSource>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const { data: categories } = useQuery({
    queryKey: ["vocab_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocab_categories")
        .select("id, name, icon")
        .order("order_index");
      if (error) throw error;
      return data as VocabCategory[];
    },
  });

  const handlePracticeClick = (path: string, usesVocabulary: boolean) => {
    if (!usesVocabulary) {
      navigate(path);
      return;
    }
    if (practiceSource === "category" && !selectedCategoryId) return;
    navigate(buildPracticeUrl(path, practiceSource, selectedCategoryId));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Active Recall Trainer</h1>
          <p className="text-muted-foreground mb-4">
            Practice makes progress. Choose a mode and start learning at your own pace.
          </p>
            <p className="text-sm text-muted-foreground mb-2">
              Start with <strong>Use This Word</strong> to practice production, or Translation for word recall.
            </p>
          <p className="text-sm text-muted-foreground mb-2">Practice from:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              variant={practiceSource === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPracticeSource("all")}
              className="border-2 border-foreground"
            >
              All vocabulary
            </Button>
            <Button
              variant={practiceSource === "my-words" ? "default" : "outline"}
              size="sm"
              onClick={() => setPracticeSource("my-words")}
              className="border-2 border-foreground"
            >
              My saved words
            </Button>
            <Button
              variant={practiceSource === "category" ? "default" : "outline"}
              size="sm"
              onClick={() => setPracticeSource("category")}
              className="border-2 border-foreground"
            >
              By category
            </Button>
          </div>
          {practiceSource === "category" && (
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-full max-w-sm border-2">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ""}
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-4 mb-8">
          {practiceTypes.map((type) => (
            <Card
              key={type.id}
              className={`border-2 border-border transition-colors cursor-pointer ${
                type.usesVocabulary && practiceSource === "category" && !selectedCategoryId
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:border-primary"
              }`}
              onClick={() => handlePracticeClick(type.path, type.usesVocabulary ?? false)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <type.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{type.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {type.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card
          className="border-2 border-border hover:border-primary transition-colors cursor-pointer"
          onClick={() => navigate("/practice/my-words")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">My Words</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Review words you've saved, listen to pronunciation, and manage your personal word list.
            </CardDescription>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          5 questions per session • Partial credit for close answers • Learn at your own pace
        </p>
      </div>
    </div>
  );
}
