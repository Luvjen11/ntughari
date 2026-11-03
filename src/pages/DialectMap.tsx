import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Info, MapPin, Mic, Volume2 } from "lucide-react";
import { useDialectRegions, useDialectVariants } from "@/hooks/useDialects";
import {
  areaColor,
  summarizeAreas,
  type DialectRegion,
  type DialectVariant,
} from "@/lib/dialects";

const MAP_CENTER: [number, number] = [5.85, 7.2];

/** Pan to the selected place without changing the reader's zoom level. */
function PanTo({ region }: { region: DialectRegion | null }) {
  const map = useMap();
  useEffect(() => {
    if (region) map.panTo([region.latitude, region.longitude], { animate: true });
  }, [map, region]);
  return null;
}

function useRecordingPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);
  return (url: string) => {
    audioRef.current?.pause();
    audioRef.current = new Audio(url);
    void audioRef.current.play().catch(() => undefined);
  };
}

function VariantRow({ variant, onPlay }: { variant: DialectVariant; onPlay: (url: string) => void }) {
  return (
    <li className="p-3 rounded-lg border-2 border-foreground/20 bg-muted space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-display font-semibold">
            {variant.english_gloss}
          </p>
          <p className="font-display text-lg font-bold">{variant.variant}</p>
          <p className="text-sm text-muted-foreground">Standard Igbo: {variant.standard_igbo}</p>
        </div>
        {variant.audio_url ? (
          <button
            type="button"
            onClick={() => onPlay(variant.audio_url!)}
            className="brutal-button bg-primary p-2 shrink-0"
            aria-label={`Hear ${variant.variant}`}
          >
            <Volume2 size={18} />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground shrink-0 pt-1">No recording yet</span>
        )}
      </div>
      {variant.notes && <p className="text-sm">{variant.notes}</p>}
    </li>
  );
}

