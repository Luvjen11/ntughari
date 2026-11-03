import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ModuleCard } from "@/components/ModuleCard";

export interface HubCard {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

interface SectionHubProps {
  title: string;
  intro: string;
  cards: HubCard[];
  /** Shown under the cards, e.g. a pointer to another section. */
  footer?: ReactNode;
}

/** A top-level nav section: a short intro and one card per page in it. */
export function SectionHub({ title, intro, cards, footer }: SectionHubProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold">{title}</h1>
          <p className="text-muted-foreground max-w-prose">{intro}</p>
        </header>
        <div className="grid gap-6 sm:grid-cols-2">
          {cards.map((card, i) => (
            <ModuleCard key={card.to} {...card} color={i % 2 ? "secondary" : "primary"} />
          ))}
        </div>
        {footer}
      </div>
    </div>
  );
}
