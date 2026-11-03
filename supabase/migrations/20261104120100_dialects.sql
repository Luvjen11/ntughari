-- Dialect map: places where Igbo (and closely related Igboid languages) are spoken,
-- and how individual words differ there from Standard Igbo (Igbo Izugbe).
CREATE TABLE public.dialect_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  description TEXT,
  -- shown for communities whose relationship to Igbo identity is debated
  community_note TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.dialect_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.dialect_regions(id) ON DELETE CASCADE,
  vocabulary_id UUID REFERENCES public.vocabulary(id) ON DELETE SET NULL,
  english_gloss TEXT NOT NULL,
  standard_igbo TEXT NOT NULL,
  variant TEXT NOT NULL,
  audio_url TEXT,
  notes TEXT,
  contributor TEXT,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX dialect_variants_region_idx ON public.dialect_variants(region_id);
CREATE INDEX dialect_variants_gloss_idx ON public.dialect_variants(english_gloss);

ALTER TABLE public.dialect_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialect_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dialect_regions" ON public.dialect_regions
  FOR SELECT USING (true);
CREATE POLICY "Admins can do everything with dialect_regions" ON public.dialect_regions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read dialect_variants" ON public.dialect_variants
  FOR SELECT USING (true);
CREATE POLICY "Admins can do everything with dialect_variants" ON public.dialect_variants
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Starting map points (approximate town centres). Variants are left for
-- speakers from each place to supply rather than guessed.
INSERT INTO public.dialect_regions (slug, name, area, description, community_note, latitude, longitude, order_index) VALUES
('onitsha', 'Onitsha', 'Anambra', 'Market city on the east bank of the River Niger, home of the Ofala festival of the Obi of Onitsha.', NULL, 6.1457, 6.7886, 10),
('awka', 'Awka', 'Anambra', 'Capital of Anambra State, long known for its blacksmiths.', NULL, 6.2104, 7.0741, 20),
('nnewi', 'Nnewi', 'Anambra', 'Commercial and manufacturing town in southern Anambra.', NULL, 6.0177, 6.9170, 30),
('owerri', 'Owerri', 'Imo', 'Capital of Imo State.', NULL, 5.4836, 7.0333, 40),
('mbaise', 'Mbaise', 'Imo', 'A group of communities in central Imo State.', NULL, 5.4500, 7.2400, 50),
('orlu', 'Orlu', 'Imo', 'Town in northern Imo State.', NULL, 5.7957, 7.0351, 60),
('nsukka', 'Nsukka', 'Enugu', 'Hill-country town in northern Enugu State, home of the University of Nigeria.', NULL, 6.8567, 7.3958, 70),
('udi', 'Udi', 'Enugu', 'Hilly area west of Enugu city, where coal was first found in the region.', NULL, 6.3159, 7.4214, 80),
('enugu', 'Enugu', 'Enugu', 'Capital of Enugu State, nicknamed the Coal City.', NULL, 6.4584, 7.5464, 90),
('ngwa', 'Ngwa', 'Abia', 'Ngwa communities surround the city of Aba in Abia State.', NULL, 5.1500, 7.3500, 100),
('bende', 'Bende', 'Abia', 'Area in northern Abia State with a long history as a trading centre.', NULL, 5.5600, 7.6340, 110),
('ohafia', 'Ohafia', 'Abia', 'Known for the Ohafia war dance and its warrior traditions.', NULL, 5.6145, 7.8336, 120),
('afikpo', 'Afikpo', 'Ebonyi', 'Town in southern Ebonyi State known for its masquerade plays.', NULL, 5.8926, 7.9353, 130),
('izzi', 'Izzi', 'Ebonyi', 'Izzi communities around Abakaliki in Ebonyi State.', NULL, 6.4000, 8.1500, 140),
('ezza', 'Ezza', 'Ebonyi', 'Ezza communities in central Ebonyi State.', NULL, 6.1500, 8.0300, 150),
('ika', 'Ika', 'Delta & Rivers', 'Ika communities around Agbor in Delta State, west of the River Niger.',
 'Ika is closely related to Igbo. Some speakers regard it as a distinct language and identity.', 6.2531, 6.1936, 160),
('enuani', 'Enuani', 'Delta & Rivers', 'Communities around Asaba and Ogwashi-Uku on the western side of the Niger.', NULL, 6.2000, 6.6500, 170),
('ndokwa', 'Ndokwa', 'Delta & Rivers', 'Communities around Kwale in Delta State.',
 'Ukwuani, spoken in Ndokwa, is often classed as its own Igboid language.', 5.7100, 6.4300, 180),
('ikwerre', 'Ikwerre', 'Delta & Rivers', 'Communities around Port Harcourt in Rivers State.',
 'Many Ikwerre people see Ikwerre as a distinct language and identity rather than a dialect of Igbo.', 4.9800, 6.8800, 190),
('ekpeye', 'Ekpeye', 'Delta & Rivers', 'Communities around Ahoada in Rivers State.',
 'Ekpeye is usually classed as a separate Igboid language.', 5.0700, 6.6500, 200);
