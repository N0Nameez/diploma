-- ============================================
-- MIGRATION 003: Автоматические счётчики и триггеры
-- ============================================
-- Назначение:
-- 1. Триггеры на interactions для авто-обновления likes/favorites в models и animations
-- 2. Триггеры на subscriptions для авто-обновления followers_count в user_profiles
-- 3. Триггеры на comments для авто-обновления счётчиков комментариев
-- 4. Триггеры на models/animations для авто-обновления счётчиков в user_profiles
-- ============================================

-- ============================================
-- ФУНКЦИЯ: Обновление счётчика лайков/избранного в models
-- ============================================
CREATE OR REPLACE FUNCTION public.update_model_interaction_count()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id UUID;
  v_interaction_type TEXT;
  v_op TEXT; -- 'increment' или 'decrement'
BEGIN
  -- Определяем, какая операция произошла
  IF (TG_OP = 'INSERT') THEN
    v_entity_id := NEW.entity_id;
    v_interaction_type := NEW.interaction_type;
    v_op := 'increment';
  ELSIF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.entity_id;
    v_interaction_type := OLD.interaction_type;
    v_op := 'decrement';
  ELSE
    RETURN NULL;
  END IF;

  -- Обновляем счётчик только для model
  IF (v_interaction_type = 'like') THEN
    UPDATE public.models
    SET likes = CASE
      WHEN v_op = 'increment' THEN likes + 1
      ELSE GREATEST(likes - 1, 0)
    END
    WHERE id = v_entity_id;
  ELSIF (v_interaction_type = 'favorite') THEN
    UPDATE public.models
    SET favorites = CASE
      WHEN v_op = 'increment' THEN favorites + 1
      ELSE GREATEST(favorites - 1, 0)
    END
    WHERE id = v_entity_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ФУНКЦИЯ: Обновление счётчика лайков/избранного в animations
-- ============================================
CREATE OR REPLACE FUNCTION public.update_animation_interaction_count()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id UUID;
  v_interaction_type TEXT;
  v_op TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_entity_id := NEW.entity_id;
    v_interaction_type := NEW.interaction_type;
    v_op := 'increment';
  ELSIF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.entity_id;
    v_interaction_type := OLD.interaction_type;
    v_op := 'decrement';
  ELSE
    RETURN NULL;
  END IF;

  IF (v_interaction_type = 'like') THEN
    UPDATE public.animations
    SET likes = CASE
      WHEN v_op = 'increment' THEN likes + 1
      ELSE GREATEST(likes - 1, 0)
    END
    WHERE id = v_entity_id;
  ELSIF (v_interaction_type = 'favorite') THEN
    UPDATE public.animations
    SET favorites = CASE
      WHEN v_op = 'increment' THEN favorites + 1
      ELSE GREATEST(favorites - 1, 0)
    END
    WHERE id = v_entity_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ФУНКЦИЯ: Обновление followers_count в user_profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.update_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.user_profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.author_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.user_profiles
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.author_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ФУНКЦИЯ: Обновление models_count/animations_count в user_profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.update_author_entity_count()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_entity_type TEXT; -- 'model' или 'animation'
  v_op TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_author_id := NEW.author_id;
    v_entity_type := TG_TABLE_NAME;
    v_op := 'increment';
  ELSIF (TG_OP = 'DELETE') THEN
    v_author_id := OLD.author_id;
    v_entity_type := TG_TABLE_NAME;
    v_op := 'decrement';
  ELSE
    RETURN NULL;
  END IF;

  -- Пропускаем если author_id NULL (удалённый пользователь)
  IF (v_author_id IS NULL) THEN
    RETURN NULL;
  END IF;

  IF (v_entity_type = 'models') THEN
    UPDATE public.user_profiles
    SET models_count = CASE
      WHEN v_op = 'increment' THEN models_count + 1
      ELSE GREATEST(models_count - 1, 0)
    END
    WHERE id = v_author_id;
  ELSIF (v_entity_type = 'animations') THEN
    UPDATE public.user_profiles
    SET animations_count = CASE
      WHEN v_op = 'increment' THEN animations_count + 1
      ELSE GREATEST(animations_count - 1, 0)
    END
    WHERE id = v_author_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ФУНКЦИЯ: Пересчёт rating на основе лайков и скачиваний
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_entity_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id UUID;
  v_entity_type TEXT;
  v_likes INTEGER;
  v_downloads INTEGER;
  v_new_rating INTEGER;
