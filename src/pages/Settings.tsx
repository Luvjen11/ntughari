import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { validateUsername } from "@/lib/username";
import { ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Settings() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, isLoading, updateUsername } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSaveUsername = async () => {
    const err = validateUsername(username);
    if (err) {
      setUsernameError(err);
      return;
    }
    setUsernameError(null);
    setSaving(true);
    try {
      await updateUsername.mutateAsync(username);
      toast({ title: "Username saved", description: `@${username.trim().toLowerCase()} is now yours.` });
      setUsername("");
    } catch (e) {
      toast({
        title: "Couldn't save username",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [sessions, progress, saved, savedApi] = await Promise.all([
        supabase.from("practice_sessions").select("*").eq("user_id", user.id),
        supabase.from("user_progress").select("*").eq("user_id", user.id),
        supabase.from("user_saved_words").select("*").eq("user_id", user.id),
        supabase.from("user_saved_api_words").select("*").eq("user_id", user.id),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        email: user.email,
        username: profile?.username,
        practice_sessions: sessions.data ?? [],
        user_progress: progress.data ?? [],
        user_saved_words: saved.data ?? [],
        user_saved_api_words: savedApi.data ?? [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ntughari-data-${user.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleResetLearningData = async () => {
    if (!user) return;
    setResetting(true);
    try {
      await Promise.all([
        supabase.from("practice_sessions").delete().eq("user_id", user.id),
        supabase.from("user_progress").delete().eq("user_id", user.id),
        supabase.from("user_saved_words").delete().eq("user_id", user.id),
        supabase.from("user_saved_api_words").delete().eq("user_id", user.id),
      ]);
      toast({ title: "Learning data cleared", description: "Your account is still active." });
    } catch {
      toast({ title: "Reset failed", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
      await signOut();
      toast({ title: "Account deleted" });
      navigate("/");
    } catch (e) {
      toast({
        title: "Couldn't delete account",
        description: e instanceof Error ? e.message : "Contact support if this persists.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteConfirm("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Profile</span>
        </Link>

        <h1 className="font-display text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Manage your username and your data.
        </p>

        <section className="brutal-card bg-card p-6 mb-6 space-y-4">
          <h2 className="font-display text-lg font-bold">Username</h2>
          {profile?.username ? (
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-semibold text-foreground">@{profile.username}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">You haven&apos;t chosen a username yet.</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">{profile?.username ? "Change username" : "Choose username"}</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError(null);
              }}
              placeholder="ada_learner"
              className="border-2"
              autoComplete="username"
            />
            {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
            <p className="text-xs text-muted-foreground">3–24 characters: letters, numbers, underscores.</p>
          </div>
          <Button
            onClick={() => void handleSaveUsername()}
            disabled={saving || !username.trim()}
            className="border-2 border-foreground"
          >
            {saving ? "Saving…" : "Save username"}
          </Button>
        </section>

        <section className="brutal-card bg-card p-6 mb-6 space-y-3">
          <h2 className="font-display text-lg font-bold">Your data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Download a copy of your practice sessions, progress, and saved words. You can clear learning data
            without deleting your account, or permanently delete your account and all associated data.
          </p>
          <Button
            variant="outline"
            className="border-2 w-full sm:w-auto"
            onClick={() => void handleExportData()}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Preparing…" : "Export my data (JSON)"}
          </Button>
        </section>

        <section className="brutal-card bg-card p-6 mb-6 space-y-3">
          <h2 className="font-display text-lg font-bold text-destructive">Danger zone</h2>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-2 w-full" disabled={resetting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset learning data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-2 border-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset learning data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your practice sessions, module progress, and saved words. Your account and
                  username stay intact.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleResetLearningData()}>
                  Reset data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Delete account permanently
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-2 border-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your account, profile, progress, and saved words. Type{" "}
                  <strong>DELETE</strong> to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="border-2"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  onClick={() => void handleDeleteAccount()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting…" : "Delete forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}
