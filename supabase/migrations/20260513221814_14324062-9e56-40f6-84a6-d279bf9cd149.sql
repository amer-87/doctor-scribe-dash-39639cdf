
-- Extend doctor_settings with theme + logo + rx prefix
ALTER TABLE public.doctor_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS rx_prefix TEXT NOT NULL DEFAULT 'Rx',
  ADD COLUMN IF NOT EXISTS theme_header TEXT NOT NULL DEFAULT '#0ea5e9',
  ADD COLUMN IF NOT EXISTS theme_accent TEXT NOT NULL DEFAULT '#0369a1',
  ADD COLUMN IF NOT EXISTS theme_bg TEXT NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS theme_text TEXT NOT NULL DEFAULT '#0f172a';

-- Enable realtime on profiles
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
END $$;

-- Logos public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: doctors manage own folder, public can read
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
CREATE POLICY "Public read logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Doctor uploads own logo" ON storage.objects;
CREATE POLICY "Doctor uploads own logo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Doctor updates own logo" ON storage.objects;
CREATE POLICY "Doctor updates own logo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Doctor deletes own logo" ON storage.objects;
CREATE POLICY "Doctor deletes own logo" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