BEGIN
  -- Определяем entity
  IF (TG_OP = 'INSERT') THEN
    v_entity_id := NEW.entity_id;
    v_entity_type := NEW.entity_type;
  ELSIF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.entity_id;
    v_entity_type := OLD.entity_type;
  ELSE
    RETURN NULL;
  END IF;

  -- Считаем лайки и скачивания (только они влияют на рейтинг)
  SELECT
    COUNT(*) FILTER (WHERE interaction_type = 'like')::INTEGER,
    COUNT(*) FILTER (WHERE interaction_type = 'download')::INTEGER
  INTO v_likes, v_downloads
  FROM public.interactions
  WHERE entity_id = v_entity_id
    AND entity_type = v_entity_type;

  -- Формула рейтинга: лайки * 2 + скачивания * 1
  v_new_rating := (v_likes * 2) + v_downloads;

  -- Обновляем рейтинг
  IF (v_entity_type = 'model') THEN
    UPDATE public.models
    SET rating = v_new_rating
    WHERE id = v_entity_id;
  ELSIF (v_entity_type = 'animation') THEN
    UPDATE public.animations
    SET rating = v_new_rating
    WHERE id = v_entity_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ТРИГГЕРЫ: interactions → models/ animations счётчики
-- ============================================

-- Лайки и избранное для моделей
CREATE TRIGGER trigger_update_model_count_on_insert
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  WHEN (NEW.entity_type = 'model' AND NEW.interaction_type IN ('like', 'favorite'))
  EXECUTE FUNCTION public.update_model_interaction_count();

CREATE TRIGGER trigger_update_model_count_on_delete
  AFTER DELETE ON public.interactions
  FOR EACH ROW
  WHEN (OLD.entity_type = 'model' AND OLD.interaction_type IN ('like', 'favorite'))
  EXECUTE FUNCTION public.update_model_interaction_count();

-- Лайки и избранное для анимаций
CREATE TRIGGER trigger_update_animation_count_on_insert
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  WHEN (NEW.entity_type = 'animation' AND NEW.interaction_type IN ('like', 'favorite'))
  EXECUTE FUNCTION public.update_animation_interaction_count();

CREATE TRIGGER trigger_update_animation_count_on_delete
  AFTER DELETE ON public.interactions
  FOR EACH ROW
  WHEN (OLD.entity_type = 'animation' AND OLD.interaction_type IN ('like', 'favorite'))
  EXECUTE FUNCTION public.update_animation_interaction_count();

-- Пересчёт рейтинга при изменении взаимодействий
CREATE TRIGGER trigger_recalculate_model_rating_on_insert
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  WHEN (NEW.entity_type = 'model' AND NEW.interaction_type IN ('like', 'download'))
  EXECUTE FUNCTION public.recalculate_entity_rating();

CREATE TRIGGER trigger_recalculate_model_rating_on_delete
  AFTER DELETE ON public.interactions
  FOR EACH ROW
  WHEN (OLD.entity_type = 'model' AND OLD.interaction_type IN ('like', 'download'))
  EXECUTE FUNCTION public.recalculate_entity_rating();

CREATE TRIGGER trigger_recalculate_animation_rating_on_insert
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  WHEN (NEW.entity_type = 'animation' AND NEW.interaction_type IN ('like', 'download'))
  EXECUTE FUNCTION public.recalculate_entity_rating();

CREATE TRIGGER trigger_recalculate_animation_rating_on_delete
  AFTER DELETE ON public.interactions
  FOR EACH ROW
  WHEN (OLD.entity_type = 'animation' AND OLD.interaction_type IN ('like', 'download'))
  EXECUTE FUNCTION public.recalculate_entity_rating();

-- ============================================
-- ТРИГГЕРЫ: subscriptions → followers_count
-- ============================================
CREATE TRIGGER trigger_update_followers_on_insert
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_followers_count();

CREATE TRIGGER trigger_update_followers_on_delete
  AFTER DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_followers_count();

-- ============================================
-- ТРИГГЕРЫ: models/animations → author counts
-- ============================================
CREATE TRIGGER trigger_update_author_model_count_on_insert
  AFTER INSERT ON public.models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_entity_count();

CREATE TRIGGER trigger_update_author_model_count_on_delete
  AFTER DELETE ON public.models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_entity_count();

CREATE TRIGGER trigger_update_author_animation_count_on_insert
  AFTER INSERT ON public.animations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_entity_count();

