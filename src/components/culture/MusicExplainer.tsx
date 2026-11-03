import { ExternalLink } from "lucide-react";

// Facts here follow the linked Wikipedia articles; keep them in step if the text changes.
const INSTRUMENTS = [
  { name: "Igba", what: "Drums, the most important instrument. Players tune them and damp the head with one hand to change the tone." },
  { name: "Udu", what: "A pot drum that gives the bass. Adding water changes its pitch." },
  { name: "Ekwe", what: "A slit drum carved from a hollowed log, also used to call meetings or raise an alarm." },
  { name: "Ogene", what: "A gong that supports the drums and keeps time for dancers." },
  { name: "Ọjà", what: "A wind instrument like a flute, with its own style of music, egwu ọjà." },
  { name: "Ichaka", what: "A gourd rattle." },
];

const SOURCES = [
  { label: "Highlife", url: "https://en.wikipedia.org/wiki/Highlife" },
  { label: "Igbo highlife", url: "https://en.wikipedia.org/wiki/Igbo_highlife" },
  { label: "Igbo music", url: "https://en.wikipedia.org/wiki/Igbo_music" },
];

export function MusicExplainer() {
  return (
    <section className="space-y-4" aria-labelledby="about-igbo-music">
      <h2 id="about-igbo-music" className="font-display text-2xl font-bold">
        About Igbo music
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="brutal-card bg-card p-5 space-y-2">
          <h3 className="font-display text-lg font-bold">What is highlife?</h3>
          <p className="text-sm leading-relaxed">
            Highlife began in the coastal towns of what is now Ghana in the late 1800s. Bands
            played local melodies and rhythms on Western instruments, led by horns and guitars
            picked with two fingers. The name came from exclusive clubs whose well-off patrons
            dressed up to dance to it. From the 1930s, Ghanaian workers carried it to Nigeria.
          </p>
        </article>

        <article className="brutal-card bg-card p-5 space-y-2">
          <h3 className="font-display text-lg font-bold">Igbo highlife</h3>
          <p className="text-sm leading-relaxed">
            From the 1950s, Igbo musicians mixed highlife with their own traditional music, and
            in the 1960s it was the most popular sound in Nigeria. It is led by guitar, with
            horns, drums and singing, and the words are mostly in Igbo with some Pidgin. Since
            the 2000s artists like Flavour have blended it with hip hop and dancehall, and
            rappers such as Mr Raw have linked it with Igbo rap.
          </p>
        </article>
      </div>

      <article className="brutal-card bg-card p-5 space-y-3">
        <h3 className="font-display text-lg font-bold">Traditional instruments</h3>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
          {INSTRUMENTS.map((i) => (
            <div key={i.name}>
              <dt className="font-display font-bold inline">{i.name}: </dt>
              <dd className="inline">{i.what}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-relaxed border-t-2 border-foreground/10 pt-3">
          Music goes with almost every part of life: weddings, naming ceremonies, funerals, New
          Year celebrations, festivals, work and lullabies. Folk styles include ekpili,
          ogene, ikorodo, where all the instruments play together under the singers, and
          egwu ọjà.
        </p>
      </article>

      <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <span>Sources:</span>
        {SOURCES.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
          >
            {s.label} (Wikipedia)
            <ExternalLink size={11} />
          </a>
        ))}
      </p>
    </section>
  );
}
