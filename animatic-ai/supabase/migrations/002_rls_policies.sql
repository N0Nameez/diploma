-- ============================================
-- ОЧИСТКА СУЩЕСТВУЮЩИХ POLICIES (ТОЛЬКО PUBLIC SCHEMA)
-- ============================================

-- Функция для безопасного удаления policy
CREATE OR REPLACE FUNCTION drop_policy_if_exists(policy_name TEXT, schema_name TEXT, table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_name, schema_name, table_name);
EXCEPTION WHEN OTHERS THEN
  -- Игнорируем ошибки (например, если policy не существует или нет прав)
  NULL;
END;
$$ LANGUAGE plpgsql;

-- User Profiles (public schema)
SELECT drop_policy_if_exists('Profiles are viewable by everyone', 'public', 'user_profiles');
SELECT drop_policy_if_exists('Users can insert own profile', 'public', 'user_profiles');
SELECT drop_policy_if_exists('Users can update own profile', 'public', 'user_profiles');
SELECT drop_policy_if_exists('Admins can delete profiles', 'public', 'user_profiles');

-- Models (public schema)
SELECT drop_policy_if_exists('Published models are viewable by everyone', 'public', 'models');
SELECT drop_policy_if_exists('Authenticated users can insert models', 'public', 'models');
SELECT drop_policy_if_exists('Authors can update own models', 'public', 'models');
SELECT drop_policy_if_exists('Authors can delete own models', 'public', 'models');

-- Animations (public schema)
SELECT drop_policy_if_exists('Published animations are viewable by everyone', 'public', 'animations');
SELECT drop_policy_if_exists('Authenticated users can insert animations', 'public', 'animations');
SELECT drop_policy_if_exists('Authors can update own animations', 'public', 'animations');
SELECT drop_policy_if_exists('Authors can delete own animations', 'public', 'animations');

-- Generation Requests (public schema)
SELECT drop_policy_if_exists('Users can view own generation requests', 'public', 'generation_requests');
SELECT drop_policy_if_exists('Authenticated users can insert own generation requests', 'public', 'generation_requests');
SELECT drop_policy_if_exists('Users can update own generation requests', 'public', 'generation_requests');
SELECT drop_policy_if_exists('Admins can delete generation requests', 'public', 'generation_requests');

-- Tags (public schema)
SELECT drop_policy_if_exists('Tags are viewable by everyone', 'public', 'tags');
SELECT drop_policy_if_exists('Admins can manage tags', 'public', 'tags');

-- Model Tags (public schema)
SELECT drop_policy_if_exists('Model tags are viewable by everyone', 'public', 'model_tags');
SELECT drop_policy_if_exists('Model authors can manage tags', 'public', 'model_tags');

-- Animation Tags (public schema)
SELECT drop_policy_if_exists('Animation tags are viewable by everyone', 'public', 'animation_tags');
SELECT drop_policy_if_exists('Animation authors can manage tags', 'public', 'animation_tags');

-- Interactions (public schema)
SELECT drop_policy_if_exists('Interactions are viewable by everyone', 'public', 'interactions');
SELECT drop_policy_if_exists('Users can insert own interactions', 'public', 'interactions');
SELECT drop_policy_if_exists('Users can delete own interactions', 'public', 'interactions');

-- Subscriptions (public schema)
SELECT drop_policy_if_exists('Subscriptions are viewable by everyone', 'public', 'subscriptions');
SELECT drop_policy_if_exists('Users can manage own subscriptions', 'public', 'subscriptions');

-- Comments (public schema)
SELECT drop_policy_if_exists('Active comments are viewable by everyone', 'public', 'comments');
SELECT drop_policy_if_exists('Authenticated users can insert comments', 'public', 'comments');
SELECT drop_policy_if_exists('Authors can update own comments', 'public', 'comments');
SELECT drop_policy_if_exists('Authors can delete own comments', 'public', 'comments');

-- Notifications (public schema)
SELECT drop_policy_if_exists('Users can view own notifications', 'public', 'notifications');
SELECT drop_policy_if_exists('System can insert notifications', 'public', 'notifications');
SELECT drop_policy_if_exists('Users can update own notifications', 'public', 'notifications');
SELECT drop_policy_if_exists('Users can delete own notifications', 'public', 'notifications');

