import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getFeedbackClientToken } from "@/lib/feedbackClient";

export type FeedbackCategory = "issue" | "praise" | "feature";

export function useSubmitFeedback() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      category,
      message,
    }: {
      category: FeedbackCategory;
      message: string;
    }) => {
      const { error } = await supabase.rpc("submit_anonymous_feedback", {
        p_category: category,
        p_message: message,
        p_client_token: user ? null : getFeedbackClientToken(),
      });
      if (error) throw error;
    },
  });
}
