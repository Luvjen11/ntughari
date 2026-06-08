import { Link } from "react-router-dom";

const learnLinks = [
  { to: "/alphabet", label: "Alphabet" },
  { to: "/vocabulary", label: "Vocabulary" },
  { to: "/skeletons", label: "Skeletons" },
  { to: "/phrases", label: "Phrases" },
];

const practiceLinks = [
  { to: "/practice", label: "Practice" },
  { to: "/practice/my-words", label: "My Words" },
  { to: "/practice/conversation", label: "Conversation" },
  { to: "/progress", label: "Progress" },
];

const aboutLinks = [
  { to: "/stories", label: "Stories" },
  { to: "/features", label: "Features" },
  { to: "/help", label: "Help" },
  { to: "/feedback", label: "Feedback" },
];

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="font-display font-bold text-sm mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t-3 border-foreground bg-card mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="font-display text-xl font-bold text-foreground hover:text-primary transition-colors">
              Ntụgharị
            </Link>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              The bridge between understanding and speaking Igbo.
            </p>
          </div>
          <FooterColumn title="Learn" links={learnLinks} />
          <FooterColumn title="Practice" links={practiceLinks} />
          <FooterColumn title="About" links={aboutLinks} />
        </div>

        <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-foreground/15">
          © {new Date().getFullYear()} Ntụgharị · Built for heritage learners and the diaspora
        </p>
      </div>
    </footer>
  );
}
