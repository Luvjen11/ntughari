import { Link } from "react-router-dom";
import { BookOpen, Languages, Layers, Mic, Puzzle } from "lucide-react";
import { SectionHub } from "@/components/SectionHub";

const cards = [
  {
    to: "/alphabet",
    icon: Languages,
    title: "Alphabet & Sounds",
    description: "The 36 Igbo letters and how each one sounds",
  },
  {
    to: "/vocabulary",
    icon: BookOpen,
    title: "Vocabulary",
    description: "Everyday words by topic, with audio",
  },
  {
    to: "/phrases",
    icon: Puzzle,
    title: "Phrase-to-Pieces",
    description: "Break familiar phrases into the words they're made of",
  },
  {
    to: "/skeletons",
    icon: Layers,
    title: "Sentence Skeletons",
    description: "The patterns Igbo sentences are built on",
  },
];

export default function Basics() {
  return (
    <SectionHub
      title="Basics"
      intro="New to Igbo, or want to fill a few gaps? Start with the sounds, everyday words and how sentences fit together."
      cards={cards}
      footer={
        <Link to="/practice" className="brutal-card bg-card p-4 flex items-center gap-3 hover:border-primary">
          <span className="w-10 h-10 rounded-lg border-2 border-foreground bg-primary flex items-center justify-center shrink-0">
            <Mic size={20} />
          </span>
          <span>
            <span className="block font-display font-bold">Already understand Igbo?</span>
            <span className="block text-sm text-muted-foreground">Go to Speak and practise saying it out loud.</span>
          </span>
        </Link>
      }
    />
  );
}
