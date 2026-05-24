-- Migration 027: Create missing storage buckets (models, previews, generation-inputs, animations) and configure them.
-- RLS policies for storage.objects on these buckets are already defined in 002_rls_policies.sql,
-- but the buckets themselves were never inserted into storage.buckets in previous migrations.

-- 1. Insert buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('models', 'models', true),
  ('previews', 'previews', true),
  ('generation-inputs', 'generation-inputs', true),
  ('animations', 'animations', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configure public flag and file size limits
-- Models: 200MB
UPDATE storage.buckets
SET public = true, file_size_limit = 209715200
WHERE id = 'models';

-- Animations: 200MB
UPDATE storage.buckets
SET public = true, file_size_limit = 209715200
WHERE id = 'animations';

-- Previews: 10MB
UPDATE storage.buckets
SET public = true, file_size_limit = 10485760
WHERE id = 'previews';

-- Generation Inputs: 15MB
UPDATE storage.buckets
SET public = true, file_size_limit = 15728640
WHERE id = 'generation-inputs';

-- 3. Seed default mannequin model if it doesn't exist
INSERT INTO public.models (
    id, author_id, name, description, category, format, file_url, preview_url, status, rig_status, ai_generated, license, vertices_count, faces_count
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    null,
    'Стандартный манекен',
    'Базовая трехмерная модель humanoid-манекена для тестирования и примерки анимаций.',
    'Персонажи',
    'GLB',
    '/models/mannequin.glb',
    '/models/mannequin.png',
    'approved',
    'rigged',
    false,
    'free_use',
    69695,
    91832
) ON CONFLICT (id) DO UPDATE
SET vertices_count = EXCLUDED.vertices_count,
    faces_count = EXCLUDED.faces_count,
    category = EXCLUDED.category;

