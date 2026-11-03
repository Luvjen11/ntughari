-- Proverbs (ilu). Each proverb is stored in two halves so "finish the proverb"
-- practice can show the opening and ask for the ending.
-- New practice mode: Finish the Proverb
ALTER TYPE public.practice_type ADD VALUE IF NOT EXISTS 'finish_proverb';

CREATE TABLE public.proverbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igbo_first TEXT NOT NULL,
  igbo_second TEXT NOT NULL,
  literal_translation TEXT NOT NULL,
  meaning TEXT NOT NULL,
  usage_note TEXT,
  theme TEXT NOT NULL CHECK (theme IN ('patience', 'family', 'community', 'wisdom', 'work')),
  dialect TEXT,
  audio_url TEXT,
  source TEXT,
  -- false until a fluent speaker has checked spelling, tone marks and meaning
  reviewed BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proverbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published proverbs" ON public.proverbs
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can do everything with proverbs" ON public.proverbs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Starter set of widely known proverbs. All unreviewed: confirm wording and
-- tone marks with a fluent speaker before marking reviewed.
INSERT INTO public.proverbs (igbo_first, igbo_second, literal_translation, meaning, usage_note, theme, order_index) VALUES
('Nwayọọ nwayọọ', 'ka a na-aracha ofe dị ọkụ.',
 'Slowly, slowly is how hot soup is licked.',
 'Hard or delicate things are handled bit by bit. Rushing gets you burned.',
 'Said to someone impatient to finish a difficult task.',
 'patience', 10),
('Ụbọchị niile bụ nke onye ohi,', 'otu ụbọchị bụ nke onye nwe ụlọ.',
 'Every day belongs to the thief; one day belongs to the owner of the house.',
 'Wrongdoing may go unpunished for a long time, but its day of reckoning comes.',
 'Used to reassure someone who has been wronged that justice will come.',
 'patience', 20),
('Onye aghala', 'nwanne ya.',
 'Let no one abandon their sibling.',
 'Stand by your family and your people, especially in hard times.',
 'A call to solidarity among relatives and the wider Igbo family.',
 'family', 30),
('Nwanne', 'dị na mba.',
 'A sibling can be found in a foreign land.',
 'Kindness and kinship can come from strangers far from home.',
 'Said when someone abroad receives help from people who are not their relatives.',
 'family', 40),
('Egbe bere, ugo bere;', 'nke sị ibe ya ebela, nku kwaa ya.',
 'Let the kite perch and let the eagle perch; whichever says the other shall not perch, may its wing break.',
 'There is room for everyone to thrive. Live and let live.',
 'Common in prayers, speeches and when settling rivalries.',
 'community', 50),
('Ịgwe', 'bụ ike.',
 'A multitude is strength.',
 'Unity is strength. People achieve together what one person cannot.',
 'Used to rally a family or town to work together. Igwebuike is also a given name.',
 'community', 60),
('Aka nri kwọọ aka ekpe,', 'aka ekpe akwọọ aka nri.',
 'Let the right hand wash the left, and the left hand wash the right.',
 'Mutual help leaves everyone better off.',
 'Said when proposing cooperation or returning a favour.',
 'community', 70),
('Onye wetara ọjị', 'wetara ndụ.',
 'Whoever brings kola nut brings life.',
 'Blessing the one who offers hospitality; kola nut is the sign of welcome.',
 'Spoken when kola nut is presented to guests.',
 'community', 80),
('Onye ajụjụ', 'anaghị efu ụzọ.',
 'A person who asks questions does not lose their way.',
 'Asking is how you learn and find your path.',
 'Encouragement to ask for help or directions without shame.',
 'wisdom', 90),
('Onye kwe,', 'chi ya ekwe.',
 'When a person says yes, their chi says yes too.',
 'Determination opens the way. Your personal spirit (chi) supports what you commit to.',
 'Encouragement before a hard undertaking.',
 'wisdom', 100),
('Agwọ otu onye hụrụ', 'na-aghọ eke.',
 'A snake seen by only one person becomes a python.',
 'A story with a single witness tends to grow in the telling.',
 'Said when someone reports something no one else saw.',
 'wisdom', 110),
('Aka aja aja', 'na-ebute ọnụ mmanụ mmanụ.',
 'Hands covered in soil bring a mouth glistening with oil.',
 'Hard work brings plenty. Effort today feeds you tomorrow.',
 'Encouragement for diligence, especially in farming and trade.',
 'work', 120),
('Nwata kwọọ aka,', 'o soro okenye rie nri.',
 'When a child washes their hands, they eat with elders.',
 'Good conduct and effort earn respect, whatever your age.',
 'Praise for a young person who has proved themselves.',
 'work', 130);
