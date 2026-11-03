-- Culture: films, music and other works in Igbo or about Igbo life.
-- We only describe and link out to official or well-known listings; no media is
-- hosted or embedded here.
CREATE TABLE public.culture_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('film', 'music', 'other')),
  title TEXT NOT NULL,
  creator TEXT,
  year INTEGER,
  description TEXT NOT NULL,
  -- true when the work is wholly or largely in Igbo
  igbo_language BOOLEAN NOT NULL DEFAULT false,
  where_to_watch_or_listen TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  -- where the work or its creator comes from, when it matches a place on the dialect map
  region_slug TEXT REFERENCES public.dialect_regions(slug) ON UPDATE CASCADE ON DELETE SET NULL,
  source TEXT,
  -- false until someone has checked the facts and wording
  reviewed BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX culture_items_type_idx ON public.culture_items(type);

GRANT SELECT ON public.culture_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.culture_items TO authenticated;
GRANT ALL ON public.culture_items TO service_role;

ALTER TABLE public.culture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published culture_items" ON public.culture_items
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can do everything with culture_items" ON public.culture_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Starter set, each checked against the listed source. All unreviewed: confirm
-- details and wording before marking reviewed. Music rows are artists: the title
-- is the artist or band, and the description names what they are best known for.
INSERT INTO public.culture_items (type, title, creator, year, description, igbo_language, where_to_watch_or_listen, tags, region_slug, source, reviewed, order_index) VALUES
('music', 'Chief Stephen Osita Osadebe', NULL, NULL,
 'Highlife bandleader (1936–2007) from Atani, Anambra State, whose career spanned more than four decades. Best known for "Osondi Owendi" (1984), one of the most popular Nigerian records ever; the title is an Igbo saying, roughly "what one person cherishes, another despises". He sang in Igbo, Pidgin and English.',
 true, NULL, '{highlife,classic}', NULL,
 'https://en.wikipedia.org/wiki/Chief_Stephen_Osita_Osadebe', false, 10),
('music', 'Oliver De Coque', NULL, NULL,
 'Guitarist (Oliver Sunday Akanite, 1947–2008) from Ezinifite in Nnewi South, Anambra State, whose style blended highlife guitar with Igbo ogene rhythms. Hits include "People''s Club of Nigeria" and "Identity" (1981).',
 true, NULL, '{highlife,ogene,classic}', 'nnewi',
 'https://en.wikipedia.org/wiki/Oliver_De_Coque', false, 20),
('music', 'Celestine Ukwu', NULL, NULL,
 'Singer and bandleader (1940–1977), raised in Abor in Udi, Enugu State. He sang slow, reflective highlife in Igbo, often built on proverbs. Albums include True Philosophy (1971) and Ilo Abu Chi (1974) with his Philosophers National.',
 true, NULL, '{highlife,classic}', 'udi',
 'https://en.wikipedia.org/wiki/Celestine_Ukwu', false, 30),
('music', 'Oriental Brothers', NULL, NULL,
 'Igbo highlife band formed in eastern Nigeria in the 1970s, shortly after the civil war, by Dr Sir Warrior, Dan Satch Opara, Kabaka Opara and others. They released dozens of albums.',
 true, NULL, '{highlife,classic}', NULL,
 'https://en.wikipedia.org/wiki/Oriental_Brothers', false, 40),
('music', 'Mike Ejeagha', NULL, NULL,
 'Singer and storyteller (1930–2025) from Imezi Owa in Ezeagu, Enugu State, who set Igbo folk tales to guitar. His 1983 song "Ka Esi Le Onye Isi Oche", with its "Gwo gwo gwo ngwo" chorus about the tortoise and the elephant, went viral in 2024 after a dance challenge started by comedian Brain Jotter.',
 true, NULL, '{folk,storytelling,classic}', NULL,
 'https://en.wikipedia.org/wiki/Mike_Ejeagha', false, 50),
('music', 'Bright Chimezie', NULL, NULL,
 'Singer born in 1960 in Umuahia, Abia State, known for his "Zigima Sound", which mixes Igbo highlife with traditional music and chanted vocals. Songs include "Because of English" (1984) and "Ube Nwanne".',
 true, NULL, '{highlife,zigima}', NULL,
 'https://en.wikipedia.org/wiki/Bright_Chimezie', false, 60),
