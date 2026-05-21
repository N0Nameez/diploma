-- ============================================
-- ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'deleted')),
  credits INTEGER DEFAULT 15,
  credits_reset_date TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  models_count INTEGER DEFAULT 0,
  animations_count INTEGER DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  total_rating INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  notification_settings JSONB DEFAULT '{"email": true, "comments": true, "likes": true, "generation": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- ============================================
-- 3D МОДЕЛИ
-- ============================================
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('Персонаж', 'Аватар', 'NPC', 'Прочее', 'Персонажи', 'Архитектура', 'Природа', 'Транспорт', 'Оружие', 'Животные', 'Интерьер')),
  format TEXT CHECK (format IN ('GLB', 'FBX', 'OBJ')),
  file_url TEXT,
  preview_url TEXT,
  license TEXT DEFAULT 'view_only' CHECK (license IN ('view_only', 'free_use')),
  source TEXT DEFAULT 'user_upload' CHECK (source IN ('ai_generated', 'user_upload')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_models_author ON public.models(author_id);
CREATE INDEX idx_models_status ON public.models(status);
CREATE INDEX idx_models_category ON public.models(category);
CREATE INDEX idx_models_created ON public.models(created_at DESC);
CREATE INDEX idx_models_rating ON public.models(rating DESC);

-- ============================================
-- АНИМАЦИИ
-- ============================================
CREATE TABLE public.animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  preview_url TEXT,
  source_video_url TEXT,
  license TEXT DEFAULT 'view_only' CHECK (license IN ('view_only', 'free_use')),
  source TEXT DEFAULT 'user_upload' CHECK (source IN ('ai_generated', 'user_upload', 'system')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_animations_author ON public.animations(author_id);
CREATE INDEX idx_animations_model ON public.animations(model_id);
CREATE INDEX idx_animations_status ON public.animations(status);

-- ============================================
-- ЗАПРОСЫ НА ГЕНЕРАЦИЮ
-- ============================================
CREATE TABLE public.generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('model_photo', 'model_text', 'animation_video')),
  input_file_url TEXT,
  prompt TEXT,
  style_preset TEXT,
  quality_level TEXT DEFAULT 'high' CHECK (quality_level IN ('draft', 'high', 'ultra')),
  poly_count TEXT DEFAULT '50k',
  enable_pbr BOOLEAN DEFAULT TRUE,
  enable_rig BOOLEAN DEFAULT TRUE,
  auto_publish BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  result_model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  result_animation_id UUID REFERENCES public.animations(id) ON DELETE SET NULL,
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  credits_cost INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_generation_requests_user ON public.generation_requests(user_id);
CREATE INDEX idx_generation_requests_status ON public.generation_requests(status);
CREATE INDEX idx_generation_requests_created ON public.generation_requests(created_at DESC);

-- ============================================
-- ТЕГИ
-- ============================================
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  tag_type VARCHAR(50) DEFAULT 'type',
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.model_tags (
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (model_id, tag_id)
);

CREATE TABLE public.animation_tags (
  animation_id UUID REFERENCES public.animations(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (animation_id, tag_id)
);

-- Индексы
CREATE INDEX idx_tags_name ON public.tags(name);

-- ============================================
-- СОЦИАЛЬНЫЕ ВЗАИМОДЕЙСТВИЯ
-- ============================================
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('model', 'animation')),
  entity_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'favorite', 'download', 'report')),
  report_reason TEXT CHECK (report_reason IN ('copyright', 'inappropriate', 'spam', 'other')),
  report_status TEXT CHECK (report_status IN ('new', 'reviewing', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id, interaction_type)
);

-- Индексы
CREATE INDEX idx_interactions_user ON public.interactions(user_id);
CREATE INDEX idx_interactions_entity ON public.interactions(entity_type, entity_id);

-- ============================================
-- ПОДПИСКИ
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, author_id),
  CHECK (subscriber_id != author_id)
);

