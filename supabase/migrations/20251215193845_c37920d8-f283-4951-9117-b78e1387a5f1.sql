-- Create letters table for Igbo alphabet
CREATE TABLE public.letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character TEXT NOT NULL UNIQUE,
  pronunciation_tip TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create letter_examples table
CREATE TABLE public.letter_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_id UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  igbo_word TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vocab_categories table
CREATE TABLE public.vocab_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vocabulary table
CREATE TABLE public.vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.vocab_categories(id) ON DELETE CASCADE,
  igbo_word TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  example_sentence_igbo TEXT,
  example_sentence_english TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sentence_skeletons table
CREATE TABLE public.sentence_skeletons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  structure TEXT NOT NULL,
  explanation TEXT,
  example_igbo TEXT NOT NULL,
  example_english TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create phrases table
CREATE TABLE public.phrases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  igbo_phrase TEXT NOT NULL,
  english_translation TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create phrase_parts table
CREATE TABLE public.phrase_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phrase_id UUID NOT NULL REFERENCES public.phrases(id) ON DELETE CASCADE,
  igbo_word TEXT NOT NULL,
  english_meaning TEXT NOT NULL,
  grammar_note TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables (public read access for learning content)
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentence_skeletons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrase_parts ENABLE ROW LEVEL SECURITY;

-- Create public read policies (no auth needed for learning content)
CREATE POLICY "Anyone can read letters" ON public.letters FOR SELECT USING (true);
CREATE POLICY "Anyone can read letter_examples" ON public.letter_examples FOR SELECT USING (true);
CREATE POLICY "Anyone can read vocab_categories" ON public.vocab_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read vocabulary" ON public.vocabulary FOR SELECT USING (true);
CREATE POLICY "Anyone can read sentence_skeletons" ON public.sentence_skeletons FOR SELECT USING (true);
CREATE POLICY "Anyone can read phrases" ON public.phrases FOR SELECT USING (true);
CREATE POLICY "Anyone can read phrase_parts" ON public.phrase_parts FOR SELECT USING (true);