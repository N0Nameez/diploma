-- ============================================
-- MIGRATION 018: Фикс варнингов линтера Supabase
-- ============================================

-- 1. УДАЛЕНИЕ ДУБЛИРУЮЩИХСЯ ИНДЕКСОВ
-- Линтер обнаружил идентичные индексы, созданные в разных миграциях (001 и 002/011/014)

DROP INDEX IF EXISTS public.idx_animations_author_id;      -- Дубликат idx_animations_author
DROP INDEX IF EXISTS public.idx_animations_model_id;       -- Дубликат idx_animations_model
DROP INDEX IF EXISTS public.idx_comments_author_id;        -- Дубликат idx_comments_author
DROP INDEX IF EXISTS public.idx_comments_parent_id;        -- Дубликат idx_comments_parent
DROP INDEX IF EXISTS public.idx_generation_logs_generation_id; -- Дубликат idx_generation_logs_gen_id
DROP INDEX IF EXISTS public.idx_generation_requests_user_id; -- Дубликат idx_generation_requests_user
DROP INDEX IF EXISTS public.idx_interactions_user_id;      -- Дубликат idx_interactions_user
DROP INDEX IF EXISTS public.idx_models_author_id;          -- Дубликат idx_models_author
DROP INDEX IF EXISTS public.idx_notifications_recipient_id; -- Дубликат idx_notifications_recipient
DROP INDEX IF EXISTS public.idx_notifications_recipient_read; -- Дубликат idx_notifications_read
DROP INDEX IF EXISTS public.idx_subscriptions_user_id_fk;   -- Дубликат idx_subscriptions_user_id
DROP INDEX IF EXISTS public.idx_user_warnings_user_id_fk;    -- Дубликат idx_user_warnings_user_id

-- 2. СКРЫТИЕ ТАБЛИЦ ИЗ GRAPHQL (Security discovery fix)
-- Это предотвращает перечисление структуры таблиц через GraphQL API для anon и authenticated ролей.

COMMENT ON TABLE public.animation_tags IS '@graphql({"expose": false})';
COMMENT ON TABLE public.animations IS '@graphql({"expose": false})';
COMMENT ON TABLE public.comments IS '@graphql({"expose": false})';
COMMENT ON TABLE public.contact_requests IS '@graphql({"expose": false})';
COMMENT ON TABLE public.file_formats IS '@graphql({"expose": false})';
COMMENT ON TABLE public.generation_logs IS '@graphql({"expose": false})';
COMMENT ON TABLE public.generation_requests IS '@graphql({"expose": false})';
COMMENT ON TABLE public.interactions IS '@graphql({"expose": false})';
COMMENT ON TABLE public.model_tags IS '@graphql({"expose": false})';
COMMENT ON TABLE public.models IS '@graphql({"expose": false})';
COMMENT ON TABLE public.notifications IS '@graphql({"expose": false})';
COMMENT ON TABLE public.payments IS '@graphql({"expose": false})';
COMMENT ON TABLE public.subscription_plans IS '@graphql({"expose": false})';
COMMENT ON TABLE public.subscriptions IS '@graphql({"expose": false})';
COMMENT ON TABLE public.tags IS '@graphql({"expose": false})';
COMMENT ON TABLE public.user_profiles IS '@graphql({"expose": false})';
COMMENT ON TABLE public.user_warnings IS '@graphql({"expose": false})';

-- 3. ОПТИМИЗАЦИЯ RLS ПОЛИТИК (Performance fix)
-- Заменяем auth.uid() на (select auth.uid()) для предотвращения повторного вычисления для каждой строки.

-- Удаляем конфликтующие или избыточные политики (fix Multiple Permissive Policies)
DROP POLICY IF EXISTS "Published models are viewable by everyone" ON public.models;
DROP POLICY IF EXISTS "Published animations are viewable by everyone" ON public.animations;
DROP POLICY IF EXISTS "Animation tags are viewable by everyone" ON public.animation_tags;
DROP POLICY IF EXISTS "Model tags are viewable by everyone" ON public.model_tags;
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
DROP POLICY IF EXISTS "Interactions are viewable by everyone" ON public.interactions;
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.user_profiles;

-- Пересоздаем политики с оптимизацией и исправлением множественности

