-- User profiles with optional username (required via app settings if missing at signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (
    username IS NULL OR (
      char_length(username) >= 3
      AND char_length(username) <= 24
      AND username ~ '^[a-zA-Z0-9_]+$'
    )
  )
);

CREATE UNIQUE INDEX profiles_username_unique_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create profile row on signup (username from metadata if provided)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_username text;
  cleaned text;
BEGIN
  raw_username := NEW.raw_user_meta_data->>'username';
  cleaned := lower(trim(both from coalesce(raw_username, '')));
  IF cleaned <> '' AND length(cleaned) >= 3 AND cleaned ~ '^[a-z0-9_]+$' THEN
    INSERT INTO public.profiles (id, username) VALUES (NEW.id, cleaned);
  ELSE
    INSERT INTO public.profiles (id, username) VALUES (NEW.id, NULL);
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    INSERT INTO public.profiles (id, username) VALUES (NEW.id, NULL);
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, username)
SELECT id, NULL FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Allow users to permanently delete their own auth account (LESP / GDPR-style erasure)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
