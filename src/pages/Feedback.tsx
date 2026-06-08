import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MessageSquareHeart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSubmitFeedback, type FeedbackCategory } from "@/hooks/useSubmitFeedback";

const categoryOptions: { value: FeedbackCategory; label: string; hint: string }[] = [
  { value: "issue", label: "Report an issue", hint: "Bugs, broken flows, or confusing UX" },
  { value: "praise", label: "Share something positive", hint: "What is working well for you?" },
  { value: "feature", label: "Suggest a feature", hint: "Ideas you would love to see in Ntụgharị" },
];

export default function Feedback() {
  const { toast } = useToast();
  const submitFeedback = useSubmitFeedback();
  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [message, setMessage] = useState("");

  const trimmedLength = message.trim().length;
  const canSubmit = trimmedLength >= 10 && trimmedLength <= 2000 && !submitFeedback.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await submitFeedback.mutateAsync({ category, message });
      setMessage("");
      toast({
        title: "Thank you!",
        description: "Your anonymous feedback was sent to the Ntụgharị team.",
      });
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "Please try again in a little while.";
      toast({
        title: "Could not send feedback",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-lg border-2 border-foreground bg-secondary flex items-center justify-center">
            <MessageSquareHeart size={22} />
          </div>
          <h1 className="font-display text-3xl font-bold">Feedback</h1>
        </div>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          Share bugs, wins, or feature ideas. Submissions are{" "}
          <strong className="text-foreground">anonymous</strong> — we do not attach your name or
          email to what you write. Only admins can read messages.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="brutal-card bg-card p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="category">What kind of feedback?</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
              <SelectTrigger id="category" className="border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {categoryOptions.find((opt) => opt.value === category)?.hint}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened, what you loved, or what you wish existed…"
              className="min-h-[160px] border-2 resize-y"
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>At least 10 characters</span>
              <span>{trimmedLength}/2000</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border-2 border-foreground/20 bg-muted/40 p-3 text-sm text-muted-foreground">
            <Shield size={16} className="shrink-0 mt-0.5" />
            <p>
              Rate limits apply: up to 3 messages per hour and 10 per day, to keep spam out while
              staying anonymous.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full border-2 border-foreground font-display font-semibold"
          >
            {submitFeedback.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send anonymously"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
