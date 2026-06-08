import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type FeedbackRow = {
  id: string;
  category: "issue" | "praise" | "feature";
  message: string;
  status: "new" | "reviewed";
  created_at: string;
};

const categoryStyles: Record<FeedbackRow["category"], string> = {
  issue: "bg-destructive/15 text-destructive",
  praise: "bg-primary/15 text-primary",
  feature: "bg-secondary text-foreground",
};

const categoryLabels: Record<FeedbackRow["category"], string> = {
  issue: "Issue",
  praise: "Praise",
  feature: "Feature idea",
};

type Filter = "all" | "new" | "reviewed" | FeedbackRow["category"];

export default function AdminFeedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("new");

  const { data: feedback, isLoading } = useQuery({
    queryKey: ["adminFeedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("id, category, message, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeedbackRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminFeedback"] });
    queryClient.invalidateQueries({ queryKey: ["adminFeedbackCounts"] });
  };

  const markReviewed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_feedback")
        .update({ status: "reviewed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteFeedback = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const filtered = (feedback ?? []).filter((item) => {
    if (filter === "all") return true;
    if (filter === "new" || filter === "reviewed") return item.status === filter;
    return item.category === filter;
  });

  const newCount = feedback?.filter((f) => f.status === "new").length ?? 0;

  const filterButtons: { id: Filter; label: string }[] = [
    { id: "new", label: `New (${newCount})` },
    { id: "all", label: "All" },
    { id: "issue", label: "Issues" },
    { id: "praise", label: "Praise" },
    { id: "feature", label: "Features" },
    { id: "reviewed", label: "Reviewed" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-display font-semibold">Admin</span>
      </Link>

      <h1 className="font-display text-4xl font-bold mb-2">Feedback inbox</h1>
      <p className="text-muted-foreground mb-6">
        Anonymous messages from learners. No usernames or emails are stored with submissions.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((btn) => (
          <Button
            key={btn.id}
            variant={filter === btn.id ? "default" : "outline"}
            size="sm"
            className="border-2 font-display"
            onClick={() => setFilter(btn.id)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="brutal-card bg-card p-8 text-center text-muted-foreground">
          No feedback in this view yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <article key={item.id} className="brutal-card bg-card p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-display font-semibold px-2 py-1 rounded border border-foreground/20 ${categoryStyles[item.category]}`}
                >
                  {categoryLabels[item.category]}
                </span>
                {item.status === "new" && (
                  <span className="text-xs font-semibold text-primary">Unread</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.message}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {item.status === "new" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2"
                    disabled={markReviewed.isPending}
                    onClick={() => markReviewed.mutate(item.id)}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Mark reviewed
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-2 text-destructive">
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-2 border-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the message from the inbox.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteFeedback.mutate(item.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
