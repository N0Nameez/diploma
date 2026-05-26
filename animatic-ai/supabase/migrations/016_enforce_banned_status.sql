-- 016_enforce_banned_status.sql
-- Enforce ban restrictions: 
-- 1. Hide banned users and their content from others.
-- 2. Prevent banned users from creating content or interacting.

-- 1. Update user_profiles SELECT policy
-- Banned/Blocked users should only be visible to themselves or admins.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.user_profiles FOR SELECT 
USING (
  (status = 'active') 
  OR auth.uid() = id 
  OR public.has_role('moderator')
);

-- 2. Update models SELECT policy
-- Content from banned users should be hidden from everyone except themselves or moderators.
DROP POLICY IF EXISTS "Published models are viewable by everyone" ON public.models;
CREATE POLICY "Published models are viewable by everyone" 
ON public.models FOR SELECT 
USING (
  (
    status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = models.author_id AND status = 'active'
    )
  )
  OR author_id = auth.uid() 
  OR public.has_role('moderator')
);

-- 3. Update animations SELECT policy
DROP POLICY IF EXISTS "Published animations are viewable by everyone" ON public.animations;
CREATE POLICY "Published animations are viewable by everyone" 
ON public.animations FOR SELECT 
USING (
  (
    status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = animations.author_id AND status = 'active'
    )
  )
  OR author_id = auth.uid() 
  OR public.has_role('moderator')
);

-- 4. Prevent banned users from INSERT/UPDATE on various tables
-- We can add a function to check if the current user is banned.
CREATE OR REPLACE FUNCTION public.is_banned()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND status IN ('blocked', 'banned')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update INSERT policies to check for ban
DROP POLICY IF EXISTS "Authenticated users can insert models" ON public.models;
CREATE POLICY "Authenticated users can insert models" 
ON public.models FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND auth.role() = 'authenticated'
  AND NOT public.is_banned()
);

DROP POLICY IF EXISTS "Authenticated users can insert animations" ON public.animations;
CREATE POLICY "Authenticated users can insert animations" 
ON public.animations FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND auth.role() = 'authenticated'
  AND NOT public.is_banned()
);

DROP POLICY IF EXISTS "Authenticated users can insert own generation requests" ON public.generation_requests;
CREATE POLICY "Authenticated users can insert own generation requests" 
ON public.generation_requests FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND auth.role() = 'authenticated'
  AND NOT public.is_banned()
);

DROP POLICY IF EXISTS "Users can insert own interactions" ON public.interactions;
CREATE POLICY "Users can insert own interactions" 
ON public.interactions FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND auth.role() = 'authenticated'
  AND NOT public.is_banned()
);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments" 
ON public.comments FOR INSERT 
WITH CHECK (
  author_id = auth.uid() 
  AND auth.role() = 'authenticated'
  AND NOT public.is_banned()
);
