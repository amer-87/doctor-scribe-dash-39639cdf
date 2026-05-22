
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachments TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_patients_sent_at ON public.patients(sent_at);

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read attachments" ON storage.objects;
CREATE POLICY "Public read attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
CREATE POLICY "Authenticated upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Authenticated update attachments" ON storage.objects;
CREATE POLICY "Authenticated update attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Authenticated delete attachments" ON storage.objects;
CREATE POLICY "Authenticated delete attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments');
