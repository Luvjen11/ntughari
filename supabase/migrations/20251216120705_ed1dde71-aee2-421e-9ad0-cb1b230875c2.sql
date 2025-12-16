-- Add cultural_note field to vocabulary table
ALTER TABLE public.vocabulary 
ADD COLUMN cultural_note text;

-- Add cultural_note field to phrases table
ALTER TABLE public.phrases 
ADD COLUMN cultural_note text;

-- Add cultural_note field to sentence_skeletons table
ALTER TABLE public.sentence_skeletons 
ADD COLUMN cultural_note text;