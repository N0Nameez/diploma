-- Migration 026: Increase storage limits for buckets to support large 3D models and animations
UPDATE storage.buckets
SET file_size_limit = 209715200 -- 200MB
WHERE id IN ('models', 'animations');

UPDATE storage.buckets
SET file_size_limit = 15728640 -- 15MB
WHERE id = 'generation-inputs';

UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10MB
WHERE id IN ('previews', 'avatars', 'covers');
