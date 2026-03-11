import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSavedWords } from "@/hooks/useSavedWords";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Target, TrendingUp, BookOpen, Heart, Flame } from "lucide-react";

type PracticeType = "translation" | "fill_gap" | "phrase_rebuild";

interface PracticeSession {
  id: string;
  practice_type: PracticeType;
  score: number;
  total_questions: number;
  created_at: string;
}

const practiceTypeLabels: Record<PracticeType, string> = {
  translation: "Translation",
  fill_gap: "Fill the Gap",
  phrase_rebuild: "Phrase Rebuild",
};

const practiceTypeIcons: Record<PracticeType, React.ReactNode> = {
  translation: <BookOpen className="h-5 w-5" />,
  fill_gap: <Target className="h-5 w-5" />,
  phrase_rebuild: <TrendingUp className="h-5 w-5" />,
};

function getEncouragement(percentage: number): string {
  if (percentage >= 80) return "Amazing work! You're making great progress! 🌟";
  if (percentage >= 60) return "Good job! Keep practicing, you're getting there! 💪";
  if (percentage >= 40) return "Nice effort! Every practice session helps you grow. 🌱";
  return "It's okay to make mistakes — that's how we learn! Keep going! 💙";
}

function getStreakDays(sessions: PracticeSession[]): number {
  if (!sessions?.length) return 0;
  const dates = [...new Set(sessions.map((s) => new Date(s.created_at).toDateString()))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const today = new Date().toDateString();
  if (dates[0] !== today) return 0;
  let streak = 0;
  const check = new Date();
  for (const d of dates) {
    if (check.toDateString() !== d) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export default function Progress() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { savedWords, savedApiWordIds } = useSavedWords();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["practice-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PracticeSession[];
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Track Your Progress</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to see your practice history and track your learning journey.
          </p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </div>
    );
  }

  const totalSessions = sessions?.length || 0;
  const totalScore = sessions?.reduce((acc, s) => acc + s.score, 0) || 0;
  const totalQuestions = sessions?.reduce((acc, s) => acc + s.total_questions, 0) || 0;
  const overallPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const wordsSavedCount = savedWords.length + savedApiWordIds.length;
  const streakDays = getStreakDays(sessions ?? []);

  const statsByType = sessions?.reduce((acc, session) => {
    if (!acc[session.practice_type]) {
      acc[session.practice_type] = { sessions: 0, score: 0, total: 0 };
    }
    acc[session.practice_type].sessions++;
    acc[session.practice_type].score += session.score;
    acc[session.practice_type].total += session.total_questions;
    return acc;
  }, {} as Record<PracticeType, { sessions: number; score: number; total: number }>);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Progress</h1>
          <p className="text-muted-foreground">
            Track your learning journey and celebrate your wins!
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-5 w-5" />
              <span>Words you've saved: <strong className="text-foreground">{wordsSavedCount}</strong></span>
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="h-5 w-5 text-primary" />
                <span>You've practiced <strong className="text-foreground">{streakDays}</strong> day{streakDays !== 1 ? "s" : ""} in a row</span>
              </div>
            )}
          </div>
        </div>

        {/* Overall Stats */}
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Trophy className="h-10 w-10 text-primary" />
              <div>
                <p className="text-4xl font-bold">{overallPercentage}%</p>
                <p className="text-muted-foreground">Overall Score</p>
              </div>
            </div>
            <p className="text-lg">{getEncouragement(overallPercentage)}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{totalSessions}</p>
                <p className="text-sm text-muted-foreground">Sessions Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalScore}/{totalQuestions}</p>
                <p className="text-sm text-muted-foreground">Questions Correct</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats by Type */}
        <h2 className="text-xl font-semibold mb-4">By Practice Type</h2>
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {(["translation", "fill_gap", "phrase_rebuild"] as PracticeType[]).map((type) => {
            const stats = statsByType?.[type];
            const percentage = stats && stats.total > 0 
              ? Math.round((stats.score / stats.total) * 100) 
              : 0;
            
            return (
              <Card key={type} className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {practiceTypeIcons[type]}
                    {practiceTypeLabels[type]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats ? (
                    <>
                      <p className="text-3xl font-bold">{percentage}%</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.sessions} sessions • {stats.score}/{stats.total} correct
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No sessions yet</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Sessions */}
        <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading sessions...</p>
        ) : sessions && sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.slice(0, 10).map((session) => (
              <Card key={session.id} className="border-2">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {practiceTypeIcons[session.practice_type]}
                    <div>
                      <p className="font-medium">{practiceTypeLabels[session.practice_type]}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{session.score}/{session.total_questions}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((session.score / session.total_questions) * 100)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No practice sessions yet.</p>
              <Button onClick={() => navigate("/practice")}>Start Practicing</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
