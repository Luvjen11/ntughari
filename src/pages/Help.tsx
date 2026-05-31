import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        <h1 className="font-display text-3xl font-bold mb-6">Help</h1>

        <div className="space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold mb-2">How does My Words work?</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you're on Vocabulary (by category or dictionary) or viewing words from a story, you can tap the heart icon to save a word to My Words. Your saved words live in <Link to="/practice/my-words" className="font-semibold text-primary hover:underline">Practice → My Words</Link>. You can listen to pronunciation, remove words with the heart again, or use "Play all" to hear them in sequence. You can also practice from your saved words in the Practice hub by choosing "My saved words" before starting a session.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">How is progress tracked?</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you're signed in, each practice session (Translation, Fill the Gap, or Phrase Rebuild) is saved. Your <Link to="/progress" className="font-semibold text-primary hover:underline">Progress</Link> page shows your overall score, scores by practice type, and recent sessions. We also show how many words you've saved and, when you've practiced recently, a streak of consecutive days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">Where does the dictionary come from?</h2>
            <p className="text-muted-foreground leading-relaxed">
              The dictionary on the Vocabulary page searches the <strong>Igbo API</strong> (igboapi.com), a community resource with thousands of Igbo words, definitions, and pronunciation. Results are read-only; you can save any word to My Words to practice later. Words you add to categories (via admin) are stored in the app and appear under "By category."
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-2">How do I practice?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Go to <Link to="/practice" className="font-semibold text-primary hover:underline">Practice</Link> and choose a mode. <strong>Use This Word</strong> is the daily speaking drill: you get English prompts and write Igbo sentences using a word you've learned — with feedback on word choice, spelling, diacritics, and structure. Other modes include <strong>English → Igbo</strong>, <strong>Fill the Gap</strong>, and <strong>Phrase Rebuild</strong>. You can practice from all vocabulary, your saved words, or a specific category.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
