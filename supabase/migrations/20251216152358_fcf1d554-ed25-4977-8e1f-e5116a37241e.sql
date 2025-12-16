-- Create story_scenes table for the narrative intro experience
CREATE TABLE public.story_scenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  narration_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  language_code TEXT NOT NULL DEFAULT 'ig',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_scenes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active scenes
CREATE POLICY "Anyone can read story_scenes"
ON public.story_scenes
FOR SELECT
USING (true);

-- Admins can manage story_scenes
CREATE POLICY "Admins can insert story_scenes"
ON public.story_scenes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update story_scenes"
ON public.story_scenes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete story_scenes"
ON public.story_scenes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed the 5 initial scenes
INSERT INTO public.story_scenes (title, narration_text, order_index, language_code, is_active) VALUES
('Words You Know, But Don''t Say', 
'Ada grew up hearing Igbo everywhere.

In the kitchen. On the phone. At family gatherings where laughter moved faster than translation.

She understood almost everything.

And yet, whenever she tried to speak, her throat tightened.

Not because she didn''t know the words.

Because she was afraid of saying them wrong.

Obi noticed this first. He had the same pause, the same hesitation. They joked about it, but neither of them laughed very hard.

"It''s strange," Ada said once.

"How something can feel like home and still make you nervous."

This was where their journey started.

Not from zero. From silence.', 
1, 'ig', true),

('The Language Isn''t Gone', 
'The drum wasn''t magical. Not really.

It was old. Scratched. Heavy in the hands.

Ada found it while helping her grandmother clean out a storage room. When she touched it, memories surfaced instead of sparks.

Songs she half-remembered.

Words she knew the meaning of but never practiced aloud.

Obi tapped the surface lightly. The sound wasn''t dramatic. It was steady. Familiar.

"Languages don''t disappear all at once," Obi said.

"They fade when people stop trusting themselves to use them."

The drum didn''t speak.

But it reminded them of something important.

Igbo wasn''t lost.

It was waiting.', 
2, 'ig', true),

('Fragments Still Count', 
'They didn''t start with full sentences.

They started with fragments.

Single words. Short phrases. Sounds they had heard a thousand times but never owned.

Ada practiced quietly. Alone.

Obi listened to recordings late at night, replaying the same sentence until it felt less foreign in his mouth.

They learned that fluency doesn''t arrive in a dramatic moment.

It builds in small, uncomfortable steps.

Mistakes included.

"Knowing a language isn''t about being perfect," Ada wrote in her notes.

"It''s about showing up anyway."

Each word remembered was a small return.', 
3, 'ig', true),

('Culture Lives Between the Lines', 
'As they learned the language, they noticed something else.

Certain words carried more than meaning.

They carried history. Respect. Humor. Care.

A greeting wasn''t just a greeting.

A proverb wasn''t just advice.

Obi realized that culture lived between the lines of language. In tone. In pauses. In what was implied instead of said.

"You can translate words," he said,

"but you feel culture."

Learning Igbo wasn''t just about speaking.

It was about understanding where the words came from, and why they mattered.', 
4, 'ig', true),

('Speaking Anyway', 
'Ada spoke Igbo out loud for the first time without apologizing.

It wasn''t perfect.

Her accent slipped. She hesitated.

No one laughed.

And even if they had, she realized she would have survived it.

Obi followed soon after. Short sentences. Then longer ones. Still careful, but no longer silent.

They didn''t become fluent overnight.

They became braver.

"The language didn''t need us to be experts," Ada thought.

"It just needed us to stop hiding."

This wasn''t the end of the journey.

It was the moment they stopped standing at the edge.', 
5, 'ig', true);