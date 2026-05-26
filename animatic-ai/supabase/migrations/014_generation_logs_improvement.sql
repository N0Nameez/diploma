-- 014_generation_logs_improvement.sql
-- Add ai_model column to generation_requests to track which model was used
-- This allows better analytics in the admin panel

-- 1. Add ai_model column to generation_requests
ALTER TABLE public.generation_requests 
ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- 2. Update existing records if possible (guess based on style_preset if it contains model name)
UPDATE public.generation_requests
SET ai_model = style_preset
WHERE ai_model IS NULL AND style_preset IN ('Hunyuan3D-1', 'Hunyuan3D-2', 'TRELLIS2');

-- 3. If style_preset was used for actual style (e.g., 'realism'), we can't easily guess, 
-- but we can default to 'Hunyuan3D-1' for older records as it was the default.
UPDATE public.generation_requests
SET ai_model = 'Hunyuan3D-1'
WHERE ai_model IS NULL;

-- 4. Create generation_logs table if it was created manually and not in migrations
CREATE TABLE IF NOT EXISTS public.generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID REFERENCES public.generation_requests(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    duration_ms INTEGER,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_generation_logs_gen_id ON public.generation_logs(generation_id);
CREATE INDEX IF NOT EXISTS idx_gen_req_ai_model ON public.generation_requests(ai_model);
