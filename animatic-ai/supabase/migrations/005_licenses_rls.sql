-- ============================================
-- MIGRATION 005: Лицензии (private) + RLS
-- ============================================
-- Добавляет 'private' в допустимые значения license
-- Обновляет RLS политики чтобы private модели видел только автор

-- 1. Добавляем 'private' в CHECK constraint для license
ALTER TABLE public.models DROP CONSTRAINT IF EXISTS models_license_check;
ALTER TABLE public.models ADD CONSTRAINT models_license_check
  CHECK (license IN ('view_only', 'free_use', 'private'));

ALTER TABLE public.animations DROP CONSTRAINT IF EXISTS animations_license_check;
ALTER TABLE public.animations ADD CONSTRAINT animations_license_check
  CHECK (license IN ('view_only', 'free_use', 'private'));

-- 2. Обновляем RLS политику для models — private модели видит только автор
DROP POLICY IF EXISTS "Published models are viewable by everyone" ON public.models;

CREATE POLICY "Models viewable based on license" ON public.models
  FOR SELECT
  USING (
    -- Public models (view_only, free_use) — видят все
    status = 'approved' AND license != 'private'
    -- Private models — только автор
    OR (author_id = auth.uid())
    -- Moderators see everything
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- 3. Функция для обновления лицензии модели
CREATE OR REPLACE FUNCTION public.update_model_license(
  p_model_id UUID,
  p_license TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
BEGIN
  -- Проверка: только автор может менять лицензию
  SELECT author_id INTO v_author_id
  FROM public.models
  WHERE id = p_model_id;

  IF v_author_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_author_id != auth.uid() THEN
    RETURN FALSE;
  END IF;

  IF p_license NOT IN ('view_only', 'free_use', 'private') THEN
    RETURN FALSE;
  END IF;

  UPDATE public.models
  SET license = p_license
  WHERE id = p_model_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_model_license(UUID, TEXT) IS 'Обновляет лицензию модели. Только автор может менять.';
