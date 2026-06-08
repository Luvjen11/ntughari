import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSavedWords } from "@/hooks/useSavedWords";
import { displayUsername } from "@/lib/username";
import { ArrowLeft, BookMarked, Heart, Loader2, Mail, Settings, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading, ensureProfile, needsUsername } = useProfile();
  const { savedWords, savedApiWordIds } = useSavedWords();

  useEffect(() => {
    if (user && !isLoading && profile === null && !ensureProfile.isPending) {
      ensureProfile.mutate();
    }
  }, [user, isLoading, profile, ensureProfile.isPending]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const name = displayUsername(profile?.username ?? null, user.email);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        <h1 className="font-display text-3xl font-bold mb-6">Profile</h1>

        <div className="brutal-card bg-card p-6 space-y-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Display name</p>
            <p className="font-display text-2xl font-bold">{name}</p>
            {profile?.username && (
              <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail size={18} />
            <span className="text-sm">{user.email}</span>
          </div>
          <Link
            to="/practice/my-words"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart size={18} />
            <span className="text-sm">
              {savedWords.length + savedApiWordIds.length} saved word
              {savedWords.length + savedApiWordIds.length === 1 ? "" : "s"}
              <span className="ml-1 underline-offset-2 hover:underline">· My Words</span>
            </span>
          </Link>
        </div>

        {needsUsername && (
          <div className="brutal-card bg-secondary/30 border-2 border-foreground p-4 mb-6">
            <p className="text-sm mb-3">
              Choose a username so your account feels like yours across Ntụgharị.
            </p>
            <Button asChild className="border-2 border-foreground">
              <Link to="/settings">Add username</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild variant="outline" className="border-2">
            <Link to="/practice/my-words">
              <BookMarked className="mr-2 h-4 w-4" />
              My Words
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-2">
            <Link to="/progress">
              <Trophy className="mr-2 h-4 w-4" />
              Progress
            </Link>
          </Button>
          <Button asChild className="border-2 border-foreground">
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
