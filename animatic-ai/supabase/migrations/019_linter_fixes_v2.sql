-- ============================================
-- MIGRATION 019: Вторая итерация фиксов линтера
-- ============================================

-- 1. ИСПРАВЛЕНИЕ ОПЕЧАТКИ В GRAPHQL (exposed: false)
-- В предыдущей миграции было "expose", правильно "exposed".

COMMENT ON TABLE public.animation_tags IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.animations IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.comments IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.contact_requests IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.file_formats IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.generation_logs IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.generation_requests IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.interactions IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.model_tags IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.models IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.notifications IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.payments IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.subscription_plans IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.subscriptions IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.tags IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.user_profiles IS '@graphql({"exposed": false})';
COMMENT ON TABLE public.user_warnings IS '@graphql({"exposed": false})';

-- 2. ФИКС MUTABLE SEARCH_PATH ДЛЯ SECURITY DEFINER ФУНКЦИЙ
-- Это предотвращает атаки через подмену объектов в search_path.

ALTER FUNCTION public.create_model_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_model_like(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.record_model_download(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_model_license(UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 3. ДОПОЛНИТЕЛЬНОЕ ОГРАНИЧЕНИЕ ПРАВ ДЛЯ ANON
-- Отзываем SELECT у таблиц, которые не должны быть видны гостям (Security hardening)

REVOKE SELECT ON public.contact_requests FROM anon;
REVOKE SELECT ON public.generation_logs FROM anon;
REVOKE SELECT ON public.generation_requests FROM anon;
REVOKE SELECT ON public.payments FROM anon;
REVOKE SELECT ON public.subscriptions FROM anon;
REVOKE SELECT ON public.user_warnings FROM anon;
REVOKE SELECT ON public.notifications FROM anon;

-- Примечание: Мы НЕ отзываем SELECT у models, animations, tags, т.к. они нужны для публичного каталога.
-- Они будут скрыты только из GraphQL через комментарии выше.