-- ⚠️ Storage Objects пропускаем - удаляем через Dashboard вручную!
-- SELECT drop_policy_if_exists(..., 'storage', 'objects'); -- НЕ ВЫПОЛНЯТЬ

-- Удаляем вспомогательную функцию
DROP FUNCTION IF EXISTS drop_policy_if_exists(TEXT, TEXT, TEXT);

-- ============================================
-- ВКЛЮЧАЕМ RLS ДЛЯ ВСЕХ ТАБЛИЦ
-- ============================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; -- Уже включено по умолчанию

-- ============================================
-- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: проверка роли
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  RETURN CASE 
    WHEN required_role = 'admin' THEN user_role = 'admin'
    WHEN required_role = 'moderator' THEN user_role IN ('moderator', 'admin')
    WHEN required_role = 'user' THEN user_role IN ('user', 'moderator', 'admin')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER_PROFILES POLICIES
-- ============================================

CREATE POLICY "Profiles are viewable by everyone" 
ON public.user_profiles FOR SELECT 
USING (status = 'active' OR auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = id OR public.has_role('admin'));

CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles FOR DELETE 
USING (public.has_role('admin'));

-- ============================================
-- MODELS POLICIES
-- ============================================

CREATE POLICY "Published models are viewable by everyone" 
ON public.models FOR SELECT 
USING (
  status = 'approved' 
  OR author_id = auth.uid() 
  OR public.has_role('moderator')
);

CREATE POLICY "Authenticated users can insert models" 
ON public.models FOR INSERT 
WITH CHECK (auth.uid() = author_id AND auth.role() = 'authenticated');

CREATE POLICY "Authors can update own models" 
ON public.models FOR UPDATE 
USING (
  author_id = auth.uid() 
  OR public.has_role('moderator')
);

CREATE POLICY "Authors can delete own models" 
ON public.models FOR DELETE 
USING (
  author_id = auth.uid() 
  OR public.has_role('admin')
);

-- ============================================
-- ANIMATIONS POLICIES
-- ============================================

CREATE POLICY "Published animations are viewable by everyone" 
ON public.animations FOR SELECT 
USING (
  status = 'approved' 
  OR author_id = auth.uid() 
  OR public.has_role('moderator')
);

CREATE POLICY "Authenticated users can insert animations" 
ON public.animations FOR INSERT 
WITH CHECK (auth.uid() = author_id AND auth.role() = 'authenticated');

CREATE POLICY "Authors can update own animations" 
ON public.animations FOR UPDATE 
USING (
  author_id = auth.uid() 
  OR public.has_role('moderator')
);

CREATE POLICY "Authors can delete own animations" 
ON public.animations FOR DELETE 
USING (
  author_id = auth.uid() 
  OR public.has_role('admin')
);

-- ============================================
-- GENERATION_REQUESTS POLICIES
-- ============================================

CREATE POLICY "Users can view own generation requests" 
ON public.generation_requests FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.has_role('admin')
);

CREATE POLICY "Authenticated users can insert own generation requests" 
ON public.generation_requests FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own generation requests" 
ON public.generation_requests FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete generation requests" 
ON public.generation_requests FOR DELETE 
USING (public.has_role('admin'));

-- ============================================
-- TAGS POLICIES
-- ============================================

CREATE POLICY "Tags are viewable by everyone" 
ON public.tags FOR SELECT 
USING (TRUE);

CREATE POLICY "Admins can manage tags" 
ON public.tags FOR ALL 
USING (public.has_role('admin'));

-- ============================================
-- MODEL_TAGS POLICIES
-- ============================================

CREATE POLICY "Model tags are viewable by everyone" 
ON public.model_tags FOR SELECT 
USING (TRUE);

CREATE POLICY "Model authors can manage tags" 
ON public.model_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.models 
    WHERE id = model_tags.model_id 
    AND (author_id = auth.uid() OR public.has_role('admin'))
  )
);

-- ============================================
-- ANIMATION_TAGS POLICIES
-- ============================================

CREATE POLICY "Animation tags are viewable by everyone" 
ON public.animation_tags FOR SELECT 
USING (TRUE);

CREATE POLICY "Animation authors can manage tags" 
ON public.animation_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.animations 
    WHERE id = animation_tags.animation_id 
    AND (author_id = auth.uid() OR public.has_role('admin'))
  )
);

