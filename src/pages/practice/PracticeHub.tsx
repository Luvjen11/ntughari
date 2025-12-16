import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Languages, PenLine, Puzzle } from "lucide-react";

const practiceTypes = [
  {
    id: "translation",
    title: "English → Igbo",
    description: "Translate English words and phrases into Igbo",
    icon: Languages,
    path: "/practice/translation",
  },
  {
    id: "fill-gap",
    title: "Fill the Gap",
    description: "Complete sentences by filling in the missing Igbo word",
    icon: PenLine,
    path: "/practice/fill-gap",
  },
  {
    id: "phrase-rebuild",
    title: "Phrase Rebuild",
    description: "Arrange words in the correct order to form Igbo phrases",
    icon: Puzzle,
    path: "/practice/phrase-rebuild",
  },
];

export default function PracticeHub() {
  const navigate = useNavigate();

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
          <p className="text-muted-foreground">
            Practice makes progress. Choose a mode and start learning at your own pace.
          </p>
        </div>

        <div className="space-y-4">
          {practiceTypes.map((type) => (
            <Card
              key={type.id}
              className="border-2 border-border hover:border-primary transition-colors cursor-pointer"
              onClick={() => navigate(type.path)}
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

        <p className="text-center text-sm text-muted-foreground mt-8">
          5 questions per session • No timers • Learn at your own pace
        </p>
      </div>
    </div>
  );
}
