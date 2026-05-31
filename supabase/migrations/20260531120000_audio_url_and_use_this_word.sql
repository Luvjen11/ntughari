-- Human-recorded pronunciation URLs (Supabase Storage or external CDN)
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.phrases ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.letter_examples ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- New practice mode: Use This Word / Daily Speaking Drill
ALTER TYPE public.practice_type ADD VALUE IF NOT EXISTS 'use_this_word';
