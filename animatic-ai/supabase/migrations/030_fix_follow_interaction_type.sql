-- 030_fix_follow_interaction_type.sql
-- Fix interaction_type check constraint to support 'follow'
-- Move follow notifications from subscriptions table to interactions table

-- 1. Update interaction_type constraint
ALTER TABLE public.interactions 
DROP CONSTRAINT IF EXISTS interactions_interaction_type_check;

ALTER TABLE public.interactions 
ADD CONSTRAINT interactions_interaction_type_check 
CHECK (interaction_type IN ('like', 'favorite', 'download', 'report', 'follow'));

-- 2. Update notification triggers
-- The old on_follow_notification was on public.subscriptions which is now used for plans.
-- We move it to public.interactions where user-to-user follows are now stored.

DROP TRIGGER IF EXISTS on_follow_notification ON public.subscriptions;
DROP TRIGGER IF EXISTS on_follow_notification ON public.interactions;

CREATE OR REPLACE FUNCTION public.handle_follow_interaction_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  -- Only handle follows
  IF NEW.interaction_type != 'follow' OR NEW.entity_type != 'user' THEN
    RETURN NEW;
  END IF;

  -- follower = NEW.user_id, author = NEW.entity_id
  SELECT COALESCE(display_name, username) INTO v_follower_name FROM public.user_profiles WHERE id = NEW.user_id;

  PERFORM public.create_notification(
    NEW.entity_id,
    'follower',
    'Новый подписчик!',
    v_follower_name || ' подписался на вас',
    '/profile/' || NEW.user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_interaction_notification
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  WHEN (NEW.interaction_type = 'follow' AND NEW.entity_type = 'user')
  EXECUTE FUNCTION public.handle_follow_interaction_notification();
