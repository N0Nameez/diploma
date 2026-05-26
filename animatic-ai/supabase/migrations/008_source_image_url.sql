-- Add source_image_url to models table
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS source_image_url TEXT;

-- Update get_model RPC if it exists or just use direct SQL in database.py
COMMENT ON COLUMN public.models.source_image_url IS 'The original image used for generation';