('music', 'Onyeka Onwenu', NULL, NULL,
 'Singer and actor (1952–2024) from Arondizuogu, Imo State, nicknamed the "Elegant Stallion". Known for "Iyogogo" and the album One Love (1986); she later played Abigail Obiagu in Lionheart.',
 false, NULL, '{pop,gospel}', NULL,
 'https://en.wikipedia.org/wiki/Onyeka_Onwenu', false, 70),
('music', 'Flavour', NULL, NULL,
 'Singer Chinedu Okoli, born in 1983 in Enugu with family roots in Umunze, Anambra State. He sings Igbo highlife fluently in Igbo; albums include Uplifted (2010), with "Nwa Baby (Ashawo Remix)", and Blessed (2012).',
 true, NULL, '{highlife,contemporary}', NULL,
 'https://en.wikipedia.org/wiki/Flavour_(musician)', false, 80),
('music', 'Phyno', NULL, NULL,
 'Rapper Chibuzor Azubuike, born in 1986 and raised in Enugu State, who raps mainly in Igbo with Nigerian Pidgin. His debut album No Guts No Glory (2014) includes "Ghost Mode" with Olamide.',
 true, NULL, '{rap,contemporary}', NULL,
 'https://en.wikipedia.org/wiki/Phyno', false, 90),
('film', 'Living in Bondage', 'Chris Obi Rapu (dir.), Kenneth Nnebue (writer)', 1992,
 'Igbo-language drama about Andy Okeke, a man who sacrifices his wife in pursuit of wealth. Released on video in two parts (1992 and 1993), it is widely credited with launching Nollywood.',
 true, NULL, '{nollywood,drama,classic}', NULL,
 'https://en.wikipedia.org/wiki/Living_in_Bondage', false, 110),
('film', 'Things Fall Apart', 'David Orere (dir.), NTA', 1987,
 'Thirteen-part television adaptation of Chinua Achebe''s novel, shown on the Nigerian Television Authority, with Pete Edochie as Okonkwo. Mainly in English, it portrays Igbo village life at the arrival of colonial rule.',
 false, NULL, '{tv-series,adaptation,classic}', NULL,
 'https://en.wikipedia.org/wiki/Pete_Edochie', false, 120),
('film', 'Onye Ozi (The Messenger)', 'Obi Emelonye', 2013,
 'Comedy set in London and performed in Igbo with English subtitles, starring Okey Bakassi. The director made it in Igbo to help keep the language alive; it won Best Indigenous Film (Igbo) at the Africa Magic Viewers'' Choice Awards.',
 true, NULL, '{comedy,diaspora}', NULL,
 'https://en.wikipedia.org/wiki/Onye_Ozi', false, 130),
('film', 'Half of a Yellow Sun', 'Biyi Bandele', 2013,
 'Adaptation of Chimamanda Ngozi Adichie''s novel, following twin sisters Olanna and Kainene in south-eastern Nigeria before and during the Nigeria–Biafra war (1967–1970). Mainly in English.',
 false, NULL, '{drama,adaptation,history}', NULL,
 'https://en.wikipedia.org/wiki/Half_of_a_Yellow_Sun_(film)', false, 140),
('film', 'Omugwo', 'Kunle Afolayan', 2017,
 'Comedy named after omugwo, the Igbo custom in which a new mother''s mother comes to stay and help care for her and the baby. Stars Patience Ozokwor and Ken Erics.',
 false, NULL, '{comedy,custom}', NULL,
 'https://en.wikipedia.org/wiki/Omugwo_(film)', false, 150),
('film', 'Lionheart', 'Genevieve Nnaji', 2018,
 'Nnaji''s directorial debut and the first Netflix original film from Nigeria: a daughter fights to save her father''s transport company. Mainly in English with some Igbo, starring Pete Edochie, Nkem Owoh and Onyeka Onwenu.',
 false, NULL, '{drama,netflix}', NULL,
 'https://en.wikipedia.org/wiki/Lionheart_(2018_film)', false, 160),
('film', 'Áfàméfùnà: An Nwa Boi Story', 'Kayode Kasum (dir.), Adaora Sandra Anyanwu (writer)', 2023,
 'The first feature film about the Igbo apprenticeship system, largely in Igbo. Stars Stan Nze, Kanayo O. Kanayo and Alexx Ekubo.',
 true, 'https://www.netflix.com/title/81730157', '{drama,apprenticeship,netflix}', NULL,
 'https://en.wikipedia.org/wiki/%C3%81f%C3%A0m%C3%A9f%C3%B9n%C3%A0:_An_Nwa_Boi_Story', false, 170);
