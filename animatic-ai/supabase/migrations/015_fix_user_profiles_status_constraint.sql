-- 015_fix_user_profiles_status_constraint.sql
-- Fix user_profiles_status_check constraint to include 'banned'

ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_status_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_status_check 
CHECK (status IN ('active', 'blocked', 'deleted', 'banned'));
