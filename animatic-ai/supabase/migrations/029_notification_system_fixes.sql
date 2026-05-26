-- Исправления для системы уведомлений

-- 1. Инициализируем настройки уведомлений для всех существующих пользователей
-- Добавляем недостающие ключи в существующие настройки или устанавливаем дефолтные
UPDATE public.user_profiles
SET notification_settings = '{
    "email": true, 
    "comments": true, 
    "replies": true,
    "likes": true, 
    "favorites": true, 
    "followers": true, 
    "generation_started": true, 
    "generation_finished": true,
    "subscription": true
  }'::JSONB
WHERE notification_settings IS NULL;

-- Для тех у кого есть настройки, но старого формата - объединяем с новыми дефолтами
UPDATE public.user_profiles
SET notification_settings = '{
    "email": true, 
    "comments": true, 
    "replies": true,
    "likes": true, 
    "favorites": true, 
    "followers": true, 
    "generation_started": true, 
    "generation_finished": true,
    "subscription": true
  }'::JSONB || notification_settings
WHERE notification_settings IS NOT NULL;

-- 2. Делаем функцию создания уведомлений более надежной
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT
) RETURNS VOID AS $$
DECLARE
  v_settings JSONB;
  v_setting_key TEXT;
BEGIN
  -- Получаем настройки пользователя
  SELECT notification_settings INTO v_settings FROM public.user_profiles WHERE id = p_recipient_id;
  
  -- Маппинг типа уведомления на ключ в настройках
  v_setting_key := CASE 
    WHEN p_type = 'comment' THEN 'comments'
    WHEN p_type = 'reply' THEN 'replies'
    WHEN p_type = 'like' THEN 'likes'
    WHEN p_type = 'favorite' THEN 'favorites'
    WHEN p_type = 'follower' THEN 'followers'
    WHEN p_type = 'generation_started' THEN 'generation_started'
    WHEN p_type IN ('generation_complete', 'generation_error') THEN 'generation_finished'
    WHEN p_type = 'subscription_expiring' THEN 'subscription'
    ELSE NULL
  END;

  -- Если настроек вообще нет или ключ не найден или он true - уведомляем
  -- Используем COALESCE чтобы по дефолту было TRUE если ключа нет
  IF v_setting_key IS NULL OR COALESCE((v_settings->>v_setting_key)::BOOLEAN, TRUE) THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, link_url)
    VALUES (p_recipient_id, p_type, p_title, p_message, p_link_url);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Упрощаем триггер на генерации, чтобы он был более надежным
CREATE OR REPLACE FUNCTION public.handle_generation_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_type_label TEXT;
BEGIN
  v_type_label := CASE WHEN NEW.type = 'animation_video' THEN 'анимации' ELSE '3D модели' END;

  -- Начало генерации (переход в processing из любого состояния кроме processing)
  IF (NEW.status = 'processing' AND (OLD IS NULL OR OLD.status != 'processing')) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'generation_started',
      'Генерация началась',
      'Ваш запрос на создание ' || v_type_label || ' принят в работу',
      '/generation'
    );
  
  -- Завершение генерации
  ELSIF (NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed')) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'generation_complete',
      'Генерация завершена!',
      'Ваша ' || v_type_label || ' готова',
      CASE 
        WHEN NEW.result_model_id IS NOT NULL THEN '/models/' || NEW.result_model_id
        WHEN NEW.result_animation_id IS NOT NULL THEN '/animations/' || NEW.result_animation_id
        ELSE '/profile'
      END
    );
    
  -- Ошибка генерации
  ELSIF (NEW.status = 'failed' AND (OLD IS NULL OR OLD.status != 'failed')) THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'generation_error',
      'Ошибка генерации',
      'К сожалению, при создании ' || v_type_label || ' произошла ошибка: ' || COALESCE(NEW.error_message, 'неизвестная ошибка'),
      '/generation'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пересоздаем триггер чтобы убедиться что он срабатывает корректно
DROP TRIGGER IF EXISTS on_generation_notification ON public.generation_requests;
CREATE TRIGGER on_generation_notification
  AFTER INSERT OR UPDATE ON public.generation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_generation_notification();
