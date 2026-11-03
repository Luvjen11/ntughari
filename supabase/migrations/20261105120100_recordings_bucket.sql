-- Human voice recordings uploaded by admins (vocabulary, phrases, proverbs).
-- Public to play; only admins may add, replace or remove files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can play recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings');

CREATE POLICY "Admins can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can replace recordings" ON storage.objects
  FOR UPDATE USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete recordings" ON storage.objects
  FOR DELETE USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));
