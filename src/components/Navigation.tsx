import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navLinks = [
  { to: "/alphabet", label: "Alphabet" },
  { to: "/vocabulary", label: "Vocabulary" },
  { to: "/skeletons", label: "Skeletons" },
  { to: "/phrases", label: "Phrases" },
];

export function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b-3 border-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="font-display text-2xl font-bold text-foreground hover:text-primary transition-colors"
          >
            Ntụgharị
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 font-display font-semibold text-sm rounded-lg border-2 transition-all
                  ${location.pathname === link.to 
                    ? "bg-primary text-primary-foreground border-foreground shadow-brutal-sm" 
                    : "bg-transparent border-transparent hover:bg-muted hover:border-foreground"
                  }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Auth Button */}
            {!loading && (
              user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="ml-2 border-2 border-foreground font-display font-semibold"
                >
                  <LogOut size={16} className="mr-1" />
                  Sign Out
                </Button>
              ) : (
                <Link to="/auth">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 border-2 border-foreground font-display font-semibold bg-secondary hover:bg-secondary/80"
                  >
                    <User size={16} className="mr-1" />
                    Sign In
                  </Button>
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 border-2 border-foreground rounded-lg bg-card shadow-brutal-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 animate-slide-up">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 font-display font-semibold rounded-lg border-2 transition-all
                    ${location.pathname === link.to 
                      ? "bg-primary text-primary-foreground border-foreground shadow-brutal-sm" 
                      : "bg-card border-foreground hover:bg-muted"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Auth Button */}
              {!loading && (
                user ? (
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-3 font-display font-semibold rounded-lg border-2 border-foreground bg-card hover:bg-muted flex items-center gap-2"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-3 font-display font-semibold rounded-lg border-2 border-foreground bg-secondary hover:bg-secondary/80 flex items-center gap-2"
                  >
                    <User size={18} />
                    Sign In
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
