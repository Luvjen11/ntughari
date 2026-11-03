-- Human voice recordings uploaded by admins (vocabulary, phrases, proverbs).
-- Private: this workspace blocks public buckets. Learners hear recordings
-- through the tts edge function, which reads them with the service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Admins can read recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can replace recordings" ON storage.objects
  FOR UPDATE USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete recordings" ON storage.objects
  FOR DELETE USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));
