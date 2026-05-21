-- ============================================
-- MIGRATION 021: Добавление source_image_url в generation_requests
-- ============================================

-- Добавляем колонку source_image_url в таблицу запросов на генерацию
-- Она используется для отображения превью исходного изображения в списке генераций пользователя

ALTER TABLE public.generation_requests 
ADD COLUMN IF NOT EXISTS source_image_url TEXT;

COMMENT ON COLUMN public.generation_requests.source_image_url IS 'URL исходного изображения (референса), использованного для генерации';
