-- Добавление новых типов уведомлений и триггеров

-- 1. Обновляем типы уведомлений (удаляем старое ограничение и добавляем новое)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'comment', 'reply', 'like', 'favorite', 'follower', 
    'approved', 'rejected', 'generation_started', 
    'generation_complete', 'generation_error', 'subscription_expiring'
  ));

-- 2. Обновляем настройки уведомлений по умолчанию в профилях
ALTER TABLE public.user_profiles 
  ALTER COLUMN notification_settings SET DEFAULT '{
    "email": true, 
    "comments": true, 
    "replies": true,
    "likes": true, 
    "favorites": true, 
    "followers": true, 
    "generation_started": true, 
    "generation_finished": true,
    "subscription": true
  }'::JSONB;

-- 3. Функция для создания уведомления с проверкой настроек пользователя
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT
) RETURNS VOID AS $$
DECLARE
  v_settings JSONB;
  v_should_notify BOOLEAN := FALSE;
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

  -- Проверяем, включено ли уведомление (если ключа нет или он true)
  IF v_setting_key IS NULL OR (v_settings->>v_setting_key)::BOOLEAN IS NOT FALSE THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, link_url)
    VALUES (p_recipient_id, p_type, p_title, p_message, p_link_url);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Триггер на лайки и избранное
CREATE OR REPLACE FUNCTION public.handle_interaction_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_entity_name TEXT;
  v_interactor_name TEXT;
BEGIN
  -- Не уведомляем самого себя
  IF NEW.entity_type = 'model' THEN
    SELECT author_id, name INTO v_author_id, v_entity_name FROM public.models WHERE id = NEW.entity_id;
  ELSE
    SELECT author_id, name INTO v_author_id, v_entity_name FROM public.animations WHERE id = NEW.entity_id;
  END IF;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, username) INTO v_interactor_name FROM public.user_profiles WHERE id = NEW.user_id;

  IF NEW.interaction_type = 'like' THEN
    PERFORM public.create_notification(
      v_author_id,
      'like',
      'Новый лайк!',
      v_interactor_name || ' оценил вашу работу "' || v_entity_name || '"',
      CASE WHEN NEW.entity_type = 'model' THEN '/models/' ELSE '/animations/' END || NEW.entity_id
    );
  ELSIF NEW.interaction_type = 'favorite' THEN
    PERFORM public.create_notification(
      v_author_id,
      'favorite',
      'Добавлено в избранное',
      v_interactor_name || ' добавил вашу работу "' || v_entity_name || '" в избранное',
      CASE WHEN NEW.entity_type = 'model' THEN '/models/' ELSE '/animations/' END || NEW.entity_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_interaction_notification
  AFTER INSERT ON public.interactions
  FOR EACH ROW
  WHEN (NEW.interaction_type IN ('like', 'favorite'))
  EXECUTE FUNCTION public.handle_interaction_notification();

-- 5. Триггер на подписки
CREATE OR REPLACE FUNCTION public.handle_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  SELECT COALESCE(display_name, username) INTO v_follower_name FROM public.user_profiles WHERE id = NEW.subscriber_id;

  PERFORM public.create_notification(
    NEW.author_id,
    'follower',
    'Новый подписчик!',
    v_follower_name || ' подписался на вас',
    '/profile/' || NEW.subscriber_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_notification
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_follow_notification();

-- 6. Триггер на комментарии и ответы
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_entity_name TEXT;
  v_author_name TEXT;
  v_parent_author_id UUID;
BEGIN
  -- Находим имя автора комментария
  SELECT COALESCE(display_name, username) INTO v_author_name FROM public.user_profiles WHERE id = NEW.author_id;

  -- Находим название сущности
  IF NEW.entity_type = 'model' THEN
    SELECT author_id, name INTO v_recipient_id, v_entity_name FROM public.models WHERE id = NEW.entity_id;
  ELSE
    SELECT author_id, name INTO v_recipient_id, v_entity_name FROM public.animations WHERE id = NEW.entity_id;
  END IF;

  -- 1. Если это ответ на комментарий
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id FROM public.comments WHERE id = NEW.parent_id;
    
    -- Уведомляем автора родительского комментария (если это не он сам ответил)
    IF v_parent_author_id IS NOT NULL AND v_parent_author_id != NEW.author_id THEN
      PERFORM public.create_notification(
        v_parent_author_id,
        'reply',
        'Новый ответ',
        v_author_name || ' ответил на ваш комментарий к работе "' || v_entity_name || '"',
        CASE WHEN NEW.entity_type = 'model' THEN '/models/' ELSE '/animations/' END || NEW.entity_id
      );
    END IF;
    
    -- Если автор сущности не является автором родительского комментария, уведомляем и его тоже
    IF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.author_id AND v_recipient_id != v_parent_author_id THEN
      PERFORM public.create_notification(
        v_recipient_id,
        'comment',
        'Новый комментарий',
        v_author_name || ' прокомментировал вашу работу "' || v_entity_name || '"',
        CASE WHEN NEW.entity_type = 'model' THEN '/models/' ELSE '/animations/' END || NEW.entity_id
      );
    END IF;
  
  -- 2. Если это просто новый комментарий
  ELSIF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.author_id THEN
    PERFORM public.create_notification(
      v_recipient_id,
      'comment',
      'Новый комментарий',
      v_author_name || ' прокомментировал вашу работу "' || v_entity_name || '"',
      CASE WHEN NEW.entity_type = 'model' THEN '/models/' ELSE '/animations/' END || NEW.entity_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_notification
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_notification();

-- 7. Триггер на статусы генерации
CREATE OR REPLACE FUNCTION public.handle_generation_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Начало генерации
  IF (TG_OP = 'UPDATE' AND OLD.status = 'queued' AND NEW.status = 'processing') OR (TG_OP = 'INSERT' AND NEW.status = 'processing') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'generation_started',
      'Генерация началась',
      'Ваш запрос на создание ' || 
        CASE WHEN NEW.type = 'animation_video' THEN 'анимации' ELSE '3D модели' END || 
        ' принят в работу',
      '/generation'
    );
  
  -- Завершение генерации
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'generation_complete',
      'Генерация завершена!',
      'Ваша ' || 
        CASE WHEN NEW.type = 'animation_video' THEN 'анимация' ELSE '3D модель' END || 
        ' готова',
      CASE 
        WHEN NEW.result_model_id IS NOT NULL THEN '/models/' || NEW.result_model_id
        WHEN NEW.result_animation_id IS NOT NULL THEN '/animations/' || NEW.result_animation_id
        ELSE '/profile'
      END
    );
    
  -- Ошибка генерации
  ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'failed' AND NEW.status = 'failed') THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'generation_error',
      'Ошибка генерации',
      'К сожалению, при создании произошла ошибка: ' || COALESCE(NEW.error_message, 'неизвестная ошибка'),
      '/generation'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_generation_notification
  AFTER INSERT OR UPDATE ON public.generation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_generation_notification();
