-- Function to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created_add_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Create practice_type enum
CREATE TYPE public.practice_type AS ENUM ('translation', 'fill_gap', 'phrase_rebuild');

-- Create practice_sessions table
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_type practice_type NOT NULL,
  items_practiced JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for practice_sessions
CREATE POLICY "Users can view their own practice sessions"
ON public.practice_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
ON public.practice_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
ON public.practice_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions"
ON public.practice_sessions
FOR DELETE
USING (auth.uid() = user_id);