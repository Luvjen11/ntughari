import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: "primary" | "secondary";
}

export function ModuleCard({ to, icon: Icon, title, description, color }: ModuleCardProps) {
  return (
    <Link to={to} className="block group">
      <div className={`brutal-card p-6 h-full ${color === "primary" ? "bg-primary" : "bg-secondary"}`}>
        <div className="flex flex-col h-full">
          <div className="mb-4">
            <div className="w-14 h-14 rounded-lg bg-card border-3 border-foreground flex items-center justify-center shadow-brutal-sm group-hover:shadow-brutal transition-shadow">
              <Icon size={28} className="text-foreground" />
            </div>
          </div>
          <h3 className="font-display text-xl font-bold mb-2 text-foreground">{title}</h3>
          <p className="text-foreground/80 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}
