-- ============================================
-- MIGRATION 004: RPC для создания моделей (обход кэша PostgREST)
-- ============================================
-- Используется когда PostgREST не видит колонку author_id
-- Вызов: SELECT create_model_record('author_id', 'name', 'desc', ...)

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

-- Разрешаем вызов только аутентифицированным пользователям
-- (через service_role обходит RLS)
REVOKE ALL ON FUNCTION public.create_model_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
-- Через SECURITY DEFINER функция выполняется с правами создателя (superuser)
-- Service key может вызывать напрямую
