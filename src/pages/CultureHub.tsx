import { BookHeart, Clapperboard, Map as MapIcon, Quote } from "lucide-react";
import { SectionHub } from "@/components/SectionHub";

const cards = [
  {
    to: "/culture/films-music",
    icon: Clapperboard,
    title: "Films & Music",
    description: "Highlife greats, today's artists and Igbo films, with songs to start with",
  },
  {
    to: "/proverbs",
    icon: Quote,
    title: "Proverbs · Ilu",
    description: "What Igbo proverbs say, what they mean, and when people use them",
  },
  {
    to: "/stories",
    icon: BookHeart,
    title: "Stories",
    description: "Short stories about Igbo life and language, one scene at a time",
  },
  {
    to: "/dialects",
    icon: MapIcon,
    title: "Dialect Map",
    description: "Where Igbo is spoken and how words change from place to place",
  },
];

export default function CultureHub() {
  return (
    <SectionHub
      title="Omenala · Culture"
      intro="The Igbo you hear at home and in songs, films and sayings. Explore it here, then bring it into how you speak."
      cards={cards}
    />
  );
}
