-- Add cover columns to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS cover_preset text;

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles' 
AND column_name IN ('cover_url', 'cover_preset')
ORDER BY column_name;