-- ============================================
-- INTERACTIONS POLICIES
-- ============================================

CREATE POLICY "Interactions are viewable by everyone" 
ON public.interactions FOR SELECT 
USING (TRUE);

CREATE POLICY "Users can insert own interactions" 
ON public.interactions FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete own interactions" 
ON public.interactions FOR DELETE 
USING (
  user_id = auth.uid() 
  OR public.has_role('admin')
);

-- ============================================
-- SUBSCRIPTIONS POLICIES
-- ============================================

CREATE POLICY "Subscriptions are viewable by everyone" 
ON public.subscriptions FOR SELECT 
USING (TRUE);

CREATE POLICY "Users can manage own subscriptions" 
ON public.subscriptions FOR ALL 
USING (
  subscriber_id = auth.uid() 
  AND subscriber_id != author_id
);

-- ============================================
-- COMMENTS POLICIES
-- ============================================

CREATE POLICY "Active comments are viewable by everyone" 
ON public.comments FOR SELECT 
USING (
  status = 'active' 
  OR author_id = auth.uid() 
  OR public.has_role('moderator')
);

CREATE POLICY "Authenticated users can insert comments" 
ON public.comments FOR INSERT 
WITH CHECK (
  author_id = auth.uid() 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authors can update own comments" 
ON public.comments FOR UPDATE 
USING (
  author_id = auth.uid() 
  OR public.has_role('moderator')
);

CREATE POLICY "Authors can delete own comments" 
ON public.comments FOR DELETE 
USING (
  author_id = auth.uid() 
  OR public.has_role('moderator')
);

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (recipient_id = auth.uid());

CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (recipient_id = auth.uid());

CREATE POLICY "Users can delete own notifications" 
ON public.notifications FOR DELETE 
USING (
  recipient_id = auth.uid() 
  OR public.has_role('admin')
);

-- ============================================
-- STORAGE BUCKETS RLS POLICIES
-- ============================================
-- ⚠️ ВАЖНО: Storage policies создаются через Dashboard или API
-- Этот блок нужно выполнить ПОСЛЕ ручного удаления старых policies

-- generation-inputs (PRIVATE)
DO $$ BEGIN
  CREATE POLICY "Users can view own generation inputs" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'generation-inputs' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR public.has_role('admin')
    )
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload to own generation inputs folder" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'generation-inputs' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own generation inputs" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'generation-inputs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own generation inputs" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'generation-inputs' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR public.has_role('admin')
    )
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- models (PUBLIC READ)
DO $$ BEGIN
  CREATE POLICY "Public can view models" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'models');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload models" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'models' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own models" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'models' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own models" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'models' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR public.has_role('admin')
    )
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- animations (PUBLIC READ)
DO $$ BEGIN
  CREATE POLICY "Public can view animations" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'animations');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload animations" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'animations' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own animations" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'animations' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own animations" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'animations' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR public.has_role('admin')
    )
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- previews (PUBLIC READ)
DO $$ BEGIN
  CREATE POLICY "Public can view previews" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'previews');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload previews" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'previews' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own previews" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'previews' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own previews" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'previews' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR public.has_role('admin')
    )
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- avatars (PUBLIC READ)
DO $$ BEGIN
  CREATE POLICY "Public can view avatars" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own avatar" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own avatar" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'avatars' 
    AND (
      auth.uid()::text = (storage.foldername(name))[1] 
      OR public.has_role('admin')
    )
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================
-- ИНДЕКСЫ
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_models_status_category ON public.models(status, category);
CREATE INDEX IF NOT EXISTS idx_models_author_status ON public.models(author_id, status);
CREATE INDEX IF NOT EXISTS idx_animations_status ON public.animations(status);
CREATE INDEX IF NOT EXISTS idx_animations_author_status ON public.animations(author_id, status);
CREATE INDEX IF NOT EXISTS idx_generation_requests_user_status ON public.generation_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_interactions_entity ON public.interactions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity_status ON public.comments(entity_type, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON public.notifications(recipient_id, is_read);

-- Индексы для storage (если есть права)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket ON storage.objects(bucket_id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_storage_objects_owner ON storage.objects(owner);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_storage_objects_name ON storage.objects(name);
EXCEPTION WHEN OTHERS THEN NULL; END $$;