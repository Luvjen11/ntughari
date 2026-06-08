-- Store display fields for saved Igbo API words so My Words works offline / when refetch fails
ALTER TABLE public.user_saved_api_words
  ADD COLUMN IF NOT EXISTS igbo_word TEXT,
  ADD COLUMN IF NOT EXISTS english_gloss TEXT,
  ADD COLUMN IF NOT EXISTS word_class TEXT,
  ADD COLUMN IF NOT EXISTS pronunciation TEXT;
