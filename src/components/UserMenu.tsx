import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, Trophy, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { displayUsername } from "@/lib/username";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  if (loading) return null;

  if (!user) {
    return (
      <Link to="/auth">
        <Button
          variant="outline"
          size="sm"
          className="border-2 border-foreground font-display font-semibold bg-secondary hover:bg-secondary/80"
        >
          <User size={16} className="mr-1" />
          Sign In
        </Button>
      </Link>
    );
  }

  const label = displayUsername(profile?.username, user.email);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-2 border-foreground font-display font-semibold gap-1 max-w-[160px]"
        >
          <User size={16} className="shrink-0" />
          <span className="truncate">{profileLoading ? "…" : label}</span>
          <ChevronDown size={14} className="shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 border-2 border-foreground">
        <DropdownMenuLabel className="font-display">
          {profile?.username ? `@${profile.username}` : "Set a username"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer font-medium">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/progress" className="cursor-pointer font-medium">
            <Trophy className="mr-2 h-4 w-4" />
            Progress
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer font-medium">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleSignOut()} className="cursor-pointer font-medium">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
