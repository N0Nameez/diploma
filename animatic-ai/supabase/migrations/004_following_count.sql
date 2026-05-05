-- 1. Добавление колонки following_count в user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 2. Обновление функции update_followers_count для поддержки following_count
CREATE OR REPLACE FUNCTION public.update_subscriptions_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Увеличиваем followers_count у автора
    UPDATE public.user_profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.author_id;
    
    -- Увеличиваем following_count у подписчика
    UPDATE public.user_profiles
    SET following_count = following_count + 1
    WHERE id = NEW.subscriber_id;
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- Уменьшаем followers_count у автора
    UPDATE public.user_profiles
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.author_id;
    
    -- Уменьшаем following_count у подписчика
    UPDATE public.user_profiles
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.subscriber_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Переподключение триггеров
DROP TRIGGER IF EXISTS trigger_update_followers_on_insert ON public.subscriptions;
DROP TRIGGER IF EXISTS trigger_update_followers_on_delete ON public.subscriptions;

CREATE TRIGGER trigger_update_subscriptions_on_insert
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_counts();

CREATE TRIGGER trigger_update_subscriptions_on_delete
  AFTER DELETE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_counts();

-- 4. Обновление функции инициализации
CREATE OR REPLACE FUNCTION public.initialize_counters_v2()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Существующая логика инициализации + following_count
  FOR v_user IN SELECT id FROM public.user_profiles LOOP
    UPDATE public.user_profiles
    SET
      models_count = (SELECT COUNT(*) FROM public.models WHERE author_id = v_user.id),
      animations_count = (SELECT COUNT(*) FROM public.animations WHERE author_id = v_user.id),
      followers_count = (SELECT COUNT(*) FROM public.subscriptions WHERE author_id = v_user.id),
      following_count = (SELECT COUNT(*) FROM public.subscriptions WHERE subscriber_id = v_user.id)
    WHERE id = v_user.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
