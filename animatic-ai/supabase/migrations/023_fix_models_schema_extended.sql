-- ============================================
-- MIGRATION 023: Расширение схемы таблицы models
-- ============================================

-- Добавляем недостающие колонки в таблицу моделей, которые требуются бэкенду
-- Эти колонки используются для аналитики, классификации по индустриям и трекинга популярности.

ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Убеждаемся, что source_image_url также есть (из миграции 008, на случай если не применилась)
ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS source_image_url TEXT;

COMMENT ON COLUMN public.models.ai_model IS 'Название нейросети, сгенерировавшей модель';
COMMENT ON COLUMN public.models.industry IS 'Целевая индустрия для модели (геймдев, кино и т.д.)';
COMMENT ON COLUMN public.models.views IS 'Количество просмотров модели';
COMMENT ON COLUMN public.models.source_image_url IS 'URL исходного изображения (референса)';
