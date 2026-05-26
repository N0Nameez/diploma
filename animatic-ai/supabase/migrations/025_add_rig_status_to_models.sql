-- ============================================
-- MIGRATION 025: Добавление rig_status в таблицу models
-- ============================================

ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS rig_status VARCHAR(50) DEFAULT 'none';

COMMENT ON COLUMN public.models.rig_status IS 'Статус риггинга модели: none (нет рига), rigged (есть скелет)';
