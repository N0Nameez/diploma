-- 012_admin_and_reports.sql
-- Migration to support Reporting system, Moderator actions, and Warning logic.

-- 1. Add warnings_count to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;

-- 2. Add moderator feedback to interactions (reports)
ALTER TABLE public.interactions 
ADD COLUMN IF NOT EXISTS moderator_comment TEXT;

-- 3. Create table for warning history
CREATE TABLE IF NOT EXISTS public.user_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    admin_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Automatic ban logic after 3 warnings
CREATE OR REPLACE FUNCTION public.check_user_warnings()
RETURNS TRIGGER AS $$
BEGIN
    -- If user reaches 3 or more warnings, set status to banned
    IF NEW.warnings_count >= 3 THEN
        NEW.status := 'banned';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for automated ban
DROP TRIGGER IF EXISTS trigger_check_warnings ON public.user_profiles;
CREATE TRIGGER trigger_check_warnings
BEFORE UPDATE OF warnings_count ON public.user_profiles
FOR EACH ROW 
WHEN (OLD.warnings_count IS DISTINCT FROM NEW.warnings_count)
EXECUTE FUNCTION public.check_user_warnings();

-- 6. Indices for performance in Admin Panel
CREATE INDEX IF NOT EXISTS idx_interactions_report_status ON public.interactions(report_status) WHERE interaction_type = 'report';
CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON public.user_warnings(user_id);
