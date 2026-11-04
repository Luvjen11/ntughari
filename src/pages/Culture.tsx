import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ExternalLink, Film, MapPin, Music, Youtube } from "lucide-react";
import { useCultureItems, type CultureItemWithRegion } from "@/hooks/useCultureItems";
import { MusicExplainer } from "@/components/culture/MusicExplainer";
import {
  CULTURE_TYPES,
  TYPE_LABELS,
  linkHost,
  safeUrl,
  tagLabel,
  youtubeSearchUrl,
  type CultureType,
} from "@/lib/culture";

const TYPE_ICONS: Record<CultureType, typeof Film> = { film: Film, music: Music, other: Film };

function SongList({ artist, songs }: { artist: string; songs: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-display font-semibold hover:text-primary"
      >
        Songs to start with ({songs.length})
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <ol className="space-y-1.5">
            {songs.map((song, i) => (
              <li key={song}>
                <a
                  href={youtubeSearchUrl(artist, song)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-lg border-2 border-foreground bg-background px-3 py-2 hover:bg-muted"
                >
                  <span className="font-display font-bold text-muted-foreground tabular-nums w-4">{i + 1}</span>
                  <span className="flex-1 font-medium">{song}</span>
                  <Youtube size={18} className="shrink-0 text-red-600" aria-hidden />
                  <span className="sr-only">(search on YouTube, opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">Each one opens a YouTube search in a new tab.</p>
        </>
      )}
    </div>
  );
}

function CultureCard({ item }: { item: CultureItemWithRegion }) {
  // Empty until the top_songs migration is applied, so guard against it missing.
  const songs = item.type === "music" ? item.top_songs ?? [] : [];
  const watchUrl = safeUrl(item.where_to_watch_or_listen);
  const sourceUrl = safeUrl(item.source);
  const byline = [item.creator, item.year].filter(Boolean).join(" · ");

  return (
    <article className="brutal-card bg-card p-5 space-y-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.igbo_language && (
            <span className="px-2 py-0.5 rounded-full border-2 border-foreground bg-primary text-xs font-display font-semibold">
              In Igbo
            </span>
          )}
          {item.region_slug && item.dialect_regions && (
            <Link
              to="/dialects"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-2 border-foreground bg-secondary text-xs font-display font-semibold hover:bg-muted"
              title="See this place on the dialect map"
            >
              <MapPin size={12} />
              {item.dialect_regions.name}, {item.dialect_regions.area}
            </Link>
          )}
        </div>
        <h2 className="font-display text-xl font-bold leading-snug">{item.title}</h2>
        {byline && <p className="text-sm text-muted-foreground font-medium">{byline}</p>}
      </div>

      <p>{item.description}</p>

      {songs.length > 0 && <SongList artist={item.title} songs={songs} />}

      {item.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {item.tags.map((tag) => (
            <li key={tag} className="px-2 py-0.5 rounded bg-muted text-xs font-medium">
              {tagLabel(tag)}
            </li>
          ))}
        </ul>
      )}

      {(watchUrl || sourceUrl || (item.source && !sourceUrl)) && (
        <div className="flex flex-wrap items-center gap-3 border-t-2 border-foreground/10 pt-3 text-sm">
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brutal-button bg-primary px-3 py-1.5 inline-flex items-center gap-1.5 font-display font-semibold"
            >
              {item.type === "music" ? "Where to listen" : "Where to watch"}
              <ExternalLink size={14} />
            </a>
          )}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Read more on {linkHost(sourceUrl)}
              <ExternalLink size={12} />
            </a>
          ) : (
            item.source && <span className="text-muted-foreground">Source: {item.source}</span>
          )}
        </div>
      )}
    </article>
  );
}

export default function Culture() {
  const { data: items, isLoading } = useCultureItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const [igboOnly, setIgboOnly] = useState(false);
  const [tag, setTag] = useState<string | null>(null);

  // Only offer the "Other" tab once there is something in it.
  const types = useMemo(
    () => CULTURE_TYPES.filter((t) => t !== "other" || items?.some((i) => i.type === "other")),
    [items]
  );
  const requested = searchParams.get("type") as CultureType | null;
  const type: CultureType = requested && types.includes(requested) ? requested : "film";

  const ofType = useMemo(() => (items ?? []).filter((i) => i.type === type), [items, type]);
  const tags = useMemo(() => [...new Set(ofType.flatMap((i) => i.tags))].sort(), [ofType]);
  const visible = ofType.filter(
    (i) => (!igboOnly || i.igbo_language) && (!tag || i.tags.includes(tag))
  );
  const hasUnreviewed = (items ?? []).some((i) => !i.reviewed);

  const chooseType = (t: CultureType) => {
    setTag(null);
    setSearchParams(t === "film" ? {} : { type: t }, { replace: true });
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full border-2 border-foreground font-display text-sm font-semibold transition-colors ${
      active ? "bg-primary shadow-brutal-sm" : "bg-card hover:bg-muted"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <Link
          to="/culture"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Culture</span>
        </Link>

        <header className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Films &amp; Music</h1>
          <p className="text-muted-foreground max-w-prose">
            Hear Igbo the way people use it: classic Nollywood and new films, highlife greats
            and today's artists. Each entry says whether it is in Igbo and where to read more.
            We link to official or well-known listings and never host the works ourselves.
          </p>
        </header>

        <div className={`grid gap-3 ${types.length > 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`} role="tablist" aria-label="Culture sections">
          {types.map((t) => {
            const Icon = TYPE_ICONS[t];
            const active = t === type;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => chooseType(t)}
                className={`brutal-button p-4 flex items-center gap-3 text-left ${
                  active ? "bg-primary" : "bg-card"
                }`}
              >
                <span className="w-10 h-10 rounded-lg border-2 border-foreground bg-card flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-display font-bold">{TYPE_LABELS[t].label}</span>
                  <span className="block text-sm text-foreground/70">{TYPE_LABELS[t].igbo}</span>
                </span>
              </button>
            );
          })}
        </div>

        {type === "music" && <MusicExplainer />}

        {type === "music" && (
          <h2 className="font-display text-2xl font-bold -mb-4">Igbo artists</h2>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by language">
            <button type="button" onClick={() => setIgboOnly(false)} aria-pressed={!igboOnly} className={chip(!igboOnly)}>
              All languages
            </button>
            <button type="button" onClick={() => setIgboOnly(true)} aria-pressed={igboOnly} className={chip(igboOnly)}>
              In Igbo
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
              <button type="button" onClick={() => setTag(null)} aria-pressed={tag === null} className={chip(tag === null)}>
                Any style
              </button>
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => setTag(t)} aria-pressed={tag === t} className={chip(tag === t)}>
                  {tagLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="brutal-card bg-muted p-8 animate-pulse">
            <p className="font-display font-bold">Loading…</p>
          </div>
        ) : visible.length > 0 ? (
          <div className="space-y-4">
            {visible.map((item) => (
              <CultureCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="brutal-card bg-muted p-8 text-center">
            <p className="font-display text-xl font-bold mb-2">Nothing here yet</p>
            <p className="text-muted-foreground">
              {ofType.length === 0
                ? "Entries are being prepared. Check back soon."
                : "Try a different filter."}
            </p>
          </div>
        )}

        {hasUnreviewed && (
          <p className="text-xs text-muted-foreground">
            Some entries are still being checked. Spotted a mistake?{" "}
            <Link to="/feedback" className="underline underline-offset-2 hover:text-foreground">
              Let us know
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
