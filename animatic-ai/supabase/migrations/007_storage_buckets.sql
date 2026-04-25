-- Create storage buckets for avatars and covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
CREATE POLICY "Public access to avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to covers
CREATE POLICY "Public access to covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

-- Allow authenticated users to upload covers
CREATE POLICY "Users can upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own cover
CREATE POLICY "Users can update their own cover"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
