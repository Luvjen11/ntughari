import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  Brain,
  Heart,
  Languages,
  Library,
  MessageSquare,
  Mic,
  PenLine,
  Puzzle,
  Trophy,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const featureSections = [
  {
    title: "Learn the foundations",
    items: [
      {
        icon: Languages,
        name: "Alphabet & sounds",
        path: "/alphabet",
        description:
          "All 36 Igbo letters with pronunciation tips, examples, and audio. Tap any letter to hear it — Igbo API first, YarnGPT fallback for natural speech.",
      },
      {
        icon: BookOpen,
        name: "Vocabulary by category",
        path: "/vocabulary",
        description:
          "Curated word lists by topic (food, family, greetings, and more). Filter by dialect, hear pronunciation, and save words to My Words with one tap.",
      },
      {
        icon: BookOpen,
        name: "Igbo API dictionary",
        path: "/vocabulary",
        description:
          "Search thousands of community-sourced Igbo words with definitions and audio. Saved dictionary words keep their text offline in My Words.",
      },
    ],
  },
  {
    title: "Understand how Igbo works",
    items: [
      {
        icon: Puzzle,
        name: "Sentence skeletons",
        path: "/skeletons",
        description:
          "See the reusable patterns behind Igbo sentences — subject, verb, object — so you stop memorising phrases and start building your own.",
      },
      {
        icon: MessageSquare,
        name: "Phrase-to-pieces",
        path: "/phrases",
        description:
          "Break familiar phrases into learnable chunks. Rebuild them in the right order and hear each phrase spoken aloud.",
      },
      {
        icon: Library,
        name: "Story layer",
        path: "/stories",
        description:
          "Narrated stories with cultural notes and vocabulary from each scene. English narration uses your browser voice; Igbo uses native TTS.",
      },
    ],
  },
  {
    title: "Practice speaking & recall",
    items: [
      {
        icon: Mic,
        name: "Use This Word",
        path: "/practice/use-this-word",
        description:
          "Daily speaking drill: hear an English prompt, answer out loud in Igbo, and get feedback on word choice, diacritics, and structure. Mic-first — no typing required.",
      },
      {
        icon: Bot,
        name: "Conversation tutor",
        path: "/practice/conversation",
        description:
          "Chat with an Igbo tutor by typing or recording. Replies come in Igbo with English glosses and are spoken back via YarnGPT voices (Chinenye, Idera, and more).",
      },
      {
        icon: Languages,
        name: "English → Igbo",
        path: "/practice/translation",
        description:
          "Translate prompts into Igbo with partial credit for close answers — diacritics and spelling are graded fairly, not all-or-nothing.",
      },
      {
        icon: PenLine,
        name: "Fill the gap",
        path: "/practice/fill-gap",
        description:
          "Complete Igbo sentences by supplying the missing word. Builds recognition and production in context.",
      },
      {
        icon: Puzzle,
        name: "Phrase rebuild",
        path: "/practice/phrase-rebuild",
        description:
          "Drag or tap words into the correct order to form idiomatic Igbo phrases.",
      },
      {
        icon: Heart,
        name: "My Words",
        path: "/practice/my-words",
        description:
          "Your personal word list from vocabulary and the dictionary. Play all, practice from saved words only, or remove words anytime.",
      },
    ],
  },
  {
    title: "Audio & progress",
    items: [
      {
        icon: Volume2,
        name: "Smart pronunciation",
        path: "/vocabulary",
        description:
          "Priority chain: human recordings → Igbo API → YarnGPT TTS. Igbo text never falls back to English robot voice.",
      },
      {
        icon: Trophy,
        name: "Progress tracking",
        path: "/progress",
        description:
          "Signed-in learners see session scores by practice type, saved word counts, and practice streaks. Reset your own progress when you need a fresh start.",
      },
      {
        icon: Brain,
        name: "Practice hub",
        path: "/practice",
        description:
          "One place to choose your mode and source: all vocabulary, My saved words, or a specific category.",
      },
    ],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Features</h1>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          Everything Ntụgharị offers to help you move from understanding Igbo to speaking it with confidence.
        </p>

        <div className="space-y-12">
          {featureSections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl font-bold mb-4 border-b-2 border-foreground/20 pb-2">
                {section.title}
              </h2>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className="brutal-card bg-card p-5 block hover:border-primary transition-colors group"
                    >
                      <div className="flex gap-4">
                        <div className="w-11 h-11 shrink-0 rounded-lg border-2 border-foreground bg-secondary flex items-center justify-center">
                          <item.icon size={22} className="text-foreground" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 brutal-card bg-secondary/40 p-6 text-center">
          <p className="font-display font-semibold mb-4">Ready to start?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="border-2 border-foreground">
              <Link to="/practice">Go to Practice</Link>
            </Button>
            <Button asChild variant="outline" className="border-2">
              <Link to="/help">Help &amp; FAQ</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