export default function DialectMap() {
  const { data: regions, isLoading } = useDialectRegions();
  const { data: variants } = useDialectVariants();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gloss, setGloss] = useState("");
  const playRecording = useRecordingPlayer();

  const selected = regions?.find((r) => r.id === selectedId) ?? null;
  const glosses = useMemo(
    () => [...new Set((variants ?? []).map((v) => v.english_gloss))].sort(),
    [variants]
  );
  const areaRows = useMemo(() => summarizeAreas(regions ?? []), [regions]);

  const variantFor = (regionId: string) =>
    gloss ? variants?.find((v) => v.region_id === regionId && v.english_gloss === gloss) : undefined;
  const regionVariants = selected ? (variants ?? []).filter((v) => v.region_id === selected.id) : [];
  const standardForGloss = gloss ? variants?.find((v) => v.english_gloss === gloss)?.standard_igbo : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-display font-semibold">Back to Home</span>
        </Link>

        <header className="space-y-2 max-w-3xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Dialect Map</h1>
          <p className="text-muted-foreground">
            Learners start with Standard Igbo (<span className="font-semibold text-foreground">Igbo Izugbe</span>),
            so they can be understood everywhere. Dialect variants sit beside it, as part of the
            language's richness. Tap a place to read about it and hear how words change there.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="gloss" className="font-display font-semibold text-sm">
                Compare a word:
              </label>
              <select
                id="gloss"
                value={gloss}
                onChange={(e) => setGloss(e.target.value)}
                disabled={glosses.length === 0}
                className="h-10 rounded-lg border-2 border-foreground bg-card px-3 font-medium disabled:opacity-60"
              >
                <option value="">{glosses.length ? "Choose a word or greeting" : "No words collected yet"}</option>
                {glosses.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {standardForGloss && (
                <span className="text-sm text-muted-foreground">
                  Standard: <span className="font-display font-bold text-foreground">{standardForGloss}</span>
                </span>
              )}
            </div>

            <div className="brutal-card overflow-hidden p-0 h-[420px] md:h-[540px] relative z-0">
              {isLoading && (
                <p className="absolute top-3 right-3 z-[1000] px-3 py-1 rounded-full border-2 border-foreground bg-card text-sm font-display font-semibold">
                  Loading places…
                </p>
              )}
                <MapContainer center={MAP_CENTER} zoom={8} minZoom={6} maxZoom={12} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <PanTo region={selected} />
                  {(regions ?? []).map((region) => {
                    const v = variantFor(region.id);
                    const isSelected = region.id === selectedId;
                    return (
                      <CircleMarker
                        key={region.id}
                        center={[region.latitude, region.longitude]}
                        radius={isSelected ? 13 : 9}
                        pathOptions={{
                          color: "#1f2430",
                          weight: isSelected ? 3 : 2,
                          fillColor: areaColor(region.area),
                          fillOpacity: 0.9,
                        }}
                        eventHandlers={{ click: () => setSelectedId(region.id) }}
                      >
                        <Tooltip
                          key={`${region.id}-${gloss}-${v?.variant ?? ""}`}
                          direction="top"
                          offset={[0, -8]}
                          permanent={!!gloss}
                        >
                          {gloss ? (v ? v.variant : "—") : `${region.name} · ${region.area}`}
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Map legend">
              {areaRows.map((row) => (
                <li key={row.area} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full border-2 border-foreground"
                    style={{ background: areaColor(row.area) }}
                    aria-hidden
                  />
                  {row.area}
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-4 min-w-0" aria-live="polite">
            {selected ? (
              <div className="brutal-card bg-card p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide font-display font-semibold text-muted-foreground flex items-center gap-1">
                    <MapPin size={14} /> {selected.area}
                  </p>
                  <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
                  {selected.description && <p>{selected.description}</p>}
                </div>

                {selected.community_note && (
                  <div className="flex gap-2 p-3 rounded-lg border-2 border-secondary bg-secondary/30 text-sm">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p>{selected.community_note}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-display font-bold text-sm uppercase tracking-wide text-muted-foreground">
                    Words from {selected.name}
                  </h3>
                  {regionVariants.length > 0 ? (
                    <ul className="space-y-2">
                      {regionVariants.map((v) => (
                        <VariantRow key={v.id} variant={v} onPlay={playRecording} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No words collected from {selected.name} yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="brutal-card bg-muted p-5 space-y-2">
                <h2 className="font-display text-lg font-bold">Pick a place</h2>
                <p className="text-sm text-muted-foreground">
                  Tap a dot on the map to see where it is, what it's known for, and the words
                  speakers there use.
                </p>
              </div>
            )}

            <div className="brutal-card bg-secondary p-5 space-y-2">
              <h2 className="font-display font-bold flex items-center gap-2">
                <Mic size={18} /> Speak a dialect?
              </h2>
              <p className="text-sm">
                Every word on this map comes from a speaker from that place. If your family is from
                one of these areas, tell us how you say everyday words and greetings.
              </p>
              <Link to="/feedback" className="inline-block font-display font-semibold text-sm underline">
                Share your words
              </Link>
            </div>
          </aside>
        </div>

        <section aria-labelledby="how-dialects" className="space-y-4">
          <h2 id="how-dialects" className="font-display text-2xl font-bold">How dialects are shown</h2>
          <p className="text-muted-foreground max-w-3xl">
            The groupings below are a working starting point, to refine with speakers from each area.
          </p>
          <div className="brutal-card overflow-x-auto p-0">
            <table className="w-full min-w-[520px]">
              <thead className="bg-muted border-b-3 border-foreground">
                <tr>
                  <th className="text-left p-4 font-display">Area</th>
                  <th className="text-left p-4 font-display">Examples of speech communities</th>
                  <th className="text-left p-4 font-display">Shown as</th>
                </tr>
              </thead>
              <tbody>
                {areaRows.map((row) => (
                  <tr key={row.area} className="border-b border-muted last:border-0">
                    <td className="p-4 font-display font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-foreground"
                          style={{ background: areaColor(row.area) }}
                          aria-hidden
                        />
                        {row.area}
                      </span>
                    </td>
                    <td className="p-4">{row.communities.join(", ")}</td>
                    <td className="p-4 text-muted-foreground">
                      {row.hasCommunityNotes ? "Variant + audio, with community notes" : "Variant + audio"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Some communities in Delta and Rivers speak closely related languages and do not all
            identify as Igbo. The map says so plainly rather than drawing one border around everyone.
          </p>
        </section>
      </div>
    </div>
  );
}