-- MODELS
DROP POLICY IF EXISTS "Models viewable based on license" ON public.models;
CREATE POLICY "Models viewable based on license" ON public.models
  FOR SELECT USING (
    (status = 'approved' AND license != 'private')
    OR (author_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can insert own models" ON public.models;
CREATE POLICY "Users can insert own models" ON public.models
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);

DROP POLICY IF EXISTS "Authenticated users can insert models" ON public.models; -- redundant

DROP POLICY IF EXISTS "Authors can update own models" ON public.models;
CREATE POLICY "Authors can update own models" ON public.models
  FOR UPDATE USING (
    author_id = (SELECT auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin'))
  );

DROP POLICY IF EXISTS "Authors can delete own models" ON public.models;
CREATE POLICY "Authors can delete own models" ON public.models
  FOR DELETE USING (
    author_id = (SELECT auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ANIMATIONS
DROP POLICY IF EXISTS "Users can insert own animations" ON public.animations;
CREATE POLICY "Users can insert own animations" ON public.animations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);

DROP POLICY IF EXISTS "Authors can update own animations" ON public.animations;
CREATE POLICY "Authors can update own animations" ON public.animations
  FOR UPDATE USING (
    author_id = (SELECT auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin'))
  );

DROP POLICY IF EXISTS "Authors can delete own animations" ON public.animations;
CREATE POLICY "Authors can delete own animations" ON public.animations
  FOR DELETE USING (
    author_id = (SELECT auth.uid()) 
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- USER_PROFILES
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- COMMENTS
DROP POLICY IF EXISTS "Active comments are viewable by everyone" ON public.comments;
CREATE POLICY "Active comments are viewable by everyone" ON public.comments
  FOR SELECT USING (status = 'active' OR author_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Authors can update own comments" ON public.comments;
CREATE POLICY "Authors can update own comments" ON public.comments
  FOR UPDATE USING (author_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;
CREATE POLICY "Authors can delete own comments" ON public.comments
  FOR DELETE USING (author_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin')));

-- GENERATION_REQUESTS
DROP POLICY IF EXISTS "Users can view own generation requests" ON public.generation_requests;
CREATE POLICY "Users can view own generation requests" ON public.generation_requests
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

DROP POLICY IF EXISTS "Users can insert own generation requests" ON public.generation_requests;
CREATE POLICY "Users can insert own generation requests" ON public.generation_requests
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own generation requests" ON public.generation_requests;
CREATE POLICY "Users can update own generation requests" ON public.generation_requests
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (recipient_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- SUBSCRIPTIONS (Followers/Plans check)
-- В миграции 011 была создана таблица платных подписок (subscriptions) с полем user_id
-- В миграции 001 была создана таблица фолловеров (subscriptions) с subscriber_id и author_id
-- Но миграция 011 делает DROP TABLE IF EXISTS public.subscriptions CASCADE;
-- Значит сейчас там таблица из 011 с user_id.

DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;
CREATE POLICY "Subscriptions are viewable by everyone" ON public.subscriptions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions; 
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- TAGS
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
CREATE POLICY "Tags are viewable by everyone" ON public.tags
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- MODEL_TAGS
DROP POLICY IF EXISTS "Model tags are viewable by everyone" ON public.model_tags;
CREATE POLICY "Model tags are viewable by everyone" ON public.model_tags
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Model authors can manage tags" ON public.model_tags;
CREATE POLICY "Model authors can manage tags" ON public.model_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.models 
      WHERE id = model_tags.model_id 
      AND (author_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
    )
  );

-- ANIMATION_TAGS
DROP POLICY IF EXISTS "Animation tags are viewable by everyone" ON public.animation_tags;
CREATE POLICY "Animation tags are viewable by everyone" ON public.animation_tags
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Animation authors can manage tags" ON public.animation_tags;
CREATE POLICY "Animation authors can manage tags" ON public.animation_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.animations 
      WHERE id = animation_tags.animation_id 
      AND (author_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
    )
  );

-- INTERACTIONS
DROP POLICY IF EXISTS "Interactions are viewable by everyone" ON public.interactions;
CREATE POLICY "Interactions are viewable by everyone" ON public.interactions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can insert own interactions" ON public.interactions;
CREATE POLICY "Users can insert own interactions" ON public.interactions
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own interactions" ON public.interactions;
CREATE POLICY "Users can delete own interactions" ON public.interactions
  FOR DELETE USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- PAYMENTS
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'));

-- GENERATION_LOGS
DROP POLICY IF EXISTS "Users can view own generation logs" ON public.generation_logs;
CREATE POLICY "Users can view own generation logs" ON public.generation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.generation_requests 
      WHERE id = generation_logs.generation_id AND (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'))
    )
  );

-- USER_WARNINGS
DROP POLICY IF EXISTS "Users can view own warnings" ON public.user_warnings;
CREATE POLICY "Users can view own warnings" ON public.user_warnings
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin')));

DROP POLICY IF EXISTS "Admins and moderators can manage warnings" ON public.user_warnings;
CREATE POLICY "Admins and moderators can manage warnings" ON public.user_warnings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderator', 'admin')));

-- 4. SECURITY DEFINER FUNCTIONS (Security fix)
-- Ограничиваем доступ к функциям SECURITY DEFINER и добавляем внутренние проверки.

-- Исправляем create_model_record: добавляем проверку p_author_id
CREATE OR REPLACE FUNCTION public.create_model_record(
  p_author_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_category TEXT DEFAULT 'Персонажи',
  p_format TEXT DEFAULT 'GLB',
  p_file_url TEXT DEFAULT NULL,
  p_preview_url TEXT DEFAULT NULL,
  p_ai_generated BOOLEAN DEFAULT TRUE,
  p_status TEXT DEFAULT 'approved',
  p_license TEXT DEFAULT 'view_only'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- ВАЖНО: Проверка, что пользователь создает запись для себя (если не админ)
  IF p_author_id != (SELECT auth.uid()) AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission denied: Cannot create record for another user';
  END IF;

  INSERT INTO public.models (
    author_id, name, description, category, format,
    file_url, preview_url, source, ai_generated,
    status, license
  )
  VALUES (
    p_author_id, p_name, p_description, p_category, p_format,
    p_file_url, p_preview_url,
    CASE WHEN p_ai_generated THEN 'ai_generated' ELSE 'user_upload' END,
    p_ai_generated, p_status, p_license
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Явно отзываем права у PUBLIC и разрешаем только authenticated
REVOKE EXECUTE ON FUNCTION public.create_model_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_model_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_model_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_model_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO service_role;

-- toggle_model_like: уже использует auth.uid() внутри, но ограничим EXECUTE
REVOKE EXECUTE ON FUNCTION public.toggle_model_like(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_model_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_model_like(UUID) TO service_role;

-- record_model_download: уже использует auth.uid() внутри
REVOKE EXECUTE ON FUNCTION public.record_model_download(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_model_download(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_model_download(UUID) TO service_role;

-- update_model_license: уже имеет проверку автора внутри
REVOKE EXECUTE ON FUNCTION public.update_model_license(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_model_license(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_model_license(UUID, TEXT) TO service_role;
