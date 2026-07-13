CREATE POLICY "marketing-media readable by anyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-media');

CREATE POLICY "marketing-media writable by admins"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "marketing-media updatable by admins"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "marketing-media deletable by admins"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));
