-- Table for saving Igbo API words (not in vocabulary table) to My Words
CREATE TABLE public.user_saved_api_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  igbo_api_word_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, igbo_api_word_id)
);

-- Enable RLS
ALTER TABLE public.user_saved_api_words ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see/insert/delete their own rows
CREATE POLICY "Users can view their own saved API words"
ON public.user_saved_api_words FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save API words"
ON public.user_saved_api_words FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved API words"
ON public.user_saved_api_words FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
