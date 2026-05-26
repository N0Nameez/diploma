-- ============================================
-- MIGRATION 009: Fix Private Access & Buckets
-- ============================================

-- 1. Update RLS policy to allow viewing any approved model by link (including private)
DROP POLICY IF EXISTS "Models viewable based on license" ON public.models;

CREATE POLICY "Models viewable based on license" ON public.models
  FOR SELECT
  USING (
    -- Any approved model is viewable if you have the ID (link)
    -- This includes license='private', which is just hidden from search/catalog
    status = 'approved'
    -- Non-approved models: only author or moderators
    OR (author_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- 2. Ensure storage buckets are public
-- Note: buckets might already exist, so we update them
UPDATE storage.buckets SET public = true WHERE id IN ('models', 'previews', 'generation-inputs');

-- 3. Add public read policies for these buckets if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public access to models'
    ) THEN
        CREATE POLICY "Public access to models" ON storage.objects FOR SELECT USING (bucket_id = 'models');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public access to previews'
    ) THEN
        CREATE POLICY "Public access to previews" ON storage.objects FOR SELECT USING (bucket_id = 'previews');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public access to inputs'
    ) THEN
        CREATE POLICY "Public access to inputs" ON storage.objects FOR SELECT USING (bucket_id = 'generation-inputs');
    END IF;
END $$;