-- Индексы
CREATE INDEX idx_subscriptions_subscriber ON public.subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_author ON public.subscriptions(author_id);

-- ============================================
-- КОММЕНТАРИИ
-- ============================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('model', 'animation')),
  entity_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'hidden')),
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX idx_comments_author ON public.comments(author_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);

-- ============================================
-- УВЕДОМЛЕНИЯ
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'like', 'follower', 'approved', 'rejected', 'generation_complete', 'generation_error')),
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_read ON public.notifications(recipient_id, is_read);

-- ============================================
-- RLS ПОЛИТИКИ (Row Level Security)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- user_profiles: чтение всем, запись только себе
CREATE POLICY "Profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- models: чтение опубликованных всем, запись только автору
CREATE POLICY "Published models are viewable by everyone" ON public.models
  FOR SELECT USING (status = 'approved' OR author_id = auth.uid());

CREATE POLICY "Users can insert own models" ON public.models
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own models" ON public.models
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own models" ON public.models
  FOR DELETE USING (auth.uid() = author_id);

-- animations: аналогично моделям
CREATE POLICY "Published animations are viewable by everyone" ON public.animations
  FOR SELECT USING (status = 'approved' OR author_id = auth.uid());

CREATE POLICY "Users can insert own animations" ON public.animations
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own animations" ON public.animations
  FOR UPDATE USING (auth.uid() = author_id);

-- generation_requests: только свой пользователь
CREATE POLICY "Users can view own generation requests" ON public.generation_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation requests" ON public.generation_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generation requests" ON public.generation_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- interactions: чтение всем, запись только себе
CREATE POLICY "Interactions are viewable by everyone" ON public.interactions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own interactions" ON public.interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions" ON public.interactions
  FOR DELETE USING (auth.uid() = user_id);

-- subscriptions: чтение всем, запись только себе
CREATE POLICY "Subscriptions are viewable by everyone" ON public.subscriptions
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
  FOR ALL USING (auth.uid() = subscriber_id);

-- comments: чтение опубликованных, запись только себе
CREATE POLICY "Active comments are viewable by everyone" ON public.comments
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = author_id);

-- notifications: только свой пользователь
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ============================================
-- ТРИГГЕРЫ для авто-обновления updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animations_updated_at BEFORE UPDATE ON public.animations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ФУНКЦИЯ: создание профиля при регистрации
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', CONCAT('user_', LEFT(NEW.id::text, 8))),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Аноним')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ФУНКЦИЯ: лайк модели (с обновлением счётчика)
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_model_like(model_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_liked BOOLEAN;
  existing_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.interactions
    WHERE user_id = auth.uid()
    AND entity_type = 'model'
    AND entity_id = model_uuid
    AND interaction_type = 'like'
  ) INTO is_liked;

  IF is_liked THEN
    DELETE FROM public.interactions
    WHERE user_id = auth.uid()
    AND entity_type = 'model'
    AND entity_id = model_uuid
    AND interaction_type = 'like';
    
    UPDATE public.models SET likes = GREATEST(likes - 1, 0) WHERE id = model_uuid;
    RETURN FALSE;
  ELSE
    INSERT INTO public.interactions (user_id, entity_type, entity_id, interaction_type)
    VALUES (auth.uid(), 'model', model_uuid, 'like');
    
    UPDATE public.models SET likes = likes + 1 WHERE id = model_uuid;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ФУНКЦИЯ: скачивание модели (с обновлением счётчика)
-- ============================================
CREATE OR REPLACE FUNCTION public.record_model_download(model_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.interactions (user_id, entity_type, entity_id, interaction_type)
  VALUES (auth.uid(), 'model', model_uuid, 'download')
  ON CONFLICT DO NOTHING;
  
  UPDATE public.models SET downloads = downloads + 1 WHERE id = model_uuid;
  UPDATE public.user_profiles SET total_downloads = total_downloads + 1
  WHERE id = (SELECT author_id FROM public.models WHERE id = model_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;