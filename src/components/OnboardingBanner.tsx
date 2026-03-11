import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, Brain, X } from "lucide-react";

const ONBOARDING_DISMISSED_KEY = "ntughari-onboarding-dismissed";

interface OnboardingBannerProps {
  introStoryId?: string | null;
}

export function OnboardingBanner({ introStoryId }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="brutal-card bg-secondary/40 border-2 border-primary p-6 mb-8 relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded hover:bg-muted text-muted-foreground"
        aria-label="Dismiss"
      >
        <X size={20} />
      </button>
      <h3 className="font-display text-lg font-bold mb-3">Start here</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Three quick steps to get the most out of Ntụgharị:
      </p>
      <ol className="space-y-2 mb-4">
        <li className="flex items-center gap-2">
          <Play size={18} className="shrink-0 text-primary" />
          <Link to={introStoryId ? `/story/${introStoryId}` : "/stories"} className="font-semibold text-primary hover:underline">
            Listen to the intro story
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <BookOpen size={18} className="shrink-0 text-primary" />
          <Link to="/vocabulary" className="font-semibold text-primary hover:underline">
            Save some words you care about
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <Brain size={18} className="shrink-0 text-primary" />
          <Link to="/practice" className="font-semibold text-primary hover:underline">
            Try a short practice
          </Link>
        </li>
      </ol>
      <Button size="sm" variant="secondary" onClick={handleDismiss} className="border-2 border-foreground">
        Got it
      </Button>
    </div>
  );
}
