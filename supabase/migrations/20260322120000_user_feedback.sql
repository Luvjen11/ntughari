CREATE TYPE public.feedback_category AS ENUM ('issue', 'praise', 'feature');

CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.feedback_category NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_feedback_message_length CHECK (
    char_length(trim(message)) >= 10 AND char_length(message) <= 2000
  )
);

CREATE TABLE public.feedback_rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_rate_limit_key_time
  ON public.feedback_rate_limit_events (rate_key, created_at DESC);

CREATE INDEX idx_user_feedback_created_at
  ON public.user_feedback (created_at DESC);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view feedback"
ON public.user_feedback FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback"
ON public.user_feedback FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete feedback"
ON public.user_feedback FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.submit_anonymous_feedback(
  p_category public.feedback_category,
  p_message TEXT,
  p_client_token UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_key TEXT;
  v_hour_count INT;
  v_day_count INT;
  v_trimmed TEXT;
BEGIN
  v_trimmed := trim(p_message);

  IF char_length(v_trimmed) < 10 THEN
    RAISE EXCEPTION 'Message must be at least 10 characters';
  END IF;

  IF char_length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Message must be at most 2000 characters';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    v_rate_key := md5(auth.uid()::text || ':ntughari_feedback');
  ELSIF p_client_token IS NOT NULL THEN
    v_rate_key := md5(p_client_token::text || ':ntughari_feedback');
  ELSE
    RAISE EXCEPTION 'A client token is required when not signed in';
  END IF;

  SELECT count(*)::INT INTO v_hour_count
  FROM public.feedback_rate_limit_events
  WHERE rate_key = v_rate_key
    AND created_at > now() - interval '1 hour';

  IF v_hour_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded. You can send up to 3 messages per hour.';
  END IF;

  SELECT count(*)::INT INTO v_day_count
  FROM public.feedback_rate_limit_events
  WHERE rate_key = v_rate_key
    AND created_at > now() - interval '24 hours';

  IF v_day_count >= 10 THEN
    RAISE EXCEPTION 'Daily limit reached. You can send up to 10 messages per day.';
  END IF;

  INSERT INTO public.feedback_rate_limit_events (rate_key) VALUES (v_rate_key);
  INSERT INTO public.user_feedback (category, message) VALUES (p_category, v_trimmed);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_anonymous_feedback(public.feedback_category, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_anonymous_feedback(public.feedback_category, TEXT, UUID) TO anon, authenticated;