CREATE TRIGGER trigger_update_author_animation_count_on_delete
  AFTER DELETE ON public.animations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_author_entity_count();

-- ============================================
-- ФУНКЦИЯ: Инициализация счётчиков (для существующих данных)
-- ============================================
-- Запускать вручную после применения миграции:
-- SELECT public.initialize_counters();

CREATE OR REPLACE FUNCTION public.initialize_counters()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_model RECORD;
  v_animation RECORD;
BEGIN
  -- Сбрасываем все счётчики
  UPDATE public.user_profiles
  SET models_count = 0, animations_count = 0, followers_count = 0;

  UPDATE public.models SET likes = 0, favorites = 0, downloads = 0, rating = 0;
  UPDATE public.animations SET likes = 0, favorites = 0, downloads = 0, rating = 0;

  -- Подсчитываем models_count для каждого пользователя
  FOR v_user IN SELECT id FROM public.user_profiles LOOP
    SELECT COUNT(*) INTO v_user.models_count
    FROM public.models WHERE author_id = v_user.id;

    SELECT COUNT(*) INTO v_user.animations_count
    FROM public.animations WHERE author_id = v_user.id;

    SELECT COUNT(*) INTO v_user.followers_count
    FROM public.subscriptions WHERE author_id = v_user.id;

    UPDATE public.user_profiles
    SET
      models_count = v_user.models_count,
      animations_count = v_user.animations_count,
      followers_count = v_user.followers_count
    WHERE id = v_user.id;
  END LOOP;

  -- Подсчитываем лайки/избранное/скачивания для моделей
  FOR v_model IN SELECT id FROM public.models LOOP
    SELECT COUNT(*) INTO v_model.likes
    FROM public.interactions
    WHERE entity_id = v_model.id AND entity_type = 'model' AND interaction_type = 'like';

    SELECT COUNT(*) INTO v_model.favorites
    FROM public.interactions
    WHERE entity_id = v_model.id AND entity_type = 'model' AND interaction_type = 'favorite';

    SELECT COUNT(*) INTO v_model.downloads
    FROM public.interactions
    WHERE entity_id = v_model.id AND entity_type = 'model' AND interaction_type = 'download';

    UPDATE public.models
    SET
      likes = v_model.likes,
      favorites = v_model.favorites,
      downloads = v_model.downloads,
      rating = (v_model.likes * 2) + v_model.downloads
    WHERE id = v_model.id;
  END LOOP;

  -- Подсчитываем лайки/избранное/скачивания для анимаций
  FOR v_animation IN SELECT id FROM public.animations LOOP
    SELECT COUNT(*) INTO v_animation.likes
    FROM public.interactions
    WHERE entity_id = v_animation.id AND entity_type = 'animation' AND interaction_type = 'like';

    SELECT COUNT(*) INTO v_animation.favorites
    FROM public.interactions
    WHERE entity_id = v_animation.id AND entity_type = 'animation' AND interaction_type = 'favorite';

    SELECT COUNT(*) INTO v_animation.downloads
    FROM public.interactions
    WHERE entity_id = v_animation.id AND entity_type = 'animation' AND interaction_type = 'download';

    UPDATE public.animations
    SET
      likes = v_animation.likes,
      favorites = v_animation.favorites,
      downloads = v_animation.downloads,
      rating = (v_animation.likes * 2) + v_animation.downloads
    WHERE id = v_animation.id;
  END LOOP;

  RAISE NOTICE 'Счётчики успешно инициализированы';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- КОММЕНТАРИИ К ФУНКЦИЯМ
-- ============================================
COMMENT ON FUNCTION public.update_model_interaction_count() IS 'Автоматически обновляет likes/favorites в models при INSERT/DELETE из interactions';
COMMENT ON FUNCTION public.update_animation_interaction_count() IS 'Автоматически обновляет likes/favorites в animations при INSERT/DELETE из interactions';
COMMENT ON FUNCTION public.update_followers_count() IS 'Автоматически обновляет followers_count в user_profiles при подписке/отписке';
COMMENT ON FUNCTION public.update_author_entity_count() IS 'Автоматически обновляет models_count/animations_count в user_profiles при создании/удалении контента';
COMMENT ON FUNCTION public.recalculate_entity_rating() IS 'Пересчитывает рейтинг по формуле: (likes * 2) + downloads';
COMMENT ON FUNCTION public.initialize_counters() IS 'Инициализирует все счётчики на основе существующих данных. Запускать вручную после миграции.';
