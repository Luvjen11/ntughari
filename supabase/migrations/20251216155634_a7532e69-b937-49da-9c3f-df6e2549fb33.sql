-- Create stories table (parent container for scenes)
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  language_code TEXT NOT NULL DEFAULT 'ig',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- RLS policies for stories
CREATE POLICY "Anyone can read published stories" ON public.stories
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can do everything with stories" ON public.stories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add story_id to story_scenes
ALTER TABLE public.story_scenes 
  ADD COLUMN story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  ADD COLUMN cultural_note TEXT;

-- Create story_scene_vocab linking table
CREATE TABLE public.story_scene_vocab (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scene_id UUID NOT NULL REFERENCES public.story_scenes(id) ON DELETE CASCADE,
  vocab_id UUID NOT NULL REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scene_id, vocab_id)
);

-- Enable RLS on story_scene_vocab
ALTER TABLE public.story_scene_vocab ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_scene_vocab
CREATE POLICY "Anyone can read story_scene_vocab" ON public.story_scene_vocab
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage story_scene_vocab" ON public.story_scene_vocab
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert Story 1: Finding Your Voice
INSERT INTO public.stories (id, title, description, order_index, language_code)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Finding Your Voice',
  'A reflective introduction for heritage learners who understand but hesitate. Move from silence to intention.',
  1,
  'ig'
);

-- Insert Story 2: Speaking Is a Skill
INSERT INTO public.stories (id, title, description, order_index, language_code)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'Speaking Is a Skill',
  'Speaking isn''t about confidence or talent. It''s about repetition, structure, and permission to be imperfect.',
  2,
  'ig'
);

-- Update existing scenes to belong to Story 1
UPDATE public.story_scenes 
SET story_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE story_id IS NULL;

-- Insert Story 2 scenes
INSERT INTO public.story_scenes (title, narration_text, order_index, story_id, cultural_note) VALUES
(
  'You Don''t Suddenly Become a Speaker',
  'Ada waited for the day speaking would feel natural.

It didn''t come.

What did come were repetitions.
Saying the same thing badly, then slightly better.

Obi reframed it for her.

"You don''t become a speaker," he said.
"You mụta. You practice."

Speaking wasn''t confidence.
It was a skill.',
  1,
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'In Igbo culture, learning (mụta) is seen as an ongoing practice, not a destination.'
),
(
  'Asking Is Also Speaking',
  'Ada avoided questions. She didn''t want to interrupt.
Didn''t want to sound wrong.

But in Igbo, asking properly was part of belonging.

"Biko, nye m mmiri," Obi demonstrated.
Please, give me water.

Simple. Clear. Respectful.

Silence, she realized, was the bigger risk.',
  2,
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'Requests in Igbo often begin with "Biko" (please) — it signals respect, not weakness.'
),
(
  'Mistakes Don''t Mean Disrespect',
  'Ada mispronounced a word.

She froze.

Nothing happened.

No correction. No ridicule.

Just continuation.

"Ọ dị mma," Obi said later.
It''s okay.

Mistakes weren''t disrespect.
They were proof of trying.',
  3,
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  '"Ọ dị mma" (it''s okay) is a common reassurance. Mistakes in language are expected, not judged.'
),
(
  'Sentences Are Just Patterns',
  'Obi stopped memorizing phrases.
He started noticing patterns.

"A na m mụta."
I am learning.

Change one word. New meaning.

The language wasn''t chaos.
It was structure.

Ada felt something click.',
  4,
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'Igbo sentence structures follow consistent patterns. Once you see them, building sentences becomes intuitive.'
),
(
  'You Spoke Today. That Counts.',
  'Ada didn''t have a breakthrough.

She spoke once. On purpose.

"Taa, a na m gbalịa," she said.
Today, I am trying.

That was enough.

Progress wasn''t loud.
It was consistent.',
  5,
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'Small, consistent effort matters more than dramatic moments. "Gbalịa" (try) is celebrated.'
);