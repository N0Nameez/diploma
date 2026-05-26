-- 013_fix_reporting_constraints.sql
-- Fix entity_type check constraint to support reporting users and comments
-- Fix report_status check constraint to support 'new' status

-- 1. Drop existing constraints
ALTER TABLE public.interactions 
DROP CONSTRAINT IF EXISTS interactions_entity_type_check;

ALTER TABLE public.interactions 
DROP CONSTRAINT IF EXISTS interactions_report_status_check;

-- 2. Re-add constraints with expanded values
ALTER TABLE public.interactions 
ADD CONSTRAINT interactions_entity_type_check 
CHECK (entity_type IN ('model', 'animation', 'user', 'comment'));

ALTER TABLE public.interactions 
ADD CONSTRAINT interactions_report_status_check 
CHECK (report_status IN ('new', 'pending', 'reviewing', 'accepted', 'rejected'));
