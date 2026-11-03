CREATE POLICY "Admins can read recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can replace recordings" ON storage.objects
  FOR UPDATE USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete recordings" ON storage.objects
  FOR DELETE USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'admin'));