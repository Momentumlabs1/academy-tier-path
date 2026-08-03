-- 022 — Real profile pictures for members (applied 2026-08-04).
-- The generated initials tile stays as the fallback; this adds an uploaded photo.
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Public bucket: avatars render all over the app, so a plain public URL beats
-- signing every render. Nothing sensitive lives here.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 2097152,
        ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = TRUE, file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif'];

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Write only into your OWN folder, named after your auth uid.
DROP POLICY IF EXISTS avatars_own_insert ON storage.objects;
CREATE POLICY avatars_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_own_update ON storage.objects;
CREATE POLICY avatars_own_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_own_delete ON storage.objects;
CREATE POLICY avatars_own_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
